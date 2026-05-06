import { Opportunity, BillingAction, ReviewSheet, ValidationError } from '../types';

export class OutputGenerator {
  generateReviewSheet(
    opportunity: Opportunity,
    billingActions: BillingAction[],
    validationErrors: ValidationError[] = []
  ): ReviewSheet {
    const highRiskActions = billingActions.filter((action) => action.risk_level === 'high').length;
    const estimatedTotalImpact = billingActions.reduce((sum, action) => sum + (action.amount_in_cents || 0), 0);
    const warnings = this.buildWarnings(opportunity, billingActions, validationErrors);
    const manualReviewRequired =
      warnings.length > 0 || billingActions.some((action) => action.requires_review);

    return {
      opportunity_id: opportunity.id,
      opportunity_name: opportunity.opportunity_name,
      account_name: opportunity.account_name,
      total_actions: billingActions.length,
      high_risk_actions: highRiskActions,
      estimated_total_impact: estimatedTotalImpact,
      billing_actions: billingActions,
      summary: this.buildSummary(opportunity, billingActions, estimatedTotalImpact),
      warnings,
      manual_review_required: manualReviewRequired,
      generated_at: new Date().toISOString(),
    };
  }

  private buildSummary(
    opportunity: Opportunity,
    actions: BillingAction[],
    impactInCents: number
  ): string {
    const orderLabel = opportunity.type === 'conversion_order' ? 'Conversion order' : 'New business order';
    const dollars = (impactInCents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${orderLabel}: ${actions.length} billing actions totaling $${dollars}`;
  }

  private buildWarnings(
    opportunity: Opportunity,
    actions: BillingAction[],
    validationErrors: ValidationError[]
  ): string[] {
    const warnings = new Set<string>();

    if (opportunity.amount > 100000) {
      warnings.add('High-value transaction exceeds $100,000');
    }

    if (opportunity.outstanding_invoices?.has_outstanding) {
      warnings.add('Account has outstanding invoices; requires finance review before provisioning');
    }

    if (opportunity.close_date && opportunity.contract_start_date && opportunity.contract_start_date < opportunity.close_date) {
      warnings.add('Backdated contract start detected');
    }

    const daysSinceExpiration = opportunity.previous_contract?.days_since_expiration;
    if (typeof daysSinceExpiration === 'number' && daysSinceExpiration > 30) {
      warnings.add(`Renewal has ${daysSinceExpiration} days service gap`);
    }

    for (const action of actions) {
      if (action.risk_level === 'high') {
        warnings.add(`High-risk action: ${action.type}`);
      }
      for (const note of action.notes || []) {
        warnings.add(note);
      }
    }
    for (const error of validationErrors) {
      warnings.add(`Validation issue (${error.field}): ${error.message}`);
    }

    return Array.from(warnings);
  }
}
