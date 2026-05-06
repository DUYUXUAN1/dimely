# EDGE CASES AUDIT

Generated from `sample-data/edge-cases/*.json` and exported review sheets in `starter-code/output/all-review-sheets/`.

## Summary
- Total edge cases: **34**
- Total business checks executed: **80**
- Checks passed: **80/80**

## Per-case Audit

### 50-line-items.json
- Type: `new_business`
- Opportunity amount: `$125,000`
- Output actions: `create_account, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time, charge_one_time`
- Output net impact: `$117,300.00`
- Manual review: `true`
- Business expectations (from notes):
  - Maximum complexity deal with 50 line items including modules, add-ons, services, credits, discounts, and taxes.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### all-one-time-charges.json
- Type: `new_business`
- Opportunity amount: `$75,000`
- Output actions: `create_account, charge_one_time, charge_one_time, charge_one_time, charge_one_time`
- Output net impact: `$75,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Project-based engagement with only one-time charges. No recurring subscriptions. All services billed upfront upon contract execution.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### backdated-start.json
- Type: `new_business`
- Opportunity amount: `$120,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$120,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Contract signed October 2024 but backdated to January 1, 2024. Customer was on trial/POC and now converting. Backbilling for 9 months of service already consumed. First invoice will cover Jan-Oct 2024 ($100,000), then Nov-Dec 2024 ($20,000).
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### boundary-month-end.json
- Type: `new_business`
- Opportunity amount: `$12,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$12,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Start date Jan 31. Monthly billing should handle: Feb 28/29 (leap year), months with 30 days, months with 31 days. First bill Jan 31, second bill Feb 29 (2024 is leap year), third bill Mar 31, etc.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### conversion-annual-to-monthly.json
- Type: `conversion_order`
- Opportunity amount: `$72,000`
- Output actions: `cancel_subscription, apply_credit, update_account, create_subscription`
- Output net impact: `$71,204.00`
- Manual review: `true`
- Business expectations (from notes):
  - Customer on annual self-service plan paid through Feb 2025
  - Converting mid-year with 4 months remaining
  - Prorated refund: $2,388 × (4/12) = $796
  - New enterprise plan: $6,000/month = $72,000/year
- Validation checks: ✅ all passed
  - ✅ create_subscription
  - ✅ update_account
  - ✅ cancel_subscription
  - ✅ apply_credit
  - ✅ credit_is_negative
  - ✅ impact_sum_matches_actions

### conversion-backdated.json
- Type: `conversion_order`
- Opportunity amount: `$48,000`
- Output actions: `cancel_subscription, apply_credit, update_account, create_subscription`
- Output net impact: `$47,901.00`
- Manual review: `true`
- Business expectations (from notes):
  - Deal closed October 15, but backdated to October 1
  - Customer needs alignment with fiscal month start
  - Full refund of October self-service charge
  - October enterprise invoice already partially delivered
- Validation checks: ✅ all passed
  - ✅ create_subscription
  - ✅ update_account
  - ✅ cancel_subscription
  - ✅ apply_credit
  - ✅ credit_is_negative
  - ✅ impact_sum_matches_actions

### conversion-full-month-refund.json
- Type: `conversion_order`
- Opportunity amount: `$48,000`
- Output actions: `cancel_subscription, apply_credit, update_account, create_subscription`
- Output net impact: `$47,501.00`
- Manual review: `true`
- Business expectations (from notes):
  - Customer was just billed for November on self-service
  - Full month refund required - $499
  - Immediate conversion to professional plan
  - Net cost to customer this month: $4,000 - $499 = $3,501
- Validation checks: ✅ all passed
  - ✅ create_subscription
  - ✅ update_account
  - ✅ cancel_subscription
  - ✅ apply_credit
  - ✅ credit_is_negative
  - ✅ impact_sum_matches_actions

### conversion-multiple-subscriptions.json
- Type: `conversion_order`
- Opportunity amount: `$120,000`
- Output actions: `cancel_subscription, cancel_subscription, cancel_subscription, cancel_subscription, cancel_subscription, apply_credit, update_account, create_subscription`
- Output net impact: `$119,922.97`
- Manual review: `true`
- Business expectations (from notes):
  - Customer has 5 separate self-service subscriptions
  - Each has different billing cycle - complex proration
  - Consolidating into single $10,000/month enterprise bundle
  - Total previous spend: $345/month → New: $10,000/month
- Validation checks: ✅ all passed
  - ✅ create_subscription
  - ✅ update_account
  - ✅ cancel_subscription
  - ✅ apply_credit
  - ✅ credit_is_negative
  - ✅ impact_sum_matches_actions

### conversion-same-day.json
- Type: `conversion_order`
- Opportunity amount: `$60,000`
- Output actions: `cancel_subscription, update_account, create_subscription`
- Output net impact: `$60,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Perfect timing - conversion on billing period boundary
  - No proration or credits needed
  - Self-service ends Oct 31, enterprise starts Nov 1
  - Clean transition with no service interruption
