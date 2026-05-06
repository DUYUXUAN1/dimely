import { OpportunityParser } from '../parsers/OpportunityParser';
import { describe, beforeEach, it, expect } from '@jest/globals';;

describe('OpportunityParser', () => {
  let parser: OpportunityParser;

  beforeEach(() => {
    parser = new OpportunityParser();
  });

  describe('Basic Validation', () => {
    it('should parse a valid new business opportunity', () => {
      const validOpportunity = {
        id: 'opp_001',
        type: 'new_business',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        opportunity_name: 'Test Opportunity',
        close_date: '2024-10-15',
        amount: 12000,
        contract_start_date: '2024-11-01',
        contract_end_date: '2025-10-31',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        line_items: [
          {
            id: 'li_001',
            product_name: 'Test Product',
            product_code: 'TEST_PROD',
            quantity: 1,
            unit_price: 1000,
            total_price: 12000,
            billing_period: 'monthly',
            description: 'Test product',
          },
        ],
        contact_info: {
          primary_contact: 'John Doe',
          email: 'john@testcorp.com',
          billing_address: {
            company: 'Test Corp',
            address_line_1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Jane Smith',
      };

      const result = parser.parse(validOpportunity);

      expect(result.errors).toHaveLength(0);
      expect(result.opportunity).toBeDefined();
      expect(result.opportunity?.type).toBe('new_business');
    });

    it('should return errors for missing required fields', () => {
      const invalid = { id: 'opp_001' };
      const result = parser.parse(invalid);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.opportunity).toBeUndefined();
    });

    it('should validate opportunity type', () => {
      const invalidType = {
        id: 'opp_001',
        type: 'invalid_type',
        account_name: 'Test',
        account_id: 'acc_123',
        opportunity_name: 'Test',
        close_date: '2024-10-15',
        amount: 1000,
        contract_start_date: '2024-11-01',
        contract_end_date: '2024-12-31',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        line_items: [],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(invalidType);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should validate that line item totals match opportunity amount', () => {
      const mismatchedAmount = {
        id: 'opp_001',
        type: 'new_business',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        opportunity_name: 'Test',
        close_date: '2024-10-15',
        amount: 50000, // Doesn't match line items
        contract_start_date: '2024-11-01',
        contract_end_date: '2025-10-31',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        line_items: [
          {
            id: 'li_001',
            product_name: 'Product',
            product_code: 'PROD',
            quantity: 1,
            unit_price: 1000,
            total_price: 12000,
            billing_period: 'monthly',
            description: 'Product',
          },
        ],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(mismatchedAmount);
      // Should flag the mismatch
      expect(result.errors.some(e => e.field === 'amount' || e.message.includes('amount'))).toBe(true);
    });

    it('should validate line item math (quantity * unit_price = total_price for one-time)', () => {
      const badMath = {
        id: 'opp_001',
        type: 'new_business',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        opportunity_name: 'Test',
        close_date: '2024-10-15',
        amount: 5000,
        contract_start_date: '2024-11-01',
        contract_end_date: '2024-11-30',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        line_items: [
          {
            id: 'li_001',
            product_name: 'Service',
            product_code: 'SVC',
            quantity: 10,
            unit_price: 100,
            total_price: 5000, // Should be 1000 (10 * 100)
            billing_period: 'one_time',
            description: 'Service',
          },
        ],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(badMath);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Date Validation', () => {
    it('should reject contract_end_date before contract_start_date', () => {
      const invalidDates = {
        id: 'opp_001',
        type: 'new_business',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        opportunity_name: 'Test',
        close_date: '2024-10-15',
        amount: 12000,
        contract_start_date: '2025-01-01',
        contract_end_date: '2024-12-31', // Before start!
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        line_items: [{
          id: 'li_001',
          product_name: 'Product',
          product_code: 'PROD',
          quantity: 1,
          unit_price: 1000,
          total_price: 12000,
          billing_period: 'monthly',
          description: 'Product',
        }],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(invalidDates);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Logical Consistency', () => {
    it('should flag is_new_service with replaces_self_service as contradiction', () => {
      const contradictory = {
        id: 'opp_001',
        type: 'conversion_order',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        recurly_account_code: 'test_corp_ss',
        opportunity_name: 'Test Conversion',
        close_date: '2024-10-15',
        amount: 48000,
        contract_start_date: '2024-11-01',
        contract_end_date: '2025-10-31',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        existing_self_service: { monthly_amount: 99 },
        billing_transition: { credit_amount_due: 50 },
        line_items: [{
          id: 'li_001',
          product_name: 'Enterprise',
          product_code: 'ENT',
          quantity: 1,
          unit_price: 4000,
          total_price: 48000,
          billing_period: 'monthly',
          description: 'Enterprise plan',
          is_new_service: true,
          replaces_self_service: true, // Contradiction!
        }],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(contradictory);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Required Fields by Order Type', () => {
    it('should require recurly_account_code for conversion orders', () => {
      const conversionMissingCode = {
        id: 'opp_001',
        type: 'conversion_order',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        // Missing recurly_account_code!
        opportunity_name: 'Test Conversion',
        close_date: '2024-10-15',
        amount: 48000,
        contract_start_date: '2024-11-01',
        contract_end_date: '2025-10-31',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        existing_self_service: { monthly_amount: 99 },
        billing_transition: { credit_amount_due: 50 },
        line_items: [{
          id: 'li_001',
          product_name: 'Enterprise',
          product_code: 'ENT',
          quantity: 1,
          unit_price: 4000,
          total_price: 48000,
          billing_period: 'monthly',
          description: 'Enterprise plan',
        }],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(conversionMissingCode);
      expect(result.errors.some(e => 
        e.field === 'recurly_account_code' || 
        e.message.toLowerCase().includes('recurly')
      )).toBe(true);
    });

    it('should require existing_self_service for conversion orders', () => {
      const conversionMissingSS = {
        id: 'opp_001',
        type: 'conversion_order',
        account_name: 'Test Corp',
        account_id: 'acc_123',
        recurly_account_code: 'test_corp_ss',
        opportunity_name: 'Test Conversion',
        close_date: '2024-10-15',
        amount: 48000,
        contract_start_date: '2024-11-01',
        contract_end_date: '2025-10-31',
        billing_frequency: 'monthly',
        payment_terms: 'net_30',
        // Missing existing_self_service!
        line_items: [{
          id: 'li_001',
          product_name: 'Enterprise',
          product_code: 'ENT',
          quantity: 1,
          unit_price: 4000,
          total_price: 48000,
          billing_period: 'monthly',
          description: 'Enterprise plan',
        }],
        contact_info: {
          primary_contact: 'John',
          email: 'john@test.com',
          billing_address: {
            company: 'Test',
            address_line_1: '123 St',
            city: 'City',
            state: 'CA',
            postal_code: '12345',
            country: 'US',
          },
        },
        sales_rep: 'Rep',
      };

      const result = parser.parse(conversionMissingSS);
      expect(result.errors.some(e => 
        e.message.toLowerCase().includes('self_service') || 
        e.message.toLowerCase().includes('existing')
      )).toBe(true);
    });
  });
});
