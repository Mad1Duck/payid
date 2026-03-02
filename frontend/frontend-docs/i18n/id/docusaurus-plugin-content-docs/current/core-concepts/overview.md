---
id: overview
title: Konsep Dasar
sidebar_label: Overview
---

# Konsep Dasar

Memahami PAY.ID berarti memahami 5 primitif utama: **Identity**, **Context**, **Rules**, **Decision**, dan **Decision Proof**.

---

## Alur Lengkap (dengan Analogi)

Bayangkan bayar dengan PAY.ID seperti melewati **pos imigrasi** di bandara:

| Imigrasi | PAY.ID |
|---|---|
| Paspor + dokumen perjalananmu | **Context** — detail pembayaran |
| Peraturan imigrasi | **Rules** — JSON config di WASM |
| Petugas bilang "boleh lewat" atau "ditolak" | **Decision** — ALLOW atau REJECT |
| Paspor distempel | **Decision Proof** — EIP-712 signed proof |
| Pintu gate bandara terbuka | **Smart contract** eksekusi transfer |

```
┌──────────────┐
│   Context    │  ← Siapa, token apa, berapa, kapan
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
│ Decision Proof  │  ← EIP-712 signed proof (payer tanda tangan)
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Smart Contract  │  ← Verifikasi proof, transfer atau revert
└─────────────────┘
```

---

## 1. PAY.ID Identity

`pay.id/namamu` adalah **payment identity** milikmu — bukan sekadar alamat wallet. Ia membawa:
- **Owner** — wallet yang mengontrol rules
- **Rules** — payment policy yang aktif
- **Metadata** — tersimpan di chain + IPFS

**PAY.ID ≠ ENS** (ENS = name resolver, hanya map nama ke alamat)
**PAY.ID = payment policy identity** (membawa rules dan menjalankannya)

---

## 2. Context

Context adalah **deskripsi lengkap sebuah pembayaran** — setiap detail yang dibutuhkan rules untuk membuat keputusan.

### Context V1 (Client Mode — paling sederhana)

Digunakan saat rules hanya butuh data transaksi dasar:

```ts
type RuleContext = {
  tx: {
    sender?: string;   // Alamat wallet payer
    receiver?: string; // Alamat wallet receiver
    asset: string;     // contoh "USDC"
    amount: string;    // contoh "150000000" (150 USDC dalam format 6 desimal)
    chainId: number;   // contoh 4202 untuk Lisk Sepolia
  };
  payId?: { id: string; owner: string; };
  env?: { timestamp: number; }; // Unix timestamp saat ini
  state?: {
    spentTodayPlusTx: string;   // Berapa yang sudah dihabiskan hari ini + transaksi ini
    spentThisMonthPlusTx: string;
    dailyLimit: string;
  };
};
```

**Contoh:** Merchant yang hanya mau USDC, minimum 10 USDC:
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

### Context V2 (Server Mode — untuk rules yang lebih canggih)

Extends Context V1 dengan fields yang **ditandatangani oleh trusted issuers** (misalnya backend server-mu):

```ts
type ContextV2 = RuleContext & {
  env?: {
    timestamp: number;
    proof: Attestation;   // ← Server yang tandatangani ini
  };
  state?: {
    spentToday: string;
    period: string;
    proof: Attestation;   // ← Server yang tandatangani ini
  };
  oracle?: {
    country?: string;     // Negara pengguna (untuk geoblocking)
    kycLevel?: string;    // Level verifikasi KYC
    proof: Attestation;   // ← Server yang tandatangani ini
  };
  risk?: {
    score: number;        // Skor risiko 0–100
    category: string;
    proof: Attestation;
  };
};
```

:::info Client vs Server Mode
**Client mode** — context dibangun oleh aplikasi payer. Cocok untuk rules yang hanya cek field `tx.*` (jenis aset, jumlah, alamat).

**Server mode** — field sensitif seperti status KYC atau data rate limit ditandatangani oleh server yang terpercaya. Dibutuhkan untuk rules compliance. Lihat [Contoh Server →](../examples/server)
:::

---

## 3. Rules — 3 Format

Rules adalah JSON sederhana. Ada 3 format yang bisa kamu kombinasikan.

### Format A: SimpleRule — satu kondisi

