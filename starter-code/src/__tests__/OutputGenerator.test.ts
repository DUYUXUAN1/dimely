import { OutputGenerator } from '../generators/OutputGenerator';
import { Opportunity, BillingAction } from '../types';
import { describe, beforeEach, it, expect } from '@jest/globals';;

describe('OutputGenerator', () => {
  let generator: OutputGenerator;

  beforeEach(() => {
    generator = new OutputGenerator();
  });

  it('should generate a review sheet with correct structure', () => {
    const opportunity: Opportunity = {
      id: 'opp_001',
      type: 'new_business',
      account_name: 'Test Corp',
      account_id: 'acc_123',
      opportunity_name: 'Test Opp',
      close_date: '2024-10-15',
      amount: 6000,
      contract_start_date: '2024-11-01',
      contract_end_date: '2024-12-31',
      billing_frequency: 'monthly',
      payment_terms: 'net_30',
      line_items: [
        {
          id: 'li_001',
          product_name: 'Setup Fee',
          product_code: 'SETUP',
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
          billing_period: 'one_time',
          description: 'Setup',
        },
        {
          id: 'li_002',
          product_name: 'Monthly Plan',
          product_code: 'MONTHLY',
          quantity: 1,
          unit_price: 2500,
          total_price: 5000,
          billing_period: 'monthly',
          description: 'Monthly subscription',
        },
      ],
      contact_info: {
        primary_contact: 'John Doe',
        email: 'john@test.com',
        billing_address: {
          company: 'Test Corp',
          address_line_1: '123 St',
          city: 'City',
          state: 'CA',
          postal_code: '12345',
          country: 'US',
        },
      },
      sales_rep: 'Jane',
    };

    const actions: BillingAction[] = [
      {
        type: 'create_account',
        description: 'Create account for Test Corp',
        details: {},
        requires_review: false,
        risk_level: 'low',
      },
      {
        type: 'create_subscription',
        description: 'Create monthly subscription',
        details: {},
        amount_in_cents: 250000,
        requires_review: false,
        risk_level: 'low',
      },
    ];

    const sheet = generator.generateReviewSheet(opportunity, actions);

    expect(sheet.opportunity_id).toBe('opp_001');
    expect(sheet.opportunity_name).toBe('Test Opp');
    expect(sheet.account_name).toBe('Test Corp');
    expect(sheet.billing_actions).toHaveLength(2);
    expect(sheet.total_actions).toBe(2);
    expect(sheet.generated_at).toBeDefined();
  });

  it('should flag manual review when high risk actions present', () => {
    const opportunity: Opportunity = {
      id: 'opp_002',
      type: 'new_business',
      account_name: 'Risk Corp',
      account_id: 'acc_456',
      opportunity_name: 'Risk Opp',
      close_date: '2024-10-15',
      amount: 500000,
      contract_start_date: '2024-11-01',
      contract_end_date: '2025-10-31',
      billing_frequency: 'annually',
      payment_terms: 'net_30',
      line_items: [],
      contact_info: {
        primary_contact: 'Risk Person',
        email: 'risk@test.com',
        billing_address: {
          company: 'Risk Corp',
          address_line_1: '123 St',
          city: 'City',
          state: 'CA',
          postal_code: '12345',
          country: 'US',
        },
      },
      sales_rep: 'Jane',
    };

    const actions: BillingAction[] = [
      {
        type: 'create_subscription',
        description: 'High value subscription',
        details: {},
        amount_in_cents: 50000000,
        requires_review: true,
        risk_level: 'high',
        notes: ['High value transaction requires approval'],
      },
    ];

    const sheet = generator.generateReviewSheet(opportunity, actions);

    expect(sheet.manual_review_required).toBe(true);
    expect(sheet.high_risk_actions).toBe(1);
  });
});
