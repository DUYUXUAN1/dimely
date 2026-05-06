# Dimely Engineering Challenge

## The Business Problem

**Dimely automates backoffice finance workflows for B2B SaaS companies.**

When a sales rep closes a deal, someone needs to actually set up the billing. At most companies, this looks like:

1. Sales closes deal in Salesforce → emails Finance
2. Finance manually logs into Recurly (billing platform)
3. Finance creates/updates accounts, subscriptions, invoices
4. Finance emails Sales to confirm it's done
5. If something's wrong, back-and-forth emails to fix it

**This process is slow, error-prone, and doesn't scale.** A single billing mistake can result in:
- Revenue leakage (undercharging customers)
- Customer disputes (overcharging or wrong invoices)
- Audit failures (incorrect financial records)
- Hours of manual reconciliation

**Dimely fixes this** by automatically translating closed deals into billing actions, with human review for anything risky.

---

## What You're Building

A **billing automation engine** that:
1. Takes a closed sales opportunity (JSON)
2. Validates the data for correctness
3. Generates the exact billing actions needed
4. Produces a review sheet for Finance to approve

Think of it as a translator: **Sales language → Billing language**

---

## ⚠️ Critical: Pricing Conventions

Understanding this is **essential** to passing this challenge. The sample data follows these conventions:

### Line Item Pricing

| Field | Meaning |
|-------|---------|
| `unit_price` | Price per unit **per billing period** (e.g., $1,000/month) |
| `total_price` | **Total contract value** for this line item |

### Calculation Rules

| Billing Period | Formula |
|----------------|---------|
| `one_time` | `total_price = quantity × unit_price` |
| `monthly` | `total_price = quantity × unit_price × contract_months` |
| `quarterly` | `total_price = quantity × unit_price × (contract_months / 3)` |
| `annually` | `total_price = quantity × unit_price × contract_years` |

### Example

A **12-month contract** with a **$1,000/month** subscription:
```
unit_price:  1,000    (monthly rate)
total_price: 12,000   (NOT 1,000!)
```

Your validation should check:
1. **Line item math** follows the rules above
2. **Opportunity amount** = sum of all `line_items.total_price`

---

## The Two Order Types

### 1. New Business
**What it is:** A brand new customer signing their first contract.

**Business context:** Sales just closed a new logo! The customer has never used the product before. We need to:
- Create their account in the billing system
- Set up their subscription(s)
- Charge any one-time fees (setup, implementation, training)
- Start billing on the contract start date

**Why it's the simpler case:** No existing state to worry about. Everything is created fresh.

**Example scenario:** Acme Corp signs a 12-month contract for the Professional Plan ($5,000/mo) plus a $5,000 setup fee. We create their account, set up monthly billing, and charge the setup fee immediately.

---

### 2. Conversion Order
**What it is:** Transitioning a self-service customer to direct sales.

**Business context:** Many SaaS companies have two sales motions:
- **Self-service:** Customer signs up online, pays by credit card, ~$50-500/mo
- **Direct sales:** Sales rep involved, invoiced billing, ~$5,000+/mo

When a self-service customer grows, they often want:
- Higher usage limits
- Dedicated support
- Invoice billing (for procurement/accounting reasons)
- Custom contract terms

**Why it's the complex case:**
- We need to **cancel** their existing self-service subscription
- **Refund** any unused time they already paid for
- **Create** new enterprise subscription
- **Switch payment method** from credit card to invoicing
- Do all this with **zero service interruption**

**Example scenario:** Delta Innovations has been self-service ($199/mo on credit card) for 18 months. They just raised funding and want to upgrade to Professional ($7,000/mo) with invoice billing. They're mid-billing-cycle, so we need to refund 23 unused days (~$148) from their current period, cancel the self-service plan, and start the new enterprise plan.

---

## Why Data Validation Matters

In billing, **small errors have big consequences:**

| Error | Consequence |
|-------|-------------|
| Line item math wrong | Invoice is incorrect, customer disputes |
| Dates don't align | Service gap or double-billing |
| Refund miscalculated | Over/undercharge, chargeback risk |
| Missing cancellation | Customer charged twice |

