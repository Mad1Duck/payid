---
id: server
title: "Example: Server Payment Flow"
sidebar_label: Server Payment Flow
---

# Example: Server Payment Flow

Source: `examples/simple/server.ts`

Server mode is used when rules require **Context V2** — sensitive data (timestamp, spend tracking, oracle, KYC) that must be signed by **trusted issuers**.

---

## When to Use Server Mode

| Use Case | Mode |
|---|---|
| Rules only need `tx.*` | Client ✅ |
| Verified server timestamp | **Server** |
| Spend tracking from database | **Server** |
| KYC / oracle data | **Server** |
| Rule with `requiresAttestation` | **Server** |

---

## Run

```bash
bun examples/simple/server.ts
```

---

## Key Difference: buildContextV2

Context is built with `buildContextV2()`, which adds an **EIP-712 attestation signature** to each sensitive field:

```ts
import { buildContextV2 } from "payid/context";

const contextV2 = await buildContextV2({
  baseContext: {
    tx: { sender: payerWallet.address, receiver: RECEIVER, asset: "USDC", amount: AMOUNT.toString(), chainId: 4202 },
    payId: { id: "pay.id/merchant", owner: RECEIVER },
  },
  env:    { issuer: ENV_ISSUER },
  state:  { issuer: STATE_ISSUER, spentToday: "0", period: "DAY" },
  oracle: { issuer: ORACLE_ISSUER, data: { country: "ID", kycLevel: "2", fxRate: 15600 } },
  risk:   { issuer: RISK_ISSUER, score: 25, category: "LOW", modelHash: "0xhash..." },
});
```

---

## createPayID Server Mode

```ts
import { createPayID } from "payid/server";

const payid = createPayID({
  trustedIssuers: new Set([ENV_ISSUER.address, STATE_ISSUER.address, ORACLE_ISSUER.address]),
});
```

---

## Evaluate + Proof

```ts
const { result, proof } = await payid.evaluateAndProve({
  context: contextV2,
  authorityRule,
  payId: "pay.id/merchant",
  payer: payerWallet.address, receiver: RECEIVER,
  asset: USDC, amount: AMOUNT,
  signer: payerWallet, ttlSeconds: 300,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});
```

---

## Example Rule Requiring Server Mode

```json
{ "version": "1", "logic": "AND", "requires": ["oracle", "risk"], "rules": [
  { "id": "kyc_required", "if": { "field": "oracle.kycLevel", "op": ">=", "value": "2" } },
  { "id": "low_risk_only", "if": { "field": "risk.score", "op": "<=", "value": 50 } },
  { "id": "id_only", "if": { "field": "oracle.country", "op": "==", "value": "ID" } }
]}
```
