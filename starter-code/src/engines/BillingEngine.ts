import { Opportunity, RecurlyState, BillingAction } from '../types';
import { RecurlyClient } from '../clients/RecurlyClient';

export class BillingEngine {
  constructor(private recurlyClient: RecurlyClient) {}

  async generateActions(opportunity: Opportunity, recurlyState: RecurlyState | null): Promise<BillingAction[]> {
    void this.recurlyClient;

    const actions: BillingAction[] = [];
    const contractStart = opportunity.conversion_date || opportunity.contract_start_date;
    const isHighValue = opportunity.amount > 100000;
    const baseNotes = this.buildDataWarningNotes(opportunity);
    const pastDue = recurlyState?.account?.state === 'past_due';

    const applyRisk = (action: BillingAction): BillingAction => {
      const notes = [...(action.notes || []), ...baseNotes];
      const requiresReview = action.requires_review || isHighValue || pastDue || notes.length > 0;
      let riskLevel = action.risk_level;

      if (isHighValue || pastDue) {
        riskLevel = 'high';
      } else if (requiresReview && riskLevel === 'low') {
        riskLevel = 'medium';
      }

      return {
        ...action,
        notes: notes.length > 0 ? notes : undefined,
        requires_review: requiresReview,
        risk_level: riskLevel,
      };
    };

    if (opportunity.type === 'new_business') {
      actions.push(
        applyRisk({
          type: 'create_account',
          description: `Create new Recurly account for ${opportunity.account_name}`,
          details: {
            account_code: this.toAccountCode(opportunity.account_name),
            email: opportunity.contact_info.email,
            company_name: opportunity.contact_info.billing_address.company,
            billing_address: {
              address1: opportunity.contact_info.billing_address.address_line_1,
              address2: opportunity.contact_info.billing_address.address_line_2,
              city: opportunity.contact_info.billing_address.city,
              state: opportunity.contact_info.billing_address.state,
              zip: opportunity.contact_info.billing_address.postal_code,
              country: opportunity.contact_info.billing_address.country,
            },
          },
          requires_review: false,
          risk_level: 'low',
        })
      );
    }

    if (opportunity.type === 'conversion_order') {
      const activeSubscriptions = (recurlyState?.subscriptions || []).filter((sub) => sub.state === 'active');
      const cancellationDate =
        opportunity.billing_transition?.self_service_cancellation_date || opportunity.contract_start_date;
      const cancelledSubscriptionIds = new Set<string>();

      for (const subscription of activeSubscriptions) {
        cancelledSubscriptionIds.add(subscription.uuid);
        actions.push(
          applyRisk({
            type: 'cancel_subscription',
            description: `Cancel self-service subscription ${subscription.plan_code}`,
            details: {
              subscription_uuid: subscription.uuid,
              cancel_at: cancellationDate,
              refund_type: 'prorated',
            },
            effective_date: cancellationDate,
            requires_review: false,
            risk_level: 'medium',
          })
        );
      }

      const fallbackSubscriptionId = opportunity.existing_self_service?.subscription_id;
      if (typeof fallbackSubscriptionId === 'string' && fallbackSubscriptionId && !cancelledSubscriptionIds.has(fallbackSubscriptionId)) {
        actions.push(
          applyRisk({
            type: 'cancel_subscription',
            description: `Cancel self-service subscription ${opportunity.existing_self_service?.plan_code || fallbackSubscriptionId}`,
            details: {
              subscription_uuid: fallbackSubscriptionId,
              cancel_at: cancellationDate,
              refund_type: 'prorated',
            },
            effective_date: cancellationDate,
            requires_review: false,
            risk_level: 'medium',
          })
        );
      }

      const transitionSubscriptions = Array.isArray(opportunity.billing_transition?.subscriptions_to_cancel)
        ? opportunity.billing_transition.subscriptions_to_cancel
        : [];
      for (const subscriptionId of transitionSubscriptions) {
        if (typeof subscriptionId !== 'string' || !subscriptionId || cancelledSubscriptionIds.has(subscriptionId)) {
          continue;
        }
        cancelledSubscriptionIds.add(subscriptionId);
        actions.push(
          applyRisk({
            type: 'cancel_subscription',
            description: `Cancel self-service subscription ${subscriptionId}`,
            details: {
              subscription_uuid: subscriptionId,
              cancel_at: cancellationDate,
              refund_type: 'prorated',
            },
            effective_date: cancellationDate,
            requires_review: false,
            risk_level: 'medium',
          })
        );
      }

      const existingSubscriptions = Array.isArray(opportunity.existing_self_service?.subscriptions)
        ? opportunity.existing_self_service.subscriptions
        : [];
      for (const subscription of existingSubscriptions) {
        const subscriptionId = subscription?.subscription_id;
        if (typeof subscriptionId !== 'string' || !subscriptionId || cancelledSubscriptionIds.has(subscriptionId)) {
          continue;
        }
        cancelledSubscriptionIds.add(subscriptionId);
        actions.push(
          applyRisk({
            type: 'cancel_subscription',
            description: `Cancel self-service subscription ${subscription.plan_code || subscriptionId}`,
            details: {
              subscription_uuid: subscriptionId,
              cancel_at: cancellationDate,
              refund_type: 'prorated',
            },
            effective_date: cancellationDate,
            requires_review: false,
            risk_level: 'medium',
          })
        );
      }

      const creditAmount = Number(opportunity.billing_transition?.credit_amount_due || 0);
      if (creditAmount > 0) {
        actions.push(
          applyRisk({
            type: 'apply_credit',
            description: 'Apply credit for unused self-service time',
            details: {
              credit_type: 'proration_refund',
              reason: 'Self-service conversion credit',
              original_subscription: opportunity.existing_self_service?.subscription_id,
            },
            amount_in_cents: this.toCents(creditAmount),
            effective_date: contractStart,
            requires_review: false,
            risk_level: creditAmount > 500 ? 'medium' : 'low',
            notes: creditAmount > 500 ? ['Refund exceeds $500 threshold'] : undefined,
          })
        );
      }

      const newBillingMethod = opportunity.billing_transition?.new_billing_method;
      const shouldSwitchToInvoice = !newBillingMethod || newBillingMethod === 'invoice';
      if (shouldSwitchToInvoice) {
        actions.push(
          applyRisk({
            type: 'update_account',
            description: 'Switch account billing to invoice terms',
            details: {
              collection_method: 'manual',
              net_terms: 30,
              billing_info_update: 'Move from card auto-charge to invoice billing',
            },
            effective_date: contractStart,
            requires_review: false,
            risk_level: 'low',
          })
        );
      }
    }

    for (const item of opportunity.line_items) {
      if (item.billing_period === 'one_time') {
        actions.push(
          applyRisk({
            type: 'charge_one_time',
            description: `One-time charge for ${item.product_name}`,
            details: {
              charge_code: item.product_code,
              description: item.description,
            },
            amount_in_cents: this.toCents(item.total_price),
            effective_date: contractStart,
            requires_review: false,
            risk_level: 'low',
          })
        );
      } else {
        actions.push(
          applyRisk({
            type: 'create_subscription',
            description: `Create ${item.billing_period} subscription for ${item.product_name}`,
            details: {
              plan_code: item.product_code,
              unit_amount_in_cents: this.toCents(item.unit_price),
              quantity: item.quantity,
              collection_method: 'manual',
              net_terms: 30,
              starts_at: contractStart,
            },
            amount_in_cents: this.toCents(item.unit_price * item.quantity),
            effective_date: contractStart,
            requires_review: false,
            risk_level: 'low',
          })
        );
      }
    }

    return actions;
  }