- Validation checks: ✅ all passed
  - ✅ create_subscription
  - ✅ update_account
  - ✅ cancel_subscription
  - ✅ impact_sum_matches_actions

### duplicate-product-codes.json
- Type: `new_business`
- Opportunity amount: `$36,000`
- Output actions: `create_account, create_subscription, create_subscription, create_subscription`
- Output net impact: `$36,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Multiple line items with same product code but different quantities/allocations. Total: 150 users × $20/user × 12 months = $36,000. Tests handling of duplicate product codes in billing system.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### extremely-long-name.json
- Type: `new_business`
- Opportunity amount: `$120,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$120,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Test case for extremely long field values. All names, descriptions, and identifiers are intentionally verbose to test maximum field length handling and UI truncation behavior.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### fractional-cents-rounding.json
- Type: `new_business`
- Opportunity amount: `$15,000.01`
- Output actions: `create_account, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription`
- Output net impact: `$15,000.01`
- Manual review: `true`
- Business expectations (from notes):
  - Usage-based pricing with sub-penny rates. Watch for rounding issues across billing periods.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### future-dated-start.json
- Type: `new_business`
- Opportunity amount: `$60,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$60,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Contract signed in October 2024 but starts April 2025 (6 months later). Customer budget available Q2 2025. No billing until April 1, 2025.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### high-value-enterprise.json
- Type: `new_business`
- Opportunity amount: `$2,500,000`
- Output actions: `create_account, create_subscription, create_subscription, charge_one_time, charge_one_time`
- Output net impact: `$2,500,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Strategic enterprise deal. CFO approval obtained. Multi-year commitment with annual billing.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### insertion-last-day-contract.json
- Type: `insertion_order`
- Opportunity amount: `$5,000`
- Output actions: `charge_one_time`
- Output net impact: `$5,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Customer requested emergency data export on contract's final day
  - One-time charge - no proration needed
  - Invoice immediately - payment due on receipt
  - Customer renewing in new contract starting January 1
- Validation checks: ✅ all passed
  - ✅ impact_sum_matches_actions

### insertion-mid-quarter-proration.json
- Type: `insertion_order`
- Opportunity amount: `$4,500`
- Output actions: `create_subscription, charge_one_time`
- Output net impact: `$4,500.00`
- Manual review: `true`
- Business expectations (from notes):
  - Customer wants premium analytics mid-quarter
  - Prorate subscription portion for 46 remaining days
  - Implementation services billed immediately in full
  - Next full quarterly charge starts January 1
- Validation checks: ✅ all passed
  - ✅ impact_sum_matches_actions

### insertion-outstanding-invoices.json
- Type: `insertion_order`
- Opportunity amount: `$12,000`
- Output actions: `create_subscription, charge_one_time`
- Output net impact: `$12,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - CRITICAL: Customer has $25,000 in outstanding invoices
  - Oldest invoice is 137 days past due
  - Sales approved upsell contingent on payment plan
  - Require full outstanding balance payment before provisioning
- Validation checks: ✅ all passed
  - ✅ manual_review_for_outstanding_ar
  - ✅ impact_sum_matches_actions

### leap-year-february.json
- Type: `new_business`
- Opportunity amount: `$12,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$12,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Contract starts on leap day (Feb 29). Next year billing should fall back to Feb 28.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### minimum-viable-data.json
- Type: `new_business`
- Opportunity amount: `$1`
- Output actions: `create_account, charge_one_time`
- Output net impact: `$1.00`
- Manual review: `false`
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### mixed-billing-periods.json
- Type: `new_business`
- Opportunity amount: `$84,000`
- Output actions: `create_account, create_subscription, create_subscription, create_subscription, charge_one_time, charge_one_time`
- Output net impact: `$84,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Complex billing scenario with monthly, quarterly, annual, and one-time items. Ensure proper invoice scheduling.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### multi-year-contract.json
- Type: `new_business`
- Opportunity amount: `$3,000,000`
- Output actions: `create_account, create_subscription, create_subscription, create_subscription, create_subscription, create_subscription, charge_one_time`
- Output net impact: `$3,000,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - 5-year commitment with 5% annual price escalation. Each year billed annually on anniversary date.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### negative-amount-credit.json
- Type: `insertion_order`
- Opportunity amount: `$-15,000`
- Output actions: `charge_one_time, charge_one_time`
- Output net impact: `$-15,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - SLA credit for Q3 2024 outages
  - $10,000 credit per SLA agreement
  - Additional $5,000 for billing error correction
  - Total credit: $15,000 applied to account
