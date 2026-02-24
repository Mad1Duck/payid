---
id: server
title: "Example: Server Payment Flow"
sidebar_label: Server Payment Flow
---

# Example: Server Payment Flow

Source: `examples/simple/server.ts`

Server mode digunakan saat rules membutuhkan **Context V2** — data sensitif (timestamp, spent tracking, oracle, KYC) yang harus ditandatangani oleh **trusted issuers**.

---

## Kapan Pakai Server Mode

| Use Case | Mode |
|---|---|
| Rules hanya `tx.*` | Client mode ✅ |
| `env.timestamp` dari server yang verified | **Server mode** |
| Spent tracking dari database | **Server mode** |
| KYC/oracle data | **Server mode** |
| Rule dengan `requiresAttestation` | **Server mode** |

---

## Jalankan

```bash
bun examples/simple/server.ts
```

---

## Perbedaan Utama: buildContextV2

Di server mode, context dibuat dengan `buildContextV2()` yang secara otomatis menambahkan **EIP-712 attestation signature** ke setiap field sensitif:

```ts
import { buildContextV2 } from "payid/context";

const contextV2 = await buildContextV2({
  baseContext: {
    tx: {
      sender: payerWallet.address,
      receiver: RECEIVER,
      asset: "USDC",
      amount: AMOUNT.toString(),
      chainId: 4202,
    },
    payId: { id: "pay.id/merchant", owner: RECEIVER },
  },
  // Setiap field di bawah di-sign oleh issuer wallet
  env:    { issuer: ENV_ISSUER },
  state:  { issuer: STATE_ISSUER, spentToday: "0", period: "DAY" },
  oracle: { issuer: ORACLE_ISSUER, data: { country: "ID", kycLevel: "2", fxRate: 15600 } },
  risk:   { issuer: RISK_ISSUER, score: 25, category: "LOW", modelHash: "0xhash..." },
});
```

Hasil `contextV2` memiliki `.proof` di setiap field:

```ts
contextV2.env.timestamp    // Unix timestamp
contextV2.env.proof        // { issuer, issuedAt, expiresAt, signature }

contextV2.state.spentToday // "150000000"
contextV2.state.proof      // { issuer, issuedAt, expiresAt, signature }

contextV2.oracle.country   // "ID"
contextV2.oracle.proof     // { issuer, issuedAt, expiresAt, signature }

contextV2.risk.score       // 25
contextV2.risk.category    // "LOW"
contextV2.risk.proof       // { issuer, issuedAt, expiresAt, signature, modelHash }
```

---

## createPayID Server Mode

```ts
import { createPayID } from "payid/server";

// Di production: gunakan HSM/KMS bukan plain wallet
const ENV_ISSUER    = new ethers.Wallet(ISSUER_PK, provider);
const STATE_ISSUER  = new ethers.Wallet(ISSUER_PK, provider);
const ORACLE_ISSUER = new ethers.Wallet(ISSUER_PK, provider);
const RISK_ISSUER   = new ethers.Wallet(ISSUER_PK, provider);

const payid = createPayID({
  wasm,
  signer: payerWallet,   // untuk sign Decision Proof
  trustedIssuers: new Set([
    ENV_ISSUER.address,
    STATE_ISSUER.address,
    ORACLE_ISSUER.address,
    RISK_ISSUER.address,
  ]),
});
```

:::warning Jangan Pass Empty Set
`new Set([])` = tidak ada issuer dipercaya → semua attestation ditolak. Kalau tidak butuh trusted issuers, omit sama sekali.
:::

---

## Evaluate + Proof di Server Mode

Identik dengan client mode — bedanya `context` sudah V2 dengan attestations:

```ts
const { result, proof } = await payid.evaluateAndProve({
  context: contextV2,     // ← Context V2 bukan V1
  authorityRule,
  payId: "pay.id/merchant",
  payer: payerWallet.address,
  receiver: RECEIVER,
  asset: USDC,
  amount: AMOUNT,
  ttlSeconds: 60,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  // ↑ tidak perlu 'signer' di sini, sudah di-inject saat createPayID
});
```

---

## Verifikasi Attestation

Saat `evaluateAndProve()` dipanggil dengan `trustedIssuers` aktif, SDK otomatis verifikasi setiap attestation:

```
preprocessContextV2():
  ├── context.env.proof → verifyAttestation(issuer, signature) ✅
  ├── context.state.proof → verifyAttestation(issuer, signature) ✅
  ├── context.oracle.proof → verifyAttestation(issuer, signature) ✅
  └── context.risk.proof → verifyAttestation(issuer, signature) ✅

→ Kalau ada yang gagal: REJECT (fail-closed)
```

---

## Context V2 Field Reference

| Field | Tipe | Deskripsi |
|---|---|---|
| `env.timestamp` | `number` | Unix timestamp dari server |
| `env.proof` | `Attestation` | Signature ENV_ISSUER |
| `state.spentToday` | `string` | Total spent hari ini (micro-units) |
| `state.period` | `string` | `"DAY"` \| `"MONTH"` |
| `state.proof` | `Attestation` | Signature STATE_ISSUER |
| `oracle.country` | `string` | Kode negara dari KYC |
| `oracle.kycLevel` | `string` | Level KYC (`"1"`, `"2"`, `"3"`) |
| `oracle.fxRate` | `number` | Exchange rate |
| `oracle.proof` | `Attestation` | Signature ORACLE_ISSUER |
| `risk.score` | `number` | Skor risiko `0-100` |
| `risk.category` | `string` | `"LOW"` \| `"MEDIUM"` \| `"HIGH"` |
| `risk.proof` | `Attestation & { modelHash }` | Signature RISK_ISSUER |

---

## Contoh Rule yang Butuh Server Mode

```json
{
  "version": "1",
  "logic": "AND",
  "requires": ["oracle", "risk"],
  "rules": [
    {
      "id": "kyc_required",
      "if": { "field": "oracle.kycLevel", "op": ">=", "value": "2" }
    },
    {
      "id": "low_risk_only",
      "if": { "field": "risk.score", "op": "<=", "value": 50 }
    },
    {
      "id": "id_only",
      "if": { "field": "oracle.country", "op": "==", "value": "ID" }
    }
  ]
}
```

Field `requires: ["oracle", "risk"]` akan menyebabkan rule engine REJECT jika context tidak punya field tersebut.
