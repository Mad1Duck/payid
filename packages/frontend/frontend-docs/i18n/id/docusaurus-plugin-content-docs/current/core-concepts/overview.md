---
id: overview
title: Konsep Dasar
sidebar_label: Overview
---

# Konsep Dasar

Memahami PAY.ID butuh memahami 5 primitif utama: **Identity**, **Context**, **Rules**, **Decision**, dan **Decision Proof**.

---

## The Flow

```
┌──────────────┐
│   Context    │  ← Siapa, pakai apa, berapa, kapan
└──────┬───────┘
       ▼
┌──────────────┐
│    Rules     │  ← JSON config dievaluasi di WASM
└──────┬───────┘
       ▼
┌──────────────┐
│   Decision   │  ← ALLOW atau REJECT
└──────┬───────┘
       ▼
┌─────────────────┐
│ Decision Proof  │  ← EIP-712 signed proof (payer sign)
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Smart Contract  │  ← Verifikasi proof, transfer atau revert
└─────────────────┘
```

---

## 1. PAY.ID Identity

`pay.id/yourname` adalah **payment identity** — bukan sekedar alamat wallet. Ia membawa:
- **Owner** — wallet pemilik rules
- **Rules** — payment policy aktif
- **Metadata** — tersimpan di chain + IPFS

**PAY.ID ≠ ENS** (ENS = name resolver)
**PAY.ID = payment policy identity**

---

## 2. Context

Context adalah **deskripsi lengkap sebuah payment intent** yang dikirim ke rule engine.

### Context V1 (Client Mode)

```ts
type RuleContext = {
  tx: {
    sender?: string;
    receiver?: string;
    asset: string;      // "USDC"
    amount: string;     // "150000000" (6 desimal)
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

Extends Context V1 dengan field yang **ditandatangani oleh trusted issuers**:

```ts
type ContextV2 = RuleContext & {
  env?: { timestamp: number; proof: Attestation; };
  state?: { spentToday: string; period: string; proof: Attestation; };
  oracle?: { country?: string; kycLevel?: string; proof: Attestation; };
  risk?: { score: number; category: string; proof: Attestation & { modelHash: string }; };
};
```

:::info Client vs Server
**Client mode** — context di-isi payer sendiri. Cocok untuk rules yang hanya butuh `tx.*`.

**Server mode** — field sensitif ditandatangani trusted issuer. Diperlukan untuk KYC, rate limiting, dsb.
:::

---

## 3. Rules — 3 Format

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

| Decision | Makna |
|---|---|
| `ALLOW` | Semua rules lolos — transaksi boleh dilanjutkan |
| `REJECT` | Satu atau lebih rules gagal — transaksi harus dihentikan |

### Result Codes

| Code | Kondisi |
|---|---|
| `OK` | Semua rules pass |
| `RULE_FAILED` | Kondisi rule false |
| `FIELD_NOT_FOUND` | Context field tidak ada |
| `INVALID_CONFIG` | Rule config malformed |
| `CONTEXT_OR_ENGINE_ERROR` | Error WASM / runtime |

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
  signature: string; // EIP-712 signature dari payer
};
```

---

## 6. Fail-Closed

PAY.ID **selalu gagal ke REJECT** — tidak pernah ke ALLOW — saat ada error:

| Kondisi | Hasil |
|---|---|
| Rule condition false | `REJECT` |
| Rule config invalid | `REJECT` |
| WASM runtime error | `REJECT` |
| Context field missing | `REJECT` |
| Hash mismatch | `REJECT` |

---

## 7. Rule NFT & Subscription

```
subscribe()      → aktifkan akun (0.0001 ETH / 30 hari)
createRule()     → daftarkan rule definition
activateRule()   → mint NFT, expiry = subscriptionExpiry
                   (1 slot tanpa subscription, 3 dengan)

Saat subscription habis:
ruleExpiry[tokenId] expired → semua payment ke receiver: REVERT
```
