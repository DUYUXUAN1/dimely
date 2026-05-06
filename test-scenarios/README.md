# Test Scenarios

Your implementation must handle **two order types**. Here's the business context and technical requirements for each.

> ⚠️ **Important**: The sample data files contain **intentional errors** that your parser should detect. Real-world Sales data is messy—your system should catch mistakes before they become billing problems.

---

## ⚠️ Critical: Pricing Conventions

Before implementing, understand these formulas:

| Billing Period | Formula |
|----------------|---------|
| `one_time` | `total_price = quantity × unit_price` |
| `monthly` | `total_price = quantity × unit_price × contract_months` |
| `quarterly` | `total_price = quantity × unit_price × (contract_months / 3)` |
| `annually` | `total_price = quantity × unit_price × contract_years` |

**Example:** A 12-month contract with $1,000/month subscription:
- `unit_price: 1000`
- `total_price: 12000` (not 1000!)

---

## 1. New Business Orders

### Business Context
Sales just closed a **new logo**—a customer who's never used the product before. Everything needs to be created from scratch.

### Sample Files
- `new-business-simple.json` - Basic case: one subscription + one setup fee
- `new-business-opportunity.json` - Complex: multiple subscriptions, services, setup fees

### What Your System Should Do
1. **Create account** in billing system with contact/billing info
2. **Create subscription(s)** for recurring items (monthly/quarterly/annual)
3. **Process one-time charges** (setup fees, professional services)
4. **Validate** that line items sum to opportunity amount

### Key Validation
- For `one_time` items: `quantity × unit_price = total_price`
- For `monthly` items: `quantity × unit_price × contract_months = total_price`
- All line item `total_price` values should sum to `amount`
- Contract dates should be valid (end after start)

---

## 2. Conversion Orders

### Business Context
**Self-service customer upgrading to enterprise.** This is the most complex:

- They're paying ~$199/mo by credit card
- They want to switch to $5,000+/mo with invoice billing
- We need to refund unused time from their current period
- Cancel old subscription, create new one
- Zero service interruption

### Sample File
- `conversion-order-opportunity.json`
- Uses mock data: `mock-apis/recurly-account-delta-innovations-ss.json`

### What Your System Should Do
1. **Load existing self-service state**
2. **Calculate refund** for unused subscription time
3. **Cancel** existing self-service subscription(s)
4. **Create** new enterprise subscription
5. **Update payment method** (automatic → invoice)
6. **Validate** refund calculation matches days

### Key Validation
- `days_in_period` should match actual month length (Oct = 31 days, not 30)
- `refund_amount` should equal `original_amount × (days_unused / days_in_period)`
- Cancellation date should align with conversion timing

### Refund Math
```
Daily rate = monthly_amount / days_in_month
Refund = daily_rate × days_unused
```
Example: $199/mo in October (31 days), 23 days unused
```
Daily rate = $199 / 31 = $6.42
Refund = $6.42 × 23 = $147.65
```

---

## Mock API Usage

For conversion orders, load mock data to simulate existing billing state:

```typescript
// conversion-order-opportunity.json has: "recurly_account_code": "delta_innovations_ss"
// Load: mock-apis/recurly-account-delta-innovations-ss.json

const existingState = loadMockData('delta_innovations_ss');
const actions = engine.generateActions(opportunity, existingState);
```

---

## Output Format

For each opportunity, generate a review sheet:

```typescript
interface ReviewSheet {
  opportunity_id: string;
  opportunity_name: string;
  account_name: string;
  total_actions: number;
  high_risk_actions: number;
  estimated_total_impact: number;  // in cents
  billing_actions: BillingAction[];
  summary: string;
  warnings: string[];
  manual_review_required: boolean;
  generated_at: string;  // ISO timestamp
}
```

### Complete Example Output

Here's what a complete review sheet should look like for a new business opportunity:

```json
{
  "opportunity_id": "opp_simple_001",
  "opportunity_name": "Simple Corp - New Business",
  "account_name": "Simple Corp",
  "total_actions": 3,
  "high_risk_actions": 0,
  "estimated_total_impact": 1700000,
  "billing_actions": [
    {
      "type": "create_account",
      "description": "Create new Recurly account for Simple Corp",
      "details": {
        "account_code": "simple_corp",
        "email": "billing@simplecorp.com",
        "company_name": "Simple Corp",
        "billing_address": {
          "address1": "123 Simple St",
          "city": "San Francisco",
          "state": "CA",
          "zip": "94105",
          "country": "US"
        }
      },
      "requires_review": false,
      "risk_level": "low"
    },
    {
      "type": "create_subscription",
      "description": "Create monthly subscription for Professional Plan",
      "details": {
        "plan_code": "PRO_PLAN",
        "unit_amount_in_cents": 100000,
        "quantity": 1,
        "collection_method": "manual",
        "net_terms": 30,
        "starts_at": "2024-11-01"
      },
      "amount_in_cents": 100000,
      "effective_date": "2024-11-01",
      "requires_review": false,
      "risk_level": "low"
    },
    {
      "type": "charge_one_time",
      "description": "One-time setup fee",
      "details": {
        "charge_code": "SETUP_FEE",
        "description": "One-time setup and onboarding"
      },
      "amount_in_cents": 500000,
      "effective_date": "2024-11-01",
      "requires_review": false,
      "risk_level": "low"
    }
  ],
  "summary": "New business order: 3 billing actions totaling $17,000.00",
  "warnings": [],
  "manual_review_required": false,
  "generated_at": "2024-10-15T14:30:00.000Z"
}
```

### BillingAction Details Structure

Each action type has expected `details` fields:

| Action Type | Expected Details Fields |
|-------------|------------------------|
| `create_account` | `account_code`, `email`, `company_name`, `billing_address` |
| `create_subscription` | `plan_code`, `unit_amount_in_cents`, `quantity`, `collection_method`, `net_terms`, `starts_at` |
| `cancel_subscription` | `subscription_uuid`, `cancel_at`, `refund_type` |
| `charge_one_time` | `charge_code`, `description` |
| `apply_credit` | `credit_type`, `reason`, `original_subscription` |
| `update_account` | `collection_method`, `net_terms`, `billing_info_update` |

---

## Validation Checklist

Your parser should catch:

- [ ] Line item totals don't sum to opportunity amount
- [ ] Math errors: pricing formulas don't match (see conventions above)
- [ ] Invalid dates: end before start
- [ ] `is_new_service: true` with `replaces_self_service: true` (contradiction)
- [ ] `days_in_period` doesn't match actual month length
- [ ] Refund math doesn't match days calculation
- [ ] Missing required fields for order type

---

## Output Amounts

All monetary values in `BillingAction` should be in **cents** (not dollars):

```typescript
// $1,234.56 should be represented as:
amount_in_cents: 123456

// $5,000.00 should be represented as:
amount_in_cents: 500000
```

This is standard practice for billing systems to avoid floating-point precision issues.
