---
id: sdk-reference
title: SDK Reference
sidebar_label: SDK Reference
---

# SDK Reference

Package: `payid`

Subpath exports: `payid/client` · `payid/server` · `payid/sessionPolicy` · `payid/context` · `payid/rule`

---

## `createPayID(params)`

Factory function — entry point utama SDK. Import dari `payid/client` untuk browser/Node, atau `payid/server` untuk backend dengan trusted issuers.

```ts
import { createPayID } from "payid/client";   // client mode
import { createPayID } from "payid/server";   // server mode

createPayID(params: {
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;  // server mode only
}): PayIDClient
```

---

## `payid.ready()`

Tunggu WASM rule engine selesai loading. Harus dipanggil sebelum `evaluate()` atau `evaluateAndProve()`.

```ts
await payid.ready();
```

---

## `payid.evaluate(context, rule)`

Evaluasi rule murni — tanpa signing, tanpa network call.

```ts
const result = await payid.evaluate(context, ruleConfig);
// { decision: "ALLOW", code: "OK" }
// { decision: "REJECT", code: "RULE_FAILED", reason: "min_amount" }
```

---

## `payid.evaluateAndProve(params)`

Evaluasi rules dan generate EIP-712 Decision Proof. Payer sign dengan wallet mereka sendiri. Return `proof: null` kalau decision-nya `REJECT`.

```ts
async evaluateAndProve(params: {
  context:          RuleContext;
  authorityRule:    RuleConfig;
  payId:            string;
  payer:            string;
  receiver:         string;
  asset:            string;
  amount:           bigint;
  signer:           ethers.Signer;
  verifyingContract: string;    // PayIDVerifier address
  ruleAuthority:    string;     // CombinedRuleStorage address
  ruleSetHashOverride?: string; // pass activeRuleSetHash dari chain
  chainId:          number;
  blockTimestamp:   number;     // Math.floor(Date.now() / 1000)
  ttlSeconds?:      number;     // default 300 detik
}): Promise<{ result: RuleResult; proof: DecisionProof | null }>
```

:::warning blockTimestamp wajib diisi
Selalu pass `blockTimestamp: Math.floor(Date.now() / 1000)`. Digunakan untuk kalkulasi expiry proof.
:::

---

## `buildContextV2(params)`

Build Context V2 dengan server-signed attestations. **Server mode only.**

```ts
import { buildContextV2 } from "payid/context";

const contextV2 = await buildContextV2({
  baseContext: { tx: { ... } },
  env:    { issuer: envSigner },
  state:  { issuer: stateSigner, spentToday: "0", period: "DAY" },
  oracle: { issuer: oracleSigner, data: { country: "ID", kycLevel: "2" } },
  risk:   { issuer: riskSigner, score: 25, category: "LOW", modelHash: "0x..." },
});
```

---

## `createSessionPolicyV2(params)`

Buat Channel A session policy — ditandatangani oleh **receiver** dengan constraint pembayaran mereka. Digunakan untuk generate QR code.

```ts
import { createSessionPolicyV2 } from "payid/sessionPolicy";

const policy = await createSessionPolicyV2({
  receiver: merchantAddress, ruleSetHash, ruleAuthority,
  allowedAsset: usdcAddress, maxAmount: 50_000_000n,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  payId: "pay.id/merchant", chainId: 31337,
  verifyingContract: PAYID_VERIFIER, signer: merchantSigner,
});
```

---

## `encodeSessionPolicyV2QR` / `decodeSessionPolicyV2QR`

Encode/decode `SessionPolicyV2` ke/dari string QR (`"payid-v2:<base64url>"`).

```ts
import { encodeSessionPolicyV2QR, decodeSessionPolicyV2QR } from "payid/sessionPolicy";

// Sisi merchant — encode ke QR payload
const qrString = encodeSessionPolicyV2QR(policy);

// Sisi payer — decode dari QR yang discan
const policy = decodeSessionPolicyV2QR(qrString);
```

---

## Types

### `RuleContext`

```ts
interface RuleContext {
  tx: {
    sender?:   string;
    receiver?: string;
    asset:     string;   // token address atau symbol
    amount:    string;   // dalam satuan terkecil token (sebagai string)
    chainId:   number;
  };
  payId?: { id: string; owner: string };
  env?:   { timestamp: number };
  state?: { spentToday?: string; period?: string };
}
```

### `DecisionProof`

```ts
interface DecisionProof {
  payload: {
    version:             string;
    payId:               string;
    payer:               string;
    receiver:            string;
    asset:               string;
    amount:              bigint;
    contextHash:         string;
    ruleSetHash:         string;    // harus match hash aktif merchant di chain
    ruleAuthority:       string;
    issuedAt:            number;
    expiresAt:           number;
    nonce:               string;    // random, mencegah replay
    requiresAttestation: boolean;
  };
  signature: string;  // EIP-712 signature dari wallet payer
}
```

---

## Result Codes

| Code | Kondisi |
|---|---|
| `OK` | Semua rules lolos |
| `RULE_FAILED` | Kondisi rule bernilai false |
| `FIELD_NOT_FOUND` | Field context yang direferensikan rule tidak ada |
| `INVALID_CONFIG` | JSON rule malformed |
| `CONTEXT_OR_ENGINE_ERROR` | Error WASM / runtime |
| `INVALID_ENGINE_OUTPUT` | Format output WASM tidak terduga |