  private toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  private toAccountCode(accountName: string): string {
    return accountName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private buildDataWarningNotes(opportunity: Opportunity): string[] {
    const warnings: string[] = [];
    const contractMonths = this.getContractMonths(opportunity.contract_start_date, opportunity.contract_end_date);

    const lineItemSum = opportunity.line_items.reduce((sum, lineItem) => sum + lineItem.total_price, 0);
    if (Math.abs(lineItemSum - opportunity.amount) > 0.01) {
      warnings.push('Amount mismatch between opportunity total and line items');
    }

    for (const lineItem of opportunity.line_items) {
      if (lineItem.is_new_service && lineItem.replaces_self_service) {
        warnings.push(`Line item ${lineItem.id} has contradictory service flags`);
      }
      const expected = this.expectedLineTotal(lineItem, contractMonths);
      if (expected !== null && Math.abs(lineItem.total_price - expected) > 0.01) {
        warnings.push(`Line item ${lineItem.id} has pricing math mismatch`);
      }
    }

    return warnings;
  }

  private getContractMonths(startDate: string, endDate: string): number {
    const start = this.parseDateParts(startDate);
    const end = this.parseDateParts(endDate);
    const monthDiff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const alignedBillingCycles = monthDiff + (end.getDate() >= start.getDate() ? 1 : 0);
    return Math.max(1, alignedBillingCycles);
  }

  private parseDateParts(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private expectedLineTotal(
    lineItem: Opportunity['line_items'][number],
    contractMonths: number
  ): number | null {
    switch (lineItem.billing_period) {
      case 'one_time':
        return lineItem.quantity * lineItem.unit_price;
      case 'monthly':
        return lineItem.quantity * lineItem.unit_price * contractMonths;
      case 'quarterly':
        return lineItem.quantity * lineItem.unit_price * (contractMonths / 3);
      case 'annually':
        return lineItem.quantity * lineItem.unit_price * (contractMonths / 12);
      default:
        return null;
    }
  }
}
