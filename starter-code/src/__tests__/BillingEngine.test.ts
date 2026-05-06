import { BillingEngine } from '../engines/BillingEngine';
import { RecurlyClient } from '../clients/RecurlyClient';
import { Opportunity } from '../types';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('BillingEngine', () => {
  let engine: BillingEngine;
  let mockClient: RecurlyClient;

  beforeEach(() => {
    mockClient = new RecurlyClient({
      apiKey: 'test',
      baseUrl: 'test',
      useMockData: true,
    });
    engine = new BillingEngine(mockClient);
  });

  describe('New Business', () => {
    it('should generate create_account action for new business', async () => {
      const opportunity = createNewBusinessOpportunity();
      const actions = await engine.generateActions(opportunity, null);

      const createAccountAction = actions.find(a => a.type === 'create_account');
      expect(createAccountAction).toBeDefined();
    });

    it('should generate create_subscription action for recurring items', async () => {
      const opportunity = createNewBusinessOpportunity();
      const actions = await engine.generateActions(opportunity, null);

      const subscriptionAction = actions.find(a => a.type === 'create_subscription');
      expect(subscriptionAction).toBeDefined();
    });

    it('should generate charge_one_time action for one-time fees', async () => {
      const opportunity = createNewBusinessOpportunity();
      const actions = await engine.generateActions(opportunity, null);

      const oneTimeAction = actions.find(a => a.type === 'charge_one_time');
      expect(oneTimeAction).toBeDefined();
    });
  });

  describe('Conversion Order', () => {
    it('should generate cancel_subscription action for self-service conversion', async () => {
      const opportunity = createConversionOpportunity();
      const existingState = createSelfServiceState();
      const actions = await engine.generateActions(opportunity, existingState);

      const cancelAction = actions.find(a => a.type === 'cancel_subscription');
      expect(cancelAction).toBeDefined();
    });

    it('should generate apply_credit action when refund is needed', async () => {
      const opportunity = createConversionOpportunity();
      const existingState = createSelfServiceState();
      const actions = await engine.generateActions(opportunity, existingState);

      const creditAction = actions.find(a => a.type === 'apply_credit');
      expect(creditAction).toBeDefined();
    });

    it('should NOT generate apply_credit when credit_amount_due is 0', async () => {
      const opportunity = createConversionOpportunity();
      opportunity.billing_transition = {
        credit_amount_due: 0,
        self_service_cancellation_date: '2024-10-31',
      };
      const existingState = createSelfServiceState();
      const actions = await engine.generateActions(opportunity, existingState);

      const creditAction = actions.find(a => a.type === 'apply_credit');
      expect(creditAction).toBeUndefined();
    });

    it('should switch payment method to invoice (collection_method: manual)', async () => {
      const opportunity = createConversionOpportunity();
      opportunity.billing_transition = {
        ...opportunity.billing_transition,
        new_billing_method: 'invoice',
      };
      const existingState = createSelfServiceState();
      const actions = await engine.generateActions(opportunity, existingState);

      const updateAccount = actions.find(a => a.type === 'update_account');
      expect(updateAccount?.details?.collection_method).toBe('manual');
    });
  });

  describe('Amount Conversion', () => {
    it('should convert dollar amounts to cents correctly', async () => {
      const opportunity = createNewBusinessOpportunity();
      // Override with specific decimal amount
      opportunity.amount = 1234.56;
      opportunity.line_items = [{
        id: 'li_001',
        product_name: 'Test',
        product_code: 'TEST',
        quantity: 1,
        unit_price: 1234.56,
        total_price: 1234.56,
        billing_period: 'one_time',
        description: 'Test',
      }];
      const actions = await engine.generateActions(opportunity, null);

      const chargeAction = actions.find(a => a.type === 'charge_one_time');
      expect(chargeAction?.amount_in_cents).toBe(123456);
    });
  });

  describe('Risk Assessment', () => {
    it('should flag high-value transactions (> $100,000) as high risk', async () => {
      const opportunity = createNewBusinessOpportunity();
      opportunity.amount = 150000;
      opportunity.line_items = [{
        id: 'li_001',
        product_name: 'Enterprise',
        product_code: 'ENT',
        quantity: 1,
        unit_price: 150000,
        total_price: 150000,
        billing_period: 'annually',
        description: 'Enterprise annual',
      }];
      const actions = await engine.generateActions(opportunity, null);

      expect(actions.some(a => a.risk_level === 'high')).toBe(true);
    });

    it('should flag past_due accounts for review', async () => {
      const opportunity = createConversionOpportunity();
      const pastDueState = {
        ...createSelfServiceState(),
        account: {
          ...createSelfServiceState().account,
          state: 'past_due' as const,
        },
      };
      const actions = await engine.generateActions(opportunity, pastDueState);

      expect(actions.some(a => a.risk_level === 'high' || a.requires_review === true)).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should flag line item math errors for review', async () => {
      const opportunity = createNewBusinessOpportunity();
      // Intentional math error: 50 * 300 = 15000, not 14500
      opportunity.line_items = [{
        id: 'li_001',
        product_name: 'Services',
        product_code: 'SVC',
        quantity: 50,
        unit_price: 300,
        total_price: 14500, // Wrong!
        billing_period: 'one_time',
        description: 'Professional services',
      }];
      opportunity.amount = 14500;
      const actions = await engine.generateActions(opportunity, null);

      // Should flag the discrepancy
      expect(actions.some(a => 
        a.requires_review === true && 
        a.notes?.some(n => n.toLowerCase().includes('mismatch') || n.toLowerCase().includes('math'))
      )).toBe(true);
    });

    it('should flag contradictory data (is_new_service with replaces_self_service)', async () => {
      const opportunity = createConversionOpportunity();
      // Contradiction: can't be both a new service AND replace self-service
      opportunity.line_items[0].is_new_service = true;
      opportunity.line_items[0].replaces_self_service = true;
      
      const existingState = createSelfServiceState();
      const actions = await engine.generateActions(opportunity, existingState);

      expect(actions.some(a => a.requires_review === true)).toBe(true);
    });
  });
});

