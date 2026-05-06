import { z } from 'zod';
import { Opportunity, ValidationError, LineItem } from '../types';

const LineItemSchema = z.object({
  id: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number(),
  total_price: z.number(),
  billing_period: z.enum(['monthly', 'quarterly', 'annually', 'one_time']),
  description: z.string(),
  previous_price: z.number().optional(),
  price_change_reason: z.string().optional(),
  is_new_product: z.boolean().optional(),
  proration_needed: z.boolean().optional(),
  months_remaining: z.number().optional(),
  replaces_self_service: z.boolean().optional(),
  self_service_credit_needed: z.boolean().optional(),
  is_new_service: z.boolean().optional(),
  item_classification: z.enum(['subscription_consumption', 'non_subscription_consumption', 'one_time_service']).optional(),
  affects_base_subscription: z.boolean().optional(),
  immediate_invoice: z.boolean().optional(),
});

const ContactInfoSchema = z.object({
  primary_contact: z.string(),
  email: z.string().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Invalid email format'),
  billing_address: z.object({
    company: z.string(),
    address_line_1: z.string(),
    address_line_2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
});

const OpportunitySchema = z.object({
  id: z.string(),
  type: z.enum(['new_business', 'conversion_order', 'renewal', 'insertion_order']),
  account_name: z.string(),
  account_id: z.string(),
  recurly_account_code: z.string().optional(),
  opportunity_name: z.string(),
  close_date: z.string(),
  amount: z.number(),
  contract_start_date: z.string(),
  contract_end_date: z.string(),
  billing_frequency: z.enum(['monthly', 'quarterly', 'annually']),
  payment_terms: z.string(),
  line_items: z.array(LineItemSchema),
  contact_info: ContactInfoSchema,
  sales_rep: z.string(),
  notes: z.string().optional(),
  conversion_date: z.string().optional(),
  previous_contract: z.any().optional(),
  existing_contract: z.any().optional(),
  existing_self_service: z.any().optional(),
  renewal_notes: z.array(z.string()).optional(),
  conversion_notes: z.array(z.string()).optional(),
  proration_details: z.any().optional(),
  billing_transition: z.any().optional(),
  outstanding_invoices: z.any().optional(),
});

// ============================================================
// HELPER FUNCTIONS (provided for you)
// ============================================================

/**
 * Calculate the number of months between two dates
 */
function getContractMonths(startDate: string, endDate: string): number {
  const start = parseDateParts(startDate);
  const end = parseDateParts(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  // Add 1 because contract includes both start and end months
  return months + 1;
}

function parseDateParts(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Validate that a line item's total_price matches the expected calculation.
 * 
 * PRICING RULES:
 * - one_time: total_price = quantity × unit_price
 * - monthly: total_price = quantity × unit_price × contract_months
 * - quarterly: total_price = quantity × unit_price × (contract_months / 3)
 * - annually: total_price = quantity × unit_price × (contract_months / 12)
 */
function validateLineItemMath(
  item: LineItem, 
  contractMonths: number
): ValidationError | null {
  let expected: number;
  
  switch (item.billing_period) {
    case 'one_time':
      expected = item.quantity * item.unit_price;
      break;
    case 'monthly':
      expected = item.quantity * item.unit_price * contractMonths;
      break;
    case 'quarterly':
      expected = item.quantity * item.unit_price * (contractMonths / 3);
      break;
    case 'annually':
      expected = item.quantity * item.unit_price * (contractMonths / 12);
      break;
    default:
      return null;
  }
  
  // Allow small floating point differences
  if (Math.abs(item.total_price - expected) > 0.01) {
    return {
      field: `line_items.${item.id}.total_price`,
      message: `Line item math error: expected ${expected.toFixed(2)}, got ${item.total_price}`,
      value: item.total_price,
    };
  }
  
  return null;
}

/**
 * Validate that all line item total_prices sum to the opportunity amount
 */
function validateAmountSum(
  amount: number, 
  lineItems: LineItem[]
): ValidationError | null {
  const sum = lineItems.reduce((acc, item) => acc + item.total_price, 0);
  
  if (Math.abs(sum - amount) > 0.01) {
    return {
      field: 'amount',
      message: `Opportunity amount (${amount}) does not match sum of line items (${sum.toFixed(2)})`,
      value: { expected: sum, actual: amount },
    };
  }
  
  return null;
}

/**
 * Validate that contract end date is after start date
 */
function validateDates(startDate: string, endDate: string): ValidationError | null {
  const start = parseDateParts(startDate);
  const end = parseDateParts(endDate);
  
  if (end < start) {
    return {
      field: 'contract_end_date',
      message: 'Contract end date must be on or after start date',
      value: { start: startDate, end: endDate },
    };
  }
  
  return null;
}

// ============================================================
// MAIN PARSER CLASS
// ============================================================

export class OpportunityParser {
  parse(data: unknown): { opportunity?: Opportunity; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    
    try {
      // Step 1: Schema validation (structure + types)
      const result = OpportunitySchema.safeParse(data);
      
      if (!result.success) {
        result.error.issues.forEach((issue: any) => {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            value: issue.path.reduce((obj: any, key: any) => obj?.[key], data),
          });
        });
        return { errors };
      }

      const opportunity = result.data as Opportunity;
      
      // Step 2: Date validation (provided for you)
      const dateError = validateDates(
        opportunity.contract_start_date, 
        opportunity.contract_end_date
      );
      if (dateError) errors.push(dateError);
      
      // Step 3: Amount sum validation (provided for you)
      const amountError = validateAmountSum(opportunity.amount, opportunity.line_items);
      if (amountError) errors.push(amountError);
      
      // Step 4: Line item math validation (provided for you)
      const contractMonths = getContractMonths(
        opportunity.contract_start_date, 
        opportunity.contract_end_date
      );
      for (const item of opportunity.line_items) {
        const mathError = validateLineItemMath(item, contractMonths);
        if (mathError) errors.push(mathError);
      }
      
      if (opportunity.type === 'conversion_order') {
        if (!opportunity.recurly_account_code) {
          errors.push({
            field: 'recurly_account_code',
            message: 'conversion_order requires recurly_account_code',
          });
        }
        if (!opportunity.existing_self_service) {
          errors.push({
            field: 'existing_self_service',
            message: 'conversion_order requires existing_self_service',
          });
        }
        if (!opportunity.billing_transition) {
          errors.push({
            field: 'billing_transition',
            message: 'conversion_order requires billing_transition',
          });
        }
      }

      for (const item of opportunity.line_items) {
        if (item.is_new_service && item.replaces_self_service) {
          errors.push({
            field: `line_items.${item.id}`,
            message: 'Line item cannot be both is_new_service and replaces_self_service',
            value: item,
          });
        }
      }

      const refundItems = opportunity.billing_transition?.refund_items;
      if (Array.isArray(refundItems)) {
        for (let index = 0; index < refundItems.length; index++) {
          const refundItem = refundItems[index];
          const { original_amount, days_unused, days_in_period, refund_amount } = refundItem || {};

          if (
            typeof original_amount !== 'number' ||
            typeof days_unused !== 'number' ||
            typeof days_in_period !== 'number' ||
            typeof refund_amount !== 'number'
          ) {
            continue;
          }

          if (opportunity.existing_self_service?.current_period_start) {
            const periodStart = new Date(opportunity.existing_self_service.current_period_start);
            if (!Number.isNaN(periodStart.getTime())) {
              const actualDaysInMonth = new Date(
                periodStart.getFullYear(),
                periodStart.getMonth() + 1,
                0
              ).getDate();

              if (actualDaysInMonth !== days_in_period) {
                errors.push({
                  field: `billing_transition.refund_items.${index}.days_in_period`,
                  message: `Refund days_in_period mismatch: expected ${actualDaysInMonth}, got ${days_in_period}`,
                  value: days_in_period,
                });
              }
            }
          }

          const expectedRefund = Number(((original_amount * days_unused) / days_in_period).toFixed(2));
          if (Math.abs(refund_amount - expectedRefund) > 0.01) {
            errors.push({
              field: `billing_transition.refund_items.${index}.refund_amount`,
              message: `Refund amount mismatch: expected ${expectedRefund}, got ${refund_amount}`,
              value: refund_amount,
            });
          }
        }
      }
      
      if (errors.length > 0) {
        return { opportunity, errors };
      }
      
      return { opportunity, errors: [] };
      
    } catch (error) {
      errors.push({
        field: 'root',
        message: `Failed to parse opportunity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: data,
      });
      return { errors };
    }
  }
} 
