---
id: overview
title: Core Concepts
sidebar_label: Overview
---

# Core Concepts

Understanding PAY.ID requires understanding 5 core primitives: **Identity**, **Context**, **Rules**, **Decision**, and **Decision Proof**.

---

## The Full Flow (with Analogy)

Think of paying with PAY.ID like going through a **customs checkpoint** at an airport:

| Customs | PAY.ID |
|---|---|
| Your passport + travel documents | **Context** — payment details |
| Customs rules & regulations | **Rules** — JSON config in WASM |
| Officer says "you may pass" or "denied" | **Decision** — ALLOW or REJECT |
| Stamped passport | **Decision Proof** — EIP-712 signed proof |
| Airport gate opens | **Smart contract** executes transfer |

```
┌──────────────┐
│   Context    │  ← Who, what asset, how much, when
└──────┬───────┘
       ▼
┌──────────────┐
│    Rules     │  ← JSON config evaluated in WASM
└──────┬───────┘
       ▼
┌──────────────┐
│   Decision   │  ← ALLOW or REJECT
└──────┬───────┘
       ▼
┌─────────────────┐
│ Decision Proof  │  ← EIP-712 signed proof (payer signs)
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Smart Contract  │  ← Verifies proof, transfers or reverts
└─────────────────┘
```

---

## 1. PAY.ID Identity

`pay.id/yourname` is your **payment identity** — not just a wallet address. It carries:
- **Owner** — the wallet that controls the rules
- **Rules** — your active payment policy
- **Metadata** — stored on-chain + IPFS

**PAY.ID ≠ ENS** (ENS = name resolver, just maps names to addresses)
**PAY.ID = payment policy identity** (carries your rules and enforces them)

---

## 2. Context

Context is the **complete description of a payment** — every detail the rules need to make a decision.

### Context V1 (Client Mode — simplest)

Used when your rules only need basic transaction data:

```ts
type RuleContext = {
  tx: {
    sender?: string;   // Payer's wallet address
    receiver?: string; // Receiver's wallet address
    asset: string;     // e.g. "USDC"
    amount: string;    // e.g. "150000000" (150 USDC in 6 decimal format)
    chainId: number;   // e.g. 4202 for Lisk Sepolia
  };
  payId?: { id: string; owner: string; };
  env?: { timestamp: number; }; // Current Unix timestamp
  state?: {
    spentTodayPlusTx: string;   // How much payer has spent today + this tx
    spentThisMonthPlusTx: string;
    dailyLimit: string;
  };
};
```

**Example:** A merchant that only wants USDC, minimum 10 USDC:
```ts
const context = {
  tx: {
    sender: "0xPAYER",
    receiver: "0xMERCHANT",
    asset: "USDC",
    amount: "50000000",  // 50 USDC
    chainId: 4202,
  },
  env: { timestamp: Math.floor(Date.now() / 1000) },
};
```

### Context V2 (Server Mode — for advanced rules)

Extends Context V1 with fields **signed by trusted issuers** (e.g. your backend server):

```ts
type ContextV2 = RuleContext & {
  env?: {
    timestamp: number;
    proof: Attestation;   // ← Server signed this
  };
  state?: {
    spentToday: string;
    period: string;
    proof: Attestation;   // ← Server signed this
  };
  oracle?: {
    country?: string;     // User's country (for geo-blocking)
    kycLevel?: string;    // KYC verification level
    proof: Attestation;   // ← Server signed this
  };
  risk?: {
    score: number;        // 0–100 risk score
    category: string;
    proof: Attestation;
  };
};
```

:::info Client vs Server Mode
**Client mode** — context is built by the payer app. Good for rules that only check `tx.*` fields (asset type, amount, addresses).

**Server mode** — sensitive fields like KYC status or rate limit data are signed by a trusted server. Required for compliance rules. See [Server Example →](../examples/server)
:::

---

## 3. Rules — 3 Formats

Rules are simple JSON. There are 3 formats you can mix and match.

### Format A: SimpleRule — one condition

```json
{
  "id": "usdc_only",
  "if": { "field": "tx.asset", "op": "==", "value": "USDC" },
  "message": "Only USDC accepted"
}
```

### Format B: MultiConditionRule — AND/OR of multiple conditions

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

### Format C: NestedRule — rules inside rules

```json
{
  "id": "vip_or_small",
  "logic": "OR",
  "rules": [
    { "id": "is_vip", "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1..."] } },
    { "id": "small_amount", "if": { "field": "tx.amount", "op": "<=", "value": "10000000" } }
  ]
}
```

→ See [Rule Basics](../rules/rule-basics) for full operator reference.

---

## 4. Decision

After evaluating rules, PAY.ID returns one of two decisions:

| Decision | Meaning |
|---|---|
| `ALLOW` | All rules passed — transaction may proceed |
| `REJECT` | One or more rules failed — transaction is blocked |

### Result Codes

| Code | What It Means |
|---|---|
| `OK` | All rules passed ✅ |
| `RULE_FAILED` | A rule condition evaluated to false |
| `FIELD_NOT_FOUND` | The context is missing a field the rule needs |
| `INVALID_CONFIG` | The rule JSON is malformed |
| `CONTEXT_OR_ENGINE_ERROR` | WASM engine error (shouldn't happen normally) |

---

## 5. Decision Proof

When the decision is ALLOW, PAY.ID generates a cryptographic proof:

```ts
type DecisionProof = {
  payload: {
    payId: string;           // e.g. "pay.id/merchant"
    payer: string;           // Payer's address
    receiver: string;        // Receiver's address
    asset: string;           // Token address
    amount: bigint;          // Amount in token units
    ruleSetHash: string;     // Hash of the rules that were evaluated
    ruleAuthority: string;   // Contract address storing the rules
    issuedAt: number;        // When the proof was created
    expiresAt: number;       // When the proof expires (issuedAt + ttlSeconds)
    nonce: string;           // Random value, prevents replay attacks
    requiresAttestation: boolean;
  };
  signature: string;         // EIP-712 signature from the payer's wallet
};
```

The smart contract verifies:
1. The signature matches the payer's address
2. The `ruleSetHash` matches the merchant's active policy on-chain
3. The proof hasn't expired
4. The proof hasn't been used before (nonce)

---

## 6. Fail-Closed — Safety by Design

PAY.ID **always fails to REJECT** — never to ALLOW — when something goes wrong:

| Condition | Result |
|---|---|
| Rule condition is false | `REJECT` |
| Rule JSON is malformed | `REJECT` |
| WASM engine crashes | `REJECT` |
| Context field is missing | `REJECT` |
| Rule hash doesn't match on-chain | `REJECT` |

This means a bug in your rules will block payments (annoying) instead of allowing unauthorized payments (dangerous). 

---

## 7. Rule NFT & Subscription

Your rules live inside an NFT on the blockchain:

```
subscribe()      → activate your account (tiny ETH fee, 30 day subscription)
createRule()     → register your rule definition (no NFT yet)
activateRule()   → mint the Rule NFT, expiry = your subscription expiry
                   (free tier: 1 slot, subscribed: up to 3 slots)

When subscription expires:
→ Rule NFTs expire → all payments to you REVERT until renewed
```

:::warning Keep Your Subscription Active
If your PAY.ID subscription expires, **all payments to you will fail** on-chain. Set a reminder to renew before the 30-day period ends.
:::
