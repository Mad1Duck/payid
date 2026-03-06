---
id: server
title: "Contoh: Server Payment Flow"
sidebar_label: Server Payment Flow
---

# Contoh: Server Payment Flow

Source: `examples/simple/server.ts`

Server mode menambahkan **Context V2** — data payment sensitif (timestamp terverifikasi, spend tracking, KYC, oracle) yang harus ditandatangani oleh **trusted issuers**.

---

## Perbedaan Utama: `buildContextV2`

```ts
import { buildContextV2 } from "payid/context";

// Signer-signer ini ada di BACKEND kamu — jangan expose private key ke client
const contextV2 = await buildContextV2({
  baseContext: {
    tx: { sender: payerWallet.address, receiver: RECEIVER, asset: USDC_ADDRESS, amount: AMOUNT.toString(), chainId: 31337 },
    env: { timestamp: Math.floor(Date.now() / 1000) },
  },
  env:    { issuer: envSigner },
  state:  { issuer: stateSigner, spentToday: await getSpentToday(payerWallet.address), period: new Date().toISOString().slice(0, 10) },
  oracle: { issuer: oracleSigner, data: { country: "ID", kycLevel: "2" } },
});
```

---

## Inisialisasi SDK Server Mode

```ts
import { createPayID } from "payid/server";

const payid = createPayID({
  trustedIssuers: new Set([envSigner.address, stateSigner.address, oracleSigner.address]),
});
await payid.ready();
```

---

## Evaluate + Proof

```ts
const { result, proof } = await payid.evaluateAndProve({
  context:            contextV2,
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
  chainId:            31337,
  blockTimestamp:     Math.floor(Date.now() / 1000),
  ttlSeconds:         300,
});
```

---

## Contoh Rule yang Butuh Server Mode

```json
{
  "version": "1",
  "logic": "AND",
  "requires": ["oracle", "state"],
  "rules": [
    { "id": "kyc_required", "if": { "field": "oracle.kycLevel", "op": ">=", "value": "2" }, "message": "KYC level 2 dibutuhkan" },
    { "id": "indonesia_only", "if": { "field": "oracle.country", "op": "==", "value": "ID" }, "message": "Hanya pengguna Indonesia" },
    { "id": "daily_limit", "if": { "field": "state.spentToday", "op": "<=", "value": "500000000" }, "message": "Limit harian 500 USDC terlampaui" }
  ]
}
```

---

## Arsitektur Tipikal

```
[Browser client]                    [Backend server kamu]
     │                                       │
     │── POST /api/prepare-payment ─────────►│
     │                                       │── buildContextV2()
     │                                       │   (sign env, state, oracle)
     │◄── { contextV2, ruleSetHash } ────────│
     │
     │── evaluateAndProve(contextV2, ...)   ← jalan di browser
     │── payERC20(proof.payload, sig, [])
```

Backend lampirkan attestation. Payer tetap sign proof akhir dengan wallet mereka di browser — server tidak pernah menyentuh private key mereka.
