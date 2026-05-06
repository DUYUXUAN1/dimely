# Quick Start Guide

## TL;DR
You're building a system that translates **sales deals → billing actions**.

Sales closes a deal. Finance needs to set up billing. Your system automates that translation and catches errors before they become invoice mistakes.

**⏱️ Time Estimate: 4-5 hours**

## The 2 Order Types

| Type | What Happens | Key Challenge |
|------|--------------|---------------|
| **New Business** | Create account + subscriptions | Straightforward—no existing state |
| **Conversion Order** | Self-service → Enterprise | Refunds, cancellations, payment method switch |

## ⚠️ Critical: Pricing Formula

This trips up most candidates! Understand this before coding:

| Billing Period | Formula |
|----------------|---------|
| `one_time` | `total_price = quantity × unit_price` |
| `monthly` | `total_price = quantity × unit_price × contract_months` |

**Example:** 12-month contract at $1,000/month
- `unit_price: 1000` (monthly rate)
- `total_price: 12000` (NOT 1000!)

## 5-Minute Start

```bash
# 1. Look at the data (there are intentional bugs to find!)
cat sample-data/new-business-opportunity.json

# 2. Run the starter
cd starter-code
npm install
npm test                                          # Must pass!
npm run dev ../sample-data/new-business-opportunity.json
```

## What Success Looks Like

Input: Sales opportunity JSON  
Output: Review sheet with billing actions

```json
{
  "opportunity_id": "opp_001",
  "billing_actions": [
    {"type": "create_account", "description": "Create Recurly account"},
    {"type": "create_subscription", "amount_in_cents": 500000},
    {"type": "charge_one_time", "amount_in_cents": 500000}
  ],
  "warnings": [],
  "manual_review_required": false
}
```

## Key Files

| File | What It's For |
|------|---------------|
| `sample-data/*.json` | **Read these carefully!** Input opportunities with intentional bugs |
| `mock-apis/*.json` | Existing account state (for renewals, conversions) |
| `starter-code/src/__tests__/` | Tests that must pass |
| `starter-code/src/types/` | TypeScript definitions |

## Tips

1. **Examine sample data first** - understand what you're processing, find the bugs
2. **Tests define expected behavior** - read them carefully, they show exactly what's expected
3. **When uncertain, flag for review** - don't guess on billing
4. **Validate the math** - pricing errors are the most common bugs
5. **Amounts in cents** - billing actions use `amount_in_cents` (e.g., $100.00 = 10000 cents)
6. **Check the test files** - they contain examples of risk thresholds and edge cases

## ⚠️ Important: Data Validation

**The sample data files contain intentional errors** that mirror real-world Sales data mistakes. This is not a trick—it reflects reality. Sales reps make math errors, dates get entered wrong, and fields contradict each other.

Your parser should **catch these errors** before they become billing mistakes. A senior engineer's instinct is to validate inputs, not trust them blindly.

Examples of what your validation should catch:
- Line item math that doesn't add up
- Opportunity amounts that don't match line item totals
- Logical contradictions (e.g., "new product" with a "previous price")
- Date/period mismatches
