# PayID SDK — `payid`

Policy-driven payment engine for EVM chains. Define **rules** that evaluate payment context off-chain, then submit a cryptographic **Decision Proof** on-chain for verification.

## Installation

```bash
bun add payid ethers
# or
npm install payid ethers
```

---

## Quick Start

```typescript
import { PayIDClient } from "payid/client";
import { ethers } from "ethers";

const client = new PayIDClient();

const result = await client.evaluateAndProve({
  context: {
    tx: {
      sender: "0xSender...",
      receiver: "0xReceiver...",
      asset: "0x0000000000000000000000000000000000000000", // native token
      amount: "1000000000000000000", // 1 ETH in wei
      chainId: 42161, // Arbitrum
    },
  },
  authorityRule: myRuleConfig,
  payId: "user@pay.id",
  payer: "0xSender...",
  receiver: "0xReceiver...",
  asset: "0x0000000000000000000000000000000000000000",
  amount: 1_000_000_000_000_000_000n,
  signer: wallet,
  verifyingContract: "0xPayWithPayID...",
  ruleAuthority: "0xRuleAuthority...",
  chainId: 42161,
  blockTimestamp: Math.floor(Date.now() / 1000),
});

if (result.result.decision === "ALLOW") {
  // submit result.proof to PayWithPayID.payNative() on-chain
}
```

---

## Rule Language

Rules define **what conditions must be true** for a payment to be allowed. They are evaluated off-chain, and the outcome is signed into a Decision Proof that the smart contract verifies.

### Rule Config

Every rule set starts with a `RuleConfig`:

```typescript
interface RuleConfig {
  logic: "AND" | "OR"; // how top-level rules are combined
  rules: AnyRule[];    // list of rules
  requires?: string[]; // required context namespaces (e.g. ["state", "risk"])
  message?: string;    // custom message on root rejection
}
```

- **`AND`** — all rules must pass
- **`OR`** — at least one rule must pass
- Max nesting depth: **10 levels**

---

### Rule Formats

There are three rule formats that can be mixed freely.

#### Format A — Simple Rule

One condition, one rule.

```typescript
{
  id: "min-amount",
  if: { field: "tx.amount", op: ">=", value: "100000000000000000" },
  message: "Minimum transfer is 0.1 ETH"
}
```

#### Format B — Multi-Condition Rule

Multiple conditions combined with `AND` / `OR`.

```typescript
{
  id: "business-hours",
  logic: "AND",
  conditions: [
    { field: "env.timestamp|hour", op: ">=", value: "9" },
    { field: "env.timestamp|hour", op: "<",  value: "17" },
  ],
  message: "Transfers only allowed during business hours (9–17 UTC)"
}
```

#### Format C — Nested Rule

Groups of rules combined with `AND` / `OR`. Can be nested up to 10 levels deep.

```typescript
{
  id: "whitelist-or-small",
  logic: "OR",
  rules: [
    { id: "in-whitelist", if: { field: "tx.sender", op: "in", value: ["0xAlice", "0xBob"] } },
    { id: "small-amount", if: { field: "tx.amount", op: "<=", value: "50000000000000000" } }
  ]
}
```

---

### Conditions

```typescript
interface RuleCondition {
  field: string;  // dot-notation path into the context
  op: string;     // operator
  value: any;     // literal value or "$field.reference"
}
```

---

### Fields (Context Paths)

Fields use dot-notation to navigate the payment context.

#### Core Context (`tx`)

| Field | Type | Description |
|---|---|---|
| `tx.amount` | `string` (wei) | Transfer amount in smallest unit |
| `tx.amountUsd` | `string` | USD equivalent (if oracle provided) |
| `tx.asset` | `string` | Token contract address; `0x000...000` for native |
| `tx.sender` | `string` | Sender address |
| `tx.receiver` | `string` | Receiver address |
| `tx.chainId` | `number` | EVM chain ID |

#### Pay.ID Context (`payId`)

| Field | Type | Description |
|---|---|---|
| `payId.id` | `string` | The Pay.ID handle (e.g. `user@pay.id`) |
| `payId.owner` | `string` | Address that owns this Pay.ID |

#### Intent Context (`intent`)