Your system should **catch these errors before they become billing mistakes**.

---

## The Review Sheet

The output isn't just "do these billing actions"—it's a **review sheet** for the Finance team:

```json
{
  "opportunity_id": "opp_001",
  "account_name": "Acme Corp",
  "billing_actions": [...],
  "warnings": ["High-value transaction - verify with Sales"],
  "manual_review_required": true
}
```

**Why?** Even with automation, humans should approve:
- High-value transactions
- Unusual scenarios (backdated contracts, large refunds)
- Data that looks suspicious

The system's job is to **do the math correctly** and **flag anything that needs human judgment**.

---

## Your Challenge

Build a system that:

1. **Parses** opportunity data from JSON files
2. **Validates** data integrity (amounts match, dates correct, logic consistent)
3. **Generates** the billing actions for each order type
4. **Flags** anything requiring manual review

### Requirements

- All tests must pass (`npm test`)
- All sample data files must process
- Review sheets generated for each opportunity
- Edge cases handled gracefully

### Getting Started

```bash
cd starter-code
npm install
npm test        # Tests must pass
npm run dev     # Process sample data
```

### Project Structure

```
├── sample-data/           # Input files (review carefully!)
├── mock-apis/             # Existing account data for conversions
├── starter-code/
│   ├── src/
│   │   ├── parsers/       # Validate input data
│   │   ├── engines/       # Generate billing actions
│   │   ├── generators/    # Create review sheets
│   │   └── __tests__/     # Tests that must pass
│   └── package.json
└── README.md
```

---

## Evaluation

Your submission is evaluated by running tests against your implementation.

**Pass** = Tests pass, sample data processes correctly  
**Fail** = Tests fail or errors processing sample data

> ⚠️ **Note:** Your submission will be evaluated against additional test cases beyond those in `__tests__/`. The provided tests cover core functionality, but we also test edge cases and error handling. Write robust code that handles unexpected inputs gracefully.

---

## Submission

- **Time:** Plan for **4-5 hours**
- **Include:** Brief README explaining how to run
- **Tests:** All provided tests must pass

### Suggested Time Allocation

| Component | Time | Notes |
|-----------|------|-------|
| Read & understand problem | 30-45 min | Review sample data, types, and tests carefully |
| OpportunityParser | 45-60 min | Schema validation is provided; add business logic validation |
| BillingEngine (new business) | 60-75 min | Simpler case—create account, subscriptions, one-time charges |
| BillingEngine (conversion) | 75-90 min | Complex case—cancellations, refunds, payment method switch |
| Testing & polish | 30-45 min | Run all tests, handle edge cases |

💡 **Pro tip:** Spend time upfront understanding the sample data and test cases. The tests are your specification.

---

## Risk Assessment Rules

Your system should flag certain scenarios for manual review. Here are the thresholds:

| Scenario | Risk Level | Action |
|----------|------------|--------|
| Transaction > $100,000 | High | `requires_review: true` |
| Account status `past_due` | High | `requires_review: true` |
| Refund > $500 | Medium | Flag in warnings |
| Data validation errors | High | `requires_review: true` |

### When to Flag for Review

```typescript
// High-value transactions
if (opportunity.amount > 100000) {
  action.risk_level = 'high';
  action.requires_review = true;
}

// Past-due accounts (for conversions)
if (existingState?.account.state === 'past_due') {
  action.risk_level = 'high';
  action.requires_review = true;
}

// Data inconsistencies
if (lineItemMathError || contradictoryFlags) {
  action.requires_review = true;
  action.notes.push('Data validation issue detected');
}
```

---

## Tips

- **Read the sample data carefully** before coding—there are intentional bugs to find
- The tests tell you expected behavior
- **Flag uncertain scenarios** for review rather than guessing
- Check `types/` for data structure definitions
- **Validate the math**—pricing errors are the most common bugs
- **Amounts in cents**: Billing actions use `amount_in_cents` (e.g., $100.00 = 10000 cents)

Good luck!