- Validation checks: ✅ all passed
  - ✅ impact_sum_matches_actions

### net-0-payment-terms.json
- Type: `new_business`
- Opportunity amount: `$24,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$24,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Net-0 payment terms: payment due immediately upon invoice. No grace period. Invoice date = due date.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### net-90-payment-terms.json
- Type: `new_business`
- Opportunity amount: `$500,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$500,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Net-90 payment terms: Payment due 90 days after invoice date. Large enterprise client with established credit. Approved by CFO.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### quarterly-only-billing.json
- Type: `new_business`
- Opportunity amount: `$48,000`
- Output actions: `create_account, create_subscription, create_subscription`
- Output net impact: `$48,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Pure quarterly billing: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec). Invoice dates: Jan 1, Apr 1, Jul 1, Oct 1.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### renewal-100-percent-increase.json
- Type: `renewal`
- Opportunity amount: `$240,000`
- Output actions: `create_subscription`
- Output net impact: `$240,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Customer experienced 10x growth in usage
  - Moving from Tier 2 to Tier 4 pricing
  - 100% price increase approved by customer CFO
  - Customer requested monthly billing to manage cash flow
- Validation checks: ✅ all passed
  - ✅ impact_sum_matches_actions

### renewal-50-percent-decrease.json
- Type: `renewal`
- Opportunity amount: `$30,000`
- Output actions: `create_subscription`
- Output net impact: `$30,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Customer reduced headcount by 60%
  - Downgrading from Enterprise to Standard tier
  - Retention play - offered 50% discount to prevent churn
  - 12-month commitment secured
- Validation checks: ✅ all passed
  - ✅ impact_sum_matches_actions

### renewal-frequency-change.json
- Type: `renewal`
- Opportunity amount: `$114,000`
- Output actions: `create_subscription`
- Output net impact: `$114,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Customer switching from monthly to annual billing
  - 5% discount applied for annual commitment
  - Single invoice due January 1st
  - Payment terms: Net 30
- Validation checks: ✅ all passed
  - ✅ impact_sum_matches_actions

### renewal-late-gap.json
- Type: `renewal`
- Opportunity amount: `$60,000`
- Output actions: `create_subscription`
- Output net impact: `$60,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Contract expired December 31, 2024
  - Customer had 46-day service gap
  - Data preserved under grace period policy
  - No backfill billing for gap period
- Validation checks: ✅ all passed
  - ✅ warning_for_service_gap
  - ✅ impact_sum_matches_actions

### same-day-contract.json
- Type: `new_business`
- Opportunity amount: `$5,000`
- Output actions: `create_account, charge_one_time`
- Output net impact: `$5,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - One-day engagement. Invoice immediately upon completion.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### special-characters-names.json
- Type: `new_business`
- Opportunity amount: `$50,000`
- Output actions: `create_account, create_subscription, charge_one_time`
- Output net impact: `$50,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Special characters test: apostrophes, ampersands, em-dashes, guillemets, quotes, hyphens, fractions. Handle with care!
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### unicode-international.json
- Type: `new_business`
- Opportunity amount: `$24,000,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$24,000,000.00`
- Manual review: `true`
- Business expectations (from notes):
  - Japanese enterprise customer. All amounts in JPY. Note: ¥24,000,000 = ~$160,000 USD
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### year-boundary-crossing.json
- Type: `new_business`
- Opportunity amount: `$3,000`
- Output actions: `create_account, create_subscription`
- Output net impact: `$3,000.00`
- Manual review: `false`
- Business expectations (from notes):
  - Contract spans year boundary: Dec 25, 2024 - Jan 24, 2025. Tests date handling across calendar years.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions

### zero-amount-opportunity.json
- Type: `new_business`
- Opportunity amount: `$0`
- Output actions: `create_account`
- Output net impact: `$0.00`
- Manual review: `false`
- Business expectations (from notes):
  - 3-month free pilot program. No billing required during trial period.
- Validation checks: ✅ all passed
  - ✅ create_account
  - ✅ impact_sum_matches_actions