| Field | Type | Description |
|---|---|---|
| `intent.type` | `"QR" \| "DIRECT" \| "API"` | How payment was initiated |
| `intent.expiresAt` | `number` | Unix timestamp when intent expires |
| `intent.issuer` | `string` | Who issued the intent |

#### Environment Context (`env`) — V2

| Field | Type | Description |
|---|---|---|
| `env.timestamp` | `number` | Current block timestamp (Unix seconds) |

#### State Context (`state`) — V2

| Field | Type | Description |
|---|---|---|
| `state.spentToday` | `string` | Total amount spent today (wei) |
| `state.period` | `string` | Current period identifier |

#### Oracle Context (`oracle`) — V2

Custom key-value data from an off-chain oracle. Example: `oracle.ethPrice`, `oracle.gasPrice`.

#### Risk Context (`risk`) — V2

| Field | Type | Description |
|---|---|---|
| `risk.score` | `number` | Risk score 0–1000 |
| `risk.category` | `string` | Risk category label |

---

### Field Transforms

Append `|transform` to a field to transform its value before comparison.

```
"env.timestamp|hour"   → hour of day (0–23)
"tx.amount|div:1e18"   → amount divided by 1e18
```

| Transform | Syntax | Description |
|---|---|---|
| `div` | `field\|div:N` | Divide by N (integer) |
| `mod` | `field\|mod:N` | Modulo N |
| `abs` | `field\|abs` | Absolute value |
| `hour` | `field\|hour` | Hour of day from Unix timestamp (0–23) |
| `day` | `field\|day` | Day of week from Unix timestamp (0=Mon, 6=Sun) |
| `date` | `field\|date` | Day of month (1–31) |
| `month` | `field\|month` | Month of year (1–12) |
| `len` | `field\|len` | String length |
| `lower` | `field\|lower` | Lowercase string |
| `upper` | `field\|upper` | Uppercase string |

---

### Operators

#### Numeric

| Operator | Description | Example |
|---|---|---|
| `>=` | Greater than or equal | `amount >= 1000` |
| `<=` | Less than or equal | `amount <= 50000` |
| `>` | Greater than | `amount > 0` |
| `<` | Less than | `risk.score < 700` |
| `between` | Inclusive range `[min, max]` | `value: ["100", "5000"]` |
| `not_between` | Outside range | `value: ["100", "5000"]` |
| `mod_eq` | `field % divisor == remainder` | `value: ["7", "0"]` (divisible by 7) |
| `mod_ne` | `field % divisor != remainder` | |

#### Equality

| Operator | Description |
|---|---|
| `==` | Loose equality (string + numeric coercion) |
| `!=` | Not equal |
| `in` | Value is in array |
| `not_in` | Value is not in array |

#### String

| Operator | Description |
|---|---|
| `contains` | String contains substring |
| `not_contains` | String does not contain substring |
| `starts_with` | String starts with prefix |
| `ends_with` | String ends with suffix |
| `regex` | Matches regex pattern (ReDoS-safe, max 200 chars) |
| `not_regex` | Does not match regex |

#### Existence

| Operator | Description |
|---|---|
| `exists` | Field is present and not null |
| `not_exists` | Field is absent or null |

---

### Cross-Field References

Prefix a value with `$` to compare against another field in the context.

```typescript
// Reject if spending more than today's limit
{ field: "tx.amount", op: "<=", value: "$state.dailyLimit" }

// Only allow if sender equals the Pay.ID owner
{ field: "tx.sender", op: "==", value: "$payId.owner" }
```

---

### Message Interpolation

Rule messages support `{field}` interpolation using the same dot-notation and transforms.

```typescript
{
  id: "amount-cap",
  if: { field: "tx.amount", op: "<=", value: "1000000000000000000" },
  message: "Rejected: amount {tx.amount} exceeds 1 ETH cap"
}
```

---

## Complete Examples

### 1. Simple Amount Cap

```typescript
const rule: RuleConfig = {
  logic: "AND",
  rules: [
    {
      id: "max-per-tx",
      if: { field: "tx.amount", op: "<=", value: "5000000000000000000" },
      message: "Max 5 ETH per transaction"
    }
  ]
};
```

### 2. Daily Spending Limit

