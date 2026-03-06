---
id: server
title: "Example: Server Payment Flow"
sidebar_label: Server Payment Flow
---

# Example: Server Payment Flow

Source: `examples/simple/server.ts`

Server mode adds **Context V2** — sensitive payment data (verified timestamp, spend tracking, KYC, oracle data) that must be signed by **trusted issuers** before the rule engine will accept them.

---

## When to Use Server Mode

| Use Case | Mode |
|---|---|
| Rules only check `tx.*` fields | Client ✅ |
| Server-verified timestamp | **Server** |
| Spend tracking from your database | **Server** |
| KYC status / oracle data | **Server** |
| Geoblocking (`oracle.country`) | **Server** |
| Rule with `"requires": ["oracle"]` | **Server** |

---

## Run

```bash
bun examples/simple/server.ts
```

---

## Key Difference: `buildContextV2`

In client mode, the payer builds context themselves. In server mode, your backend **attaches signed attestations** to each sensitive field. The rule engine rejects any attestation that isn't signed by a trusted issuer.

```ts
import { buildContextV2 } from "payid/context";
import { ethers }          from "ethers";

// These signers live on YOUR BACKEND — never expose their private keys to clients
const envSigner    = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY!, provider);
const stateSigner  = envSigner;   // can reuse same signer for all fields
const oracleSigner = envSigner;

const contextV2 = await buildContextV2({
  baseContext: {
    tx: {
      sender:   payerWallet.address,
      receiver: RECEIVER,
      asset:    USDC_ADDRESS,
      amount:   AMOUNT.toString(),
      chainId:  Number(process.env.CHAIN_ID),
    },
    env: {
      timestamp: Math.floor(Date.now() / 1000),
    },
  },
  // Each field gets an EIP-712 attestation signed by the respective issuer
  env: {
    issuer: envSigner,
  },
  state: {
    issuer:      stateSigner,
    spentToday:  await getSpentToday(payerWallet.address),  // from your DB
    period:      new Date().toISOString().slice(0, 10),     // "2025-01-15"
  },
  oracle: {
    issuer: oracleSigner,
    data:   {
      country:  await getCountry(payerWallet.address),   // e.g. "ID"
      kycLevel: await getKYCLevel(payerWallet.address),  // e.g. "2"
    },
  },
});
```

---

## Initialize SDK in Server Mode

```ts
import { createPayID } from "payid/server";

const payid = createPayID({
  // List every issuer address whose attestations you trust
  trustedIssuers: new Set([
    envSigner.address,
    stateSigner.address,
    oracleSigner.address,
  ]),
});
await payid.ready();
```

:::warning
If an issuer address is not in `trustedIssuers`, the SDK will reject any attestation signed by that address — and evaluation will fail with `FIELD_NOT_FOUND` or `CONTEXT_OR_ENGINE_ERROR` for the affected fields.
:::

---

## Evaluate + Generate Proof

Same as client mode, but pass `contextV2` instead of the plain context:

```ts
const blockTimestamp = Math.floor(Date.now() / 1000);

const { result, proof } = await payid.evaluateAndProve({
  context:            contextV2,   // ← V2 with attestations
  authorityRule,
  payId:              "pay.id/merchant",
  payer:              payerWallet.address,
  receiver:           RECEIVER,
  asset:              USDC_ADDRESS,
  amount:             AMOUNT,
  signer:             payerWallet,
  verifyingContract:  process.env.PAYID_VERIFIER!,
  ruleAuthority:      process.env.COMBINED_RULE_STORAGE!,
  ruleSetHashOverride: ruleSetHash,
  chainId:            Number(process.env.CHAIN_ID),
  blockTimestamp,
  ttlSeconds:         300,
});

if (result.decision === "REJECT") {
  throw new Error(`Payment rejected: ${result.reason ?? result.code}`);
}
```

---

## Example Rule Requiring Server Mode

Rules that use `oracle.*`, `state.*`, or `risk.*` must declare them in `"requires"`:

```json
{
  "version": "1",
  "logic": "AND",
  "requires": ["oracle", "state"],
  "rules": [
    {
      "id": "kyc_required",
      "if": { "field": "oracle.kycLevel", "op": ">=", "value": "2" },
      "message": "KYC level 2 or higher required"
    },
    {
      "id": "id_only",
      "if": { "field": "oracle.country", "op": "==", "value": "ID" },
      "message": "Only Indonesian users accepted"
    },
    {
      "id": "daily_limit",
      "if": { "field": "state.spentToday", "op": "<=", "value": "500000000" },
      "message": "Daily spending limit of 500 USDC exceeded"
    }
  ]
}
```

The `"requires"` array tells the rule engine which context modules to verify before evaluation. If `oracle` is declared but the context has no valid `oracle` attestation, evaluation fails with `FIELD_NOT_FOUND`.

---

## Typical Architecture

```
[Client browser]                  [Your backend server]
     │                                    │
     │── POST /api/prepare-payment ──────►│
     │                                    │── buildContextV2()
     │                                    │   (signs env, state, oracle)
     │◄── { contextV2, ruleSetHash } ─────│
     │
     │── evaluateAndProve(contextV2, ...)  ← runs in browser
     │── payERC20(proof.payload, sig, [])
```

The backend attaches attestations. The payer still signs the final proof with their own wallet in the browser — your server never touches their private key.

---

## Notes

**Never expose issuer private keys to clients.** The `buildContextV2` call and the issuer signers must stay on your server.

**Context V2 attestations expire.** Each attestation includes a short TTL. The `buildContextV2` function sets a default TTL of a few minutes. Don't cache contextV2 objects across requests.

**Mixing V1 and V2 context.** You can pass a plain `RuleContext` to server-mode `evaluateAndProve` — the SDK will just skip attestation verification for any missing modules.
