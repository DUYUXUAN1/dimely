import * as fs from 'fs';
import * as path from 'path';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { Dimely } from '../index';
import { BillingAction, ReviewSheet } from '../types';

describe('Edge Cases: sample-data/edge-cases', () => {
  let dimely: Dimely;

  beforeEach(() => {
    dimely = new Dimely();
  });

  it('should process all edge case files with strong invariants and scenario assertions', async () => {
    const edgeCasesDir = path.join(__dirname, '../../../sample-data/edge-cases');
    const files = fs
      .readdirSync(edgeCasesDir)
      .filter((file) => file.endsWith('.json'))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(34);

    const failures: string[] = [];
    for (const file of files) {
      const filePath = path.join(edgeCasesDir, file);
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const result = await dimely.processOpportunity(payload);

      if (!result.success || !result.review_sheet) {
        failures.push(file);
        continue;
      }

      assertCommonInvariants(file, result.review_sheet);
      assertScenarioSpecificBehavior(file, result.review_sheet);
    }

    expect(failures).toEqual([]);
  });
});

function assertCommonInvariants(file: string, sheet: ReviewSheet): void {
  void file;
  expect(sheet.opportunity_id).toBeTruthy();
  expect(sheet.billing_actions.length).toBeGreaterThan(0);
  expect(sheet.total_actions).toBe(sheet.billing_actions.length);

  const computedHighRisk = sheet.billing_actions.filter((action) => action.risk_level === 'high').length;
  expect(sheet.high_risk_actions).toBe(computedHighRisk);

  const computedImpact = sheet.billing_actions.reduce((sum, action) => sum + (action.amount_in_cents || 0), 0);
  expect(sheet.estimated_total_impact).toBe(computedImpact);

  const shouldRequireReview =
    sheet.warnings.length > 0 ||
    sheet.billing_actions.some((action) => action.requires_review || action.risk_level === 'high');
  expect(sheet.manual_review_required).toBe(shouldRequireReview);

  for (const action of sheet.billing_actions) {
    if (action.amount_in_cents !== undefined) {
      expect(Number.isInteger(action.amount_in_cents)).toBe(true);
    }
  }
}

function hasAction(actions: BillingAction[], type: BillingAction['type']): boolean {
  return actions.some((action) => action.type === type);
}

function assertScenarioSpecificBehavior(file: string, sheet: ReviewSheet): void {
  const actions = sheet.billing_actions;

  if (file === 'high-value-enterprise.json') {
    expect(sheet.manual_review_required).toBe(true);
    expect(actions.some((action) => action.risk_level === 'high')).toBe(true);
  }

  if (file.startsWith('conversion-')) {
    expect(hasAction(actions, 'create_subscription')).toBe(true);
    expect(hasAction(actions, 'update_account')).toBe(true);
  }

  if (file === 'conversion-full-month-refund.json' || file === 'conversion-order-opportunity.json') {
    expect(hasAction(actions, 'apply_credit')).toBe(true);
  }

  if (file === 'negative-amount-credit.json') {
    const hasCreditLike =
      hasAction(actions, 'apply_credit') || actions.some((action) => (action.amount_in_cents || 0) < 0);
    const hasNegativeInputWarning = sheet.warnings.some((warning) =>
      warning.toLowerCase().includes('validation') || warning.toLowerCase().includes('mismatch')
    );
    expect(hasCreditLike || hasNegativeInputWarning).toBe(true);
  }

  if (file === 'same-day-contract.json' || file === 'insertion-last-day-contract.json') {
    const effectiveDates = actions.map((action) => action.effective_date).filter(Boolean) as string[];
    expect(effectiveDates.length).toBeGreaterThan(0);
    for (const date of effectiveDates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  }

  if (file === 'minimum-viable-data.json') {
    expect(hasAction(actions, 'create_account')).toBe(true);
    expect(actions.some((action) => action.type !== 'create_account')).toBe(true);
  }

  if (file === 'all-one-time-charges.json') {
    expect(actions.every((action) => action.type === 'create_account' || action.type === 'charge_one_time')).toBe(
      true
    );
  }

  if (file === '50-line-items.json') {
    expect(actions.length).toBeGreaterThanOrEqual(30);
    expect(sheet.manual_review_required).toBe(true);
  }

  if (file === 'fractional-cents-rounding.json') {
    const amountActions = actions.filter((action) => action.amount_in_cents !== undefined);
    expect(amountActions.length).toBeGreaterThan(0);
    expect(amountActions.every((action) => Number.isInteger(action.amount_in_cents))).toBe(true);
  }

  if (file === 'zero-amount-opportunity.json') {
    expect(sheet.estimated_total_impact).toBe(0);
  }
}