```typescript
const rule: RuleConfig = {
  logic: "AND",
  requires: ["state"],
  rules: [
    {
      id: "daily-limit",
      if: { field: "state.spentToday", op: "<=", value: "10000000000000000000" },
      message: "Daily limit of 10 ETH exceeded"
    }
  ]
};
```

### 3. Business Hours Only

```typescript
const rule: RuleConfig = {
  logic: "AND",
  requires: ["env"],
  rules: [
    {
      id: "business-hours",
      logic: "AND",
      conditions: [
        { field: "env.timestamp|hour", op: ">=", value: "9" },
        { field: "env.timestamp|hour", op: "<",  value: "17" }
      ],
      message: "Transfers only allowed 09:00–17:00 UTC"
    }
  ]
};
```

### 4. Whitelist OR Small Amount

```typescript
const rule: RuleConfig = {
  logic: "AND",
  rules: [
    {
      id: "whitelist-or-small",
      logic: "OR",
      rules: [
        {
          id: "is-whitelisted",
          if: {
            field: "tx.sender",
            op: "in",
            value: ["0xAlice...", "0xBob...", "0xCharlie..."]
          }
        },
        {
          id: "small-amount",
          if: { field: "tx.amount", op: "<=", value: "100000000000000000" }
        }
      ],
      message: "Sender not whitelisted and amount exceeds 0.1 ETH"
    }
  ]
};
```

### 5. Multi-Condition Risk Gate

```typescript
const rule: RuleConfig = {
  logic: "AND",
  requires: ["risk"],
  rules: [
    {
      id: "risk-gate",
      logic: "AND",
      conditions: [
        { field: "risk.score",    op: "<",  value: "700" },
        { field: "risk.category", op: "!=", value: "SANCTIONED" }
      ],
      message: "Payment blocked: risk score too high or sender sanctioned"
    }
  ]
};
```

### 6. Recurring Payment (Weekdays Only)

```typescript
const rule: RuleConfig = {
  logic: "AND",
  requires: ["env"],
  rules: [
    {
      id: "weekday-only",
      // day transform: 0=Mon, 4=Fri, 5=Sat, 6=Sun
      logic: "AND",
      conditions: [
        { field: "env.timestamp|day", op: ">=", value: "0" },
        { field: "env.timestamp|day", op: "<=", value: "4" }
      ],
      message: "Only weekday payments allowed"
    }
  ]
};
```

---

## Evaluate Only (No Proof)

```typescript
import { evaluate } from "payid";

const result = await evaluate(context, ruleConfig);
// result.decision === "ALLOW" | "REJECT"
// result.code     — rule ID that triggered the decision
// result.reason   — human-readable message
```

---

## Server-Side Usage

```typescript
import { PayIDServer } from "payid/server";
import { ethers } from "ethers";

const server = new PayIDServer(
  new ethers.Wallet(process.env.SIGNER_KEY!),
  new Set(["0xTrustedIssuer..."])  // trusted attestation issuers
);

const { result, proof } = await server.evaluateAndProve({
  context,
  authorityRule: ruleConfig,
  payId: "merchant@pay.id",
  payer: "0xPayer...",
  receiver: "0xMerchant...",
  asset: "0x0000000000000000000000000000000000000000",
  amount: 1_000_000_000_000_000_000n,
  verifyingContract: "0xPayWithPayID...",
  ruleAuthority: "0xRuleAuthority...",
  chainId: 42161,
  blockTimestamp: Math.floor(Date.now() / 1000),
});
```

---

## Exports

| Import path | Contents |
|---|---|
| `payid` | `evaluate()` |
| `payid/client` | `PayIDClient` |
| `payid/server` | `PayIDServer` |
| `payid/decision-proof` | `generateDecisionProof()` |
| `payid/rule` | `combineRules()`, `canonicalizeRuleSet()` |
| `payid/issuer` | `signAttestation()` |
| `payid/context` | Context types |
| `payid/sessionPolicy` | `decodeSessionPolicy()`, `decodeSessionPolicyV2()` |

---

## Limits

| Constraint | Value |
|---|---|
| Max rule nesting depth | 10 levels |
| Max regex pattern length | 200 chars |
| Nested quantifiers in regex | Rejected (ReDoS protection) |
| Decision Proof TTL (default) | 300 seconds |
| Decision Proof TTL (max recommended) | 3600 seconds |