// Helper functions to create test data
function createNewBusinessOpportunity(): Opportunity {
  return {
    id: 'opp_test_001',
    type: 'new_business',
    account_name: 'Test Corp',
    account_id: 'acc_test_001',
    opportunity_name: 'Test - New Business',
    close_date: '2024-10-15',
    amount: 17000,
    contract_start_date: '2024-11-01',
    contract_end_date: '2025-10-31',
    billing_frequency: 'monthly',
    payment_terms: 'net_30',
    line_items: [
      {
        id: 'li_001',
        product_name: 'Professional Plan',
        product_code: 'PRO_PLAN',
        quantity: 1,
        unit_price: 1000,
        total_price: 12000,
        billing_period: 'monthly',
        description: 'Monthly subscription',
      },
      {
        id: 'li_002',
        product_name: 'Setup Fee',
        product_code: 'SETUP',
        quantity: 1,
        unit_price: 5000,
        total_price: 5000,
        billing_period: 'one_time',
        description: 'One-time setup',
      },
    ],
    contact_info: {
      primary_contact: 'John Test',
      email: 'john@test.com',
      billing_address: {
        company: 'Test Corp',
        address_line_1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        postal_code: '12345',
        country: 'US',
      },
    },
    sales_rep: 'Sales Rep',
  };
}

function createConversionOpportunity(): Opportunity {
  return {
    id: 'opp_test_003',
    type: 'conversion_order',
    account_name: 'Convert Corp',
    account_id: 'acc_convert_001',
    recurly_account_code: 'convert_corp_ss',
    opportunity_name: 'Convert Corp - Self-Service to Direct',
    close_date: '2024-10-15',
    amount: 48000,
    conversion_date: '2024-11-01',
    contract_start_date: '2024-11-01',
    contract_end_date: '2025-10-31',
    billing_frequency: 'monthly',
    payment_terms: 'net_30',
    existing_self_service: {
      plan_code: 'basic_plan',
      monthly_amount: 99,
    },
    line_items: [
      {
        id: 'li_001',
        product_name: 'Enterprise Plan',
        product_code: 'ENT_PLAN',
        quantity: 1,
        unit_price: 4000,
        total_price: 48000,
        billing_period: 'monthly',
        description: 'Enterprise subscription',
        replaces_self_service: true,
        self_service_credit_needed: true,
      },
    ],
    contact_info: {
      primary_contact: 'Chris Convert',
      email: 'chris@convert.com',
      billing_address: {
        company: 'Convert Corp',
        address_line_1: '789 Convert Blvd',
        city: 'Convert City',
        state: 'TX',
        postal_code: '67890',
        country: 'US',
      },
    },
    sales_rep: 'Sales Rep',
    billing_transition: {
      credit_amount_due: 50,
      self_service_cancellation_date: '2024-10-31',
    },
  };
}

function createSelfServiceState() {
  return {
    account: {
      account_code: 'convert_corp_ss',
      email: 'chris@convert.com',
      first_name: 'Chris',
      last_name: 'Convert',
      company_name: 'Convert Corp',
      state: 'active' as const,
      created_at: '2023-06-01',
      updated_at: '2024-10-01',
    },
    subscriptions: [
      {
        uuid: 'sub_ss_001',
        plan_code: 'basic_plan',
        state: 'active' as const,
        unit_amount_in_cents: 9900,
        quantity: 1,
        current_period_started_at: '2024-10-01',
        current_period_ends_at: '2024-10-31',
        started_at: '2023-06-01',
        collection_method: 'automatic' as const,
        net_terms: 0,
      },
    ],
    invoices: [],
    transactions: [],
  };
}
