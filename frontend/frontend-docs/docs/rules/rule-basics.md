---
id: rule-basics
title: Rule Basics
sidebar_label: Rule Basics
---

# Rule Basics

A rule is a **JSON config** evaluated by the WASM engine. Think of it like a bouncer's checklist: each rule is one question the bouncer asks before letting the payment through.

PAY.ID supports 3 rule formats that can be freely combined.

---

## Format A: SimpleRule — One Condition

The most basic format. Ask one question about the payment.

```ts
interface SimpleRule {
  id: string;
  if: { field: string; op: string; value: any; };
  message?: string; // shown when the rule blocks a payment
}
```

**Example — only accept USDC:**
```json
{
  "id": "usdc_only",
  "if": { "field": "tx.asset", "op": "==", "value": "USDC" },
  "message": "Only USDC accepted"
}
```

**Example — minimum 10 USDC:**
```json
{
  "id": "min_amount",
  "if": { "field": "tx.amount", "op": ">=", "value": "10000000" },
  "message": "Minimum payment is 10 USDC"
}
```

:::tip Decimal Note
Amounts use the token's decimal precision. USDC has 6 decimals, so 10 USDC = `"10000000"` (10 × 10⁶).
:::

---

## Format B: MultiConditionRule — AND/OR of Conditions

Check multiple conditions at once with `"logic": "AND"` or `"logic": "OR"`.

**Example — amount must be between 10 and 500 USDC (both must pass → AND):**
```json
{
  "id": "amount_range",
  "logic": "AND",
  "conditions": [
    { "field": "tx.amount", "op": ">=", "value": "10000000" },
    { "field": "tx.amount", "op": "<=", "value": "500000000" }
  ],
  "message": "Amount must be between 10 and 500 USDC"
}
```

**Example — accept USDC or USDT (either passes → OR):**
```json
{
  "id": "stablecoins",
  "logic": "OR",
  "conditions": [
    { "field": "tx.asset", "op": "==", "value": "USDC" },
    { "field": "tx.asset", "op": "==", "value": "USDT" }
  ],
  "message": "Only stablecoins accepted"
}
```

---

## Format C: NestedRule — Rules Inside Rules

For complex logic, you can nest rules inside each other.

**Example — VIP customers can send any amount, others are limited to 50 USDC:**
```json
{
  "id": "vip_or_small",
  "logic": "OR",
  "rules": [
    {
      "id": "is_vip",
      "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1...", "0xVIP2..."] }
    },
    {
      "id": "small_amount",
      "if": { "field": "tx.amount", "op": "<=", "value": "50000000" }
    }
  ]
}
```

---

## The Root RuleConfig

Your rules are wrapped in a root `RuleConfig` object that defines the overall logic:

```ts
interface RuleConfig {
  version?: string;        // Optional version tag
  logic: "AND" | "OR";    // How top-level rules combine
  rules: AnyRule[];        // Array of SimpleRule, MultiConditionRule, or NestedRule
  requires?: string[];     // Context modules needed: ["oracle", "risk", "state"]
  message?: string;        // Fallback message
}
```

**Full merchant policy example:**
```json
{
  "version": "1",
  "logic": "AND",
  "rules": [
    {
      "id": "usdc_only",
      "if": { "field": "tx.asset", "op": "==", "value": "USDC" }
    },
    {
      "id": "min_amount",
      "if": { "field": "tx.amount", "op": ">=", "value": "10000000" }
    },
    {
      "id": "amount_range",
      "logic": "AND",
      "conditions": [
        { "field": "tx.amount", "op": ">=", "value": "10000000" },
        { "field": "tx.amount", "op": "<=", "value": "500000000" }
      ]
    }
  ]
}
```

All 3 rules must pass (AND logic) for the payment to be ALLOWED.

---

## Operators Reference

| Operator | Works On | Example |
|---|---|---|
| `==` | Any value | `asset == "USDC"` |
| `!=` | Any value | `asset != "ETH"` |
| `>=` | Number or string | `amount >= "100000000"` |
| `<=` | Number or string | `amount <= "5000000000"` |
| `in` | Array of values | `asset in ["USDC","USDT"]` |
| `not_in` | Array of values | `chainId not_in [56, 97]` |
| `between` | `[min, max]` | `timestamp between [8, 22]` |
| `not_between` | `[min, max]` | `timestamp not_between [23, 6]` |

---

## Field Paths Reference

These are the fields you can use in your rules:

| Field | Description | Example Value |
|---|---|---|
| `tx.sender` | Payer's wallet address | `"0xAbCd..."` |
| `tx.receiver` | Receiver's wallet address | `"0x1234..."` |
| `tx.asset` | Token symbol | `"USDC"` |
| `tx.amount` | Amount in token units (string) | `"150000000"` |
| `tx.chainId` | Blockchain network ID | `4202` |
| `payId.id` | The payment identity string | `"pay.id/merchant"` |
| `payId.owner` | Owner of the PAY.ID | `"0xOwner..."` |
| `env.timestamp` | Current Unix timestamp | `1700000000` |
| `state.spentToday` | Amount spent today (from server) | `"50000000"` |
| `state.dailyLimit` | Daily spending limit | `"500000000"` |
| `oracle.country` | User's country (from server) | `"ID"` |
| `oracle.kycLevel` | KYC verification level | `"2"` |
| `risk.score` | Risk score 0–100 (from server) | `15` |
| `risk.category` | Risk category (from server) | `"low"` |

Fields under `state.*`, `oracle.*`, and `risk.*` require **Server Mode** and must be declared in `requires`:
```json
{ "version": "1", "logic": "AND", "requires": ["oracle", "state"], "rules": [...] }
```

---

## Cross-field References

A rule value can reference another field by prefixing it with `$`:

```json
{
  "id": "within_daily_limit",
  "if": {
    "field": "state.spentTodayPlusTx",
    "op": "<=",
    "value": "$state.dailyLimit"
  },
  "message": "Daily spending limit exceeded"
}
```

This rule passes if today's total spending (including this transaction) doesn't exceed the daily limit.

---

## Rule Hashing

Rules are stored on IPFS and their hash is recorded on-chain. To ensure deterministic hashing, always canonicalize (sort keys alphabetically) before hashing:

```ts
function canonicalize(obj: any): string {
  if (Array.isArray(obj))
    return `[${obj.map(canonicalize).join(",")}]`;
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj).sort()
      .map(k => `"${k}":${canonicalize(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(obj);
}

// Hash the rule for on-chain storage
const ruleHash = keccak256(toUtf8Bytes(canonicalize(ruleObject)));
```

:::warning Order Matters
`{"id":"a","if":{...}}` and `{"if":{...},"id":"a"}` produce **different hashes**. Always canonicalize first.
:::
