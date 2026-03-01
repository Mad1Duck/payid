---
id: sdk-reference
title: Referensi SDK
sidebar_label: SDK Reference
---

# Referensi SDK

Package: `@payid/sdk-core`

---

## `createPayID(params)`

Factory function — entry point utama SDK.

```ts
import { createPayID } from "payid/client";   // client mode
import { createPayID } from "payid/server";   // server mode

function createPayID(params: {
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;
}): PayIDClient & PayIDServer
```

---

## `payid.evaluate(context, rule)`

Evaluasi murni — tanpa signing, tanpa server.

```ts
const result = await payid.evaluate(context, ruleConfig);
// { decision: "ALLOW", code: "OK" }
// { decision: "REJECT", code: "RULE_FAILED", reason: "min_amount" }
```

---

## `payid.evaluateAndProve(params)`

Evaluate + generate EIP-712 Decision Proof. Payer menandatangani dengan wallet mereka sendiri.

```ts
const { result, proof } = await payid.evaluateAndProve({
  context, authorityRule,
  payId: "pay.id/merchant",
  payer: "0xPAYER", receiver: "0xRECEIVER",
  asset: USDC_ADDRESS, amount: 150_000_000n,
  signer, ttlSeconds: 300,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

if (!proof) throw new Error(`Ditolak: ${result.reason}`);
await payContract.payERC20(proof.payload, proof.signature, []);
```

`proof` bernilai `null` jika `result.decision === "REJECT"`.

---

## Result Codes

| Code | Kondisi |
|---|---|
| `OK` | Semua rules pass |
| `RULE_FAILED` | Kondisi rule false |
| `FIELD_NOT_FOUND` | Context field tidak ada |
| `INVALID_CONFIG` | Rule config malformed |
| `CONTEXT_OR_ENGINE_ERROR` | Error WASM / runtime |
