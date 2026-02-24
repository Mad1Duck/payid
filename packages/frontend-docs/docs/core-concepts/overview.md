---
id: overview
title: Core Concepts
sidebar_label: Overview
---

# Core Concepts

Memahami PAY.ID butuh memahami 5 primitif utama: **Identity**, **Context**, **Rules**, **Decision**, dan **Decision Proof**.

---

## The Flow

```
┌──────────────┐
│   Context    │  ← Siapa, pakai apa, berapa, kapan
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Rules     │  ← JSON config dievaluasi di WASM
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Decision   │  ← ALLOW atau REJECT
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│ Decision Proof  │  ← EIP-712 signed proof (payer sign)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Smart Contract  │  ← Verifikasi proof, transfer atau revert
└─────────────────┘
```

---

## 1. PAY.ID Identity

`pay.id/yourname` adalah **payment identity** — bukan sekedar alamat wallet.

Ia membawa:
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
    sender?: string;    // "0x..."
    receiver?: string;  // "0x..."
    asset: string;      // "USDC"
    amount: string;     // "150000000" (6 desimal)
    chainId: number;    // 4202
  };
  payId?: {
    id: string;         // "pay.id/merchant"
    owner: string;      // "0x..."
  };
  intent?: {
    type: "QR" | "DIRECT" | "API";
    expiresAt?: number;
    nonce?: string;
    issuer?: string;
  };
};
```

### Context V2 (Server Mode)

Extends Context V1 dengan field yang **ditandatangani oleh trusted issuers**:

```ts
type ContextV2 = RuleContext & {
  env?: {
    timestamp: number;     // Unix timestamp, disign server
    proof: Attestation;    // ← signature issuer
  };
  state?: {
    spentToday: string;    // dari database, disign server
    period: string;
    proof: Attestation;
  };
  oracle?: {
    country?: string;
    kycLevel?: string;
    fxRate?: number;
    proof: Attestation;    // ← wajib ada
    [key: string]: any;
  };
  risk?: {
    score: number;
    category: string;
    proof: Attestation & { modelHash: string };
  };
};
```

:::info Client vs Server
**Client mode** — context di-isi payer sendiri. Cocok untuk rules yang hanya butuh `tx.*`.

**Server mode** — field sensitif (timestamp, state, oracle) ditandatangani trusted issuer. Diperlukan untuk KYC, rate limiting berbasis database, dsb.
:::

---

## 3. Rules — 3 Format

PAY.ID mendukung 3 format rule yang bisa dikombinasikan:

### Format A: SimpleRule

Satu kondisi, paling umum dipakai:

```json
{
  "id": "min_amount",
  "if": {
    "field": "tx.amount",
    "op": ">=",
    "value": "100000000"
  },
  "message": "Minimum 100 USDC"
}
```

### Format B: MultiConditionRule

Beberapa kondisi dalam satu rule, dengan logic AND/OR:

```json
{
  "id": "amount_range",
  "logic": "AND",
  "conditions": [
    { "field": "tx.amount", "op": ">=", "value": "100000000" },
    { "field": "tx.amount", "op": "<=", "value": "500000000" }
  ],
  "message": "Harus antara 100-500 USDC"
}
```

### Format C: NestedRule

Rules di dalam rules — untuk policy kompleks:

```json
{
  "id": "vip_or_small",
  "logic": "OR",
  "rules": [
    {
      "id": "is_vip",
      "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1", "0xVIP2"] }
    },
    {
      "id": "small_amount",
      "if": { "field": "tx.amount", "op": "<=", "value": "10000000" }
    }
  ]
}
```

### Root Config

Semua rule dibungkus dalam `RuleConfig`:

```ts
type RuleConfig = {
  version?: string;
  logic: "AND" | "OR";      // logic antar rules di array ini
  rules: AnyRule[];          // SimpleRule | MultiConditionRule | NestedRule
  requires?: string[];       // namespace yang wajib ada, contoh: ["oracle", "risk"]
  message?: string;
};
```

### Operator yang Didukung

| Operator | Deskripsi | Contoh |
|---|---|---|
| `==` | Sama dengan | `asset == "USDC"` |
| `!=` | Tidak sama | `asset != "ETH"` |
| `>` | Lebih besar | `amount > 0` |
| `>=` | Lebih besar atau sama | `amount >= 100000000` |
| `<` | Lebih kecil | `amount < 500` |
| `<=` | Lebih kecil atau sama | `amount <= 5000000000` |
| `in` | Ada di list | `asset in ["USDC", "USDT"]` |
| `not_in` | Tidak ada di list | `chainId not_in [56, 97]` |
| `between` | Dalam rentang | `timestamp between [9, 17]` |
| `not_between` | Di luar rentang | `timestamp not_between [22, 6]` |

### Cross-field Reference

Value bisa mereferensi field context lain dengan prefix `$`:

```json
{
  "id": "within_daily_limit",
  "if": {
    "field": "state.spentToday",
    "op": "<=",
    "value": "$state.dailyLimit"
  }
}
```

---

## 4. Decision

Rule engine mengembalikan satu dari dua keputusan:

| Decision | Makna |
|---|---|
| `ALLOW` | Semua rules lolos — transaksi boleh dilanjutkan |
| `REJECT` | Satu atau lebih rules gagal — transaksi harus dihentikan |

```ts
type RuleResult = {
  decision: "ALLOW" | "REJECT";
  code: string;
  reason?: string;    // penjelasan human-readable (off-chain only)
};
```

### Result Codes

| Code | Makna |
|---|---|
| `OK` | Semua rules pass |
| `RULE_FAILED` | Kondisi rule false |
| `FIELD_NOT_FOUND` | Field context tidak ada |
| `INVALID_CONFIG` | Rule config malformed |
| `CONTEXT_OR_ENGINE_ERROR` | Error WASM/runtime |
| `INVALID_ENGINE_OUTPUT` | Output WASM tidak valid |

---

## 5. Decision Proof

Proof adalah **pernyataan kriptografis (EIP-712)** bahwa rules telah dievaluasi dan hasilnya ALLOW.

```ts
type DecisionProof = {
  payload: {
    version: string;
    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;
    contextHash: string;
    ruleSetHash: string;
    ruleAuthority: string;
    issuedAt: number;
    expiresAt: number;       // default: issuedAt + 60 detik
    nonce: string;           // random, replay protection
    requiresAttestation: boolean;
  };
  signature: string;         // "0x..." — signed by payer
};
```

Proof ini yang dikirim ke smart contract dan diverifikasi oleh `PayIDVerifier`.

---

## 6. Fail-Closed

PAY.ID **selalu gagal ke REJECT** — tidak pernah ke ALLOW — saat ada error:

| Kondisi | Hasil |
|---|---|
| Rule condition false | `REJECT` |
| Rule config invalid | `REJECT` |
| WASM runtime error | `REJECT` |
| Rule fetch IPFS gagal | `REJECT` |
| Hash mismatch | `REJECT` |
| Context field missing | `REJECT` |
| SDK misuse | `throw Error` |

---

## 7. Rule NFT & Subscription

Setiap rule di-representasikan sebagai **ERC-721 NFT** dengan lifecycle:

```
subscribe()         → aktifkan akun (0.0001 ETH / 30 hari)
createRule()        → daftarkan rule definition (belum mint)
activateRule()      → mint NFT, expiry = subscriptionExpiry
                      (1 slot tanpa subscription, 3 slot dengan subscription)

Saat subscription habis:
ruleExpiry[tokenId] expired → semua payment ke receiver: REVERT
```

### Kenapa Expiry Penting

Contract `PayIDVerifier` cek:

```solidity
require(
  license.ruleExpiry(tokenId) >= block.timestamp,
  "RULE_LICENSE_EXPIRED"   // ← revert kalau expired
);
```

Kalau merchant lupa renew subscription, semua customer yang bayar ke mereka akan mendapat error ini.
