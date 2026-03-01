---
id: overview
title: Core Concepts
sidebar_label: Overview
---

# Core Concepts

Understanding PAY.ID requires understanding 5 core primitives: **Identity**, **Context**, **Rules**, **Decision**, and **Decision Proof**.

---

## The Flow

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
│ Smart Contract  │  ← Verify proof, transfer or revert
└─────────────────┘
```

---

## 1. PAY.ID Identity

`pay.id/yourname` is your **payment identity** — not just a wallet address. It carries:
- **Owner** — the wallet that owns the rules
- **Rules** — the active payment policy
- **Metadata** — stored on-chain + IPFS

**PAY.ID ≠ ENS** (ENS = name resolver)  
**PAY.ID = payment policy identity**

---

## 2. Context

Context is the **complete description of a payment intent** sent to the rule engine.

### Context V1 (Client Mode)

```ts
type RuleContext = {
  tx: {
    sender?: string;
    receiver?: string;
    asset: string;      // "USDC"
    amount: string;     // "150000000" (6 decimals)
    chainId: number;    // 4202
  };
  payId?: { id: string; owner: string; };
  env?: { timestamp: number; };
  state?: {
    spentTodayPlusTx: string;
    spentThisMonthPlusTx: string;
    dailyLimit: string;
  };
};
```

### Context V2 (Server Mode)

Extends Context V1 with fields **signed by trusted issuers**:

```ts
type ContextV2 = RuleContext & {
  env?: { timestamp: number; proof: Attestation; };
  state?: { spentToday: string; period: string; proof: Attestation; };
  oracle?: { country?: string; kycLevel?: string; proof: Attestation; };
  risk?: { score: number; category: string; proof: Attestation & { modelHash: string }; };
};
```

:::info Client vs Server
**Client mode** — context is filled by the payer. Suitable for rules that only need `tx.*`.

**Server mode** — sensitive fields are signed by a trusted issuer. Required for KYC, rate limiting, etc.
:::

---

## 3. Rules — 3 Formats

### Format A: SimpleRule

```json
{ "id": "min_amount", "if": { "field": "tx.amount", "op": ">=", "value": "100000000" } }
```

### Format B: MultiConditionRule

```json
{ "id": "amount_range", "logic": "AND", "conditions": [
  { "field": "tx.amount", "op": ">=", "value": "100000000" },
  { "field": "tx.amount", "op": "<=", "value": "500000000" }
]}
```

### Format C: NestedRule

```json
{ "id": "vip_or_small", "logic": "OR", "rules": [
  { "id": "is_vip", "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1"] } },
  { "id": "small", "if": { "field": "tx.amount", "op": "<=", "value": "10000000" } }
]}
```

---

## 4. Decision

| Decision | Meaning |
|---|---|
| `ALLOW` | All rules passed — transaction may proceed |
| `REJECT` | One or more rules failed — transaction must be stopped |

### Result Codes

| Code | Condition |
|---|---|
| `OK` | All rules passed |
| `RULE_FAILED` | Rule condition is false |
| `FIELD_NOT_FOUND` | Context field is missing |
| `INVALID_CONFIG` | Rule config is malformed |
| `CONTEXT_OR_ENGINE_ERROR` | WASM / runtime error |

---

## 5. Decision Proof

```ts
type DecisionProof = {
  payload: {
    payId: string; payer: string; receiver: string;
    asset: string; amount: bigint;
    ruleSetHash: string; ruleAuthority: string;
    issuedAt: number; expiresAt: number;
    nonce: string;  // random, replay protection
    requiresAttestation: boolean;
  };
  signature: string; // EIP-712 signature from payer
};
```

---

## 6. Fail-Closed

PAY.ID **always fails to REJECT** — never to ALLOW — when an error occurs:

| Condition | Result |
|---|---|
| Rule condition false | `REJECT` |
| Rule config invalid | `REJECT` |
| WASM runtime error | `REJECT` |
| Context field missing | `REJECT` |
| Hash mismatch | `REJECT` |

---

## 7. Rule NFT & Subscription

```
subscribe()      → activate account (0.0001 ETH / 30 days)
createRule()     → register rule definition (no NFT minted yet)
activateRule()   → mint NFT, expiry = subscriptionExpiry
                   (1 slot without subscription, 3 with)

When subscription expires:
ruleExpiry[tokenId] expired → all payments to receiver: REVERT
```