```json
{
  "id": "usdc_only",
  "if": { "field": "tx.asset", "op": "==", "value": "USDC" },
  "message": "Hanya USDC yang diterima"
}
```

### Format B: MultiConditionRule — AND/OR dari beberapa kondisi

```json
{
  "id": "range_jumlah",
  "logic": "AND",
  "conditions": [
    { "field": "tx.amount", "op": ">=", "value": "10000000" },
    { "field": "tx.amount", "op": "<=", "value": "500000000" }
  ],
  "message": "Jumlah harus antara 10 dan 500 USDC"
}
```

### Format C: NestedRule — rules di dalam rules

```json
{
  "id": "vip_atau_kecil",
  "logic": "OR",
  "rules": [
    { "id": "is_vip", "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1..."] } },
    { "id": "jumlah_kecil", "if": { "field": "tx.amount", "op": "<=", "value": "10000000" } }
  ]
}
```

→ Lihat [Rule Basics](../rules/rule-basics) untuk referensi operator lengkap.

---

## 4. Decision

Setelah mengevaluasi rules, PAY.ID mengembalikan salah satu dari dua keputusan:

| Decision | Artinya |
|---|---|
| `ALLOW` | Semua rules lolos — transaksi boleh dilanjutkan |
| `REJECT` | Satu atau lebih rules gagal — transaksi diblokir |

### Kode Hasil

| Kode | Artinya |
|---|---|
| `OK` | Semua rules lolos ✅ |
| `RULE_FAILED` | Kondisi rule mengevaluasi ke false |
| `FIELD_NOT_FOUND` | Context tidak punya field yang dibutuhkan rule |
| `INVALID_CONFIG` | JSON rule tidak valid |
| `CONTEXT_OR_ENGINE_ERROR` | Error WASM engine (normalnya tidak terjadi) |

---

## 5. Decision Proof

Saat keputusannya ALLOW, PAY.ID menghasilkan bukti kriptografis:

```ts
type DecisionProof = {
  payload: {
    payId: string;           // contoh "pay.id/merchant"
    payer: string;           // Alamat payer
    receiver: string;        // Alamat receiver
    asset: string;           // Alamat token
    amount: bigint;          // Jumlah dalam unit token
    ruleSetHash: string;     // Hash dari rules yang dievaluasi
    ruleAuthority: string;   // Alamat kontrak yang menyimpan rules
    issuedAt: number;        // Kapan proof dibuat
    expiresAt: number;       // Kapan proof expired (issuedAt + ttlSeconds)
    nonce: string;           // Nilai acak, mencegah replay attack
    requiresAttestation: boolean;
  };
  signature: string;         // Tanda tangan EIP-712 dari wallet payer
};
```

Smart contract memverifikasi:
1. Tanda tangan cocok dengan alamat payer
2. `ruleSetHash` cocok dengan policy aktif merchant on-chain
3. Proof belum expired
4. Proof belum pernah dipakai sebelumnya (nonce)

---

## 6. Fail-Closed — Keamanan by Design

PAY.ID **selalu gagal ke REJECT** — bukan ke ALLOW — saat ada yang salah:

| Kondisi | Hasil |
|---|---|
| Kondisi rule false | `REJECT` |
| JSON rule tidak valid | `REJECT` |
| WASM engine crash | `REJECT` |
| Field context tidak ada | `REJECT` |
| Hash rule tidak cocok on-chain | `REJECT` |

Artinya bug di rules kamu akan memblokir pembayaran (menjengkelkan) daripada mengizinkan pembayaran yang tidak sah (berbahaya).

---

## 7. Rule NFT & Subscription

Rules kamu hidup di dalam NFT di blockchain:

```
subscribe()      → aktifkan akunmu (biaya ETH kecil, subscription 30 hari)
createRule()     → daftarkan definisi rule (belum ada NFT)
activateRule()   → mint Rule NFT, expiry = expiry subscription-mu
                   (gratis: 1 slot, berlangganan: sampai 3 slot)

Saat subscription expired:
→ Rule NFT expired → semua pembayaran ke kamu REVERT sampai diperpanjang
```

:::warning Jaga Subscription Tetap Aktif
Kalau subscription PAY.ID-mu expired, **semua pembayaran ke kamu akan gagal** on-chain. Set pengingat untuk perpanjang sebelum periode 30 hari habis.
:::
