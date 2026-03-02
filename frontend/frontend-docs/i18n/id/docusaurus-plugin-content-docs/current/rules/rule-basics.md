---
id: rule-basics
title: Rule Basics
sidebar_label: Rule Basics
---

# Rule Basics

Rule adalah **JSON config** yang dievaluasi oleh WASM engine. Bayangkan seperti checklist satpam: setiap rule adalah satu pertanyaan yang dijawab sebelum pembayaran diizinkan.

PAY.ID mendukung 3 format rule yang bisa digabungkan secara bebas.

---

## Format A: SimpleRule — Satu Kondisi

Format paling dasar. Tanyakan satu hal tentang pembayaran.

```ts
interface SimpleRule {
  id: string;
  if: { field: string; op: string; value: any; };
  message?: string; // ditampilkan saat rule memblokir pembayaran
}
```

**Contoh — hanya terima USDC:**
```json
{
  "id": "usdc_saja",
  "if": { "field": "tx.asset", "op": "==", "value": "USDC" },
  "message": "Hanya USDC yang diterima"
}
```

**Contoh — minimum 10 USDC:**
```json
{
  "id": "min_jumlah",
  "if": { "field": "tx.amount", "op": ">=", "value": "10000000" },
  "message": "Pembayaran minimum 10 USDC"
}
```

:::tip Catatan Desimal
Jumlah menggunakan presisi desimal token. USDC punya 6 desimal, jadi 10 USDC = `"10000000"` (10 × 10⁶).
:::

---

## Format B: MultiConditionRule — AND/OR dari Beberapa Kondisi

Cek beberapa kondisi sekaligus dengan `"logic": "AND"` atau `"logic": "OR"`.

**Contoh — jumlah harus antara 10 dan 500 USDC (keduanya harus lolos → AND):**
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

**Contoh — terima USDC atau USDT (salah satu lolos → OR):**
```json
{
  "id": "stablecoin",
  "logic": "OR",
  "conditions": [
    { "field": "tx.asset", "op": "==", "value": "USDC" },
    { "field": "tx.asset", "op": "==", "value": "USDT" }
  ],
  "message": "Hanya stablecoin yang diterima"
}
```

---

## Format C: NestedRule — Rules di Dalam Rules

Untuk logika yang lebih kompleks, kamu bisa nest rules di dalam rules lain.

**Contoh — pelanggan VIP bisa kirim berapa saja, yang lain dibatasi 50 USDC:**
```json
{
  "id": "vip_atau_kecil",
  "logic": "OR",
  "rules": [
    {
      "id": "adalah_vip",
      "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1...", "0xVIP2..."] }
    },
    {
      "id": "jumlah_kecil",
      "if": { "field": "tx.amount", "op": "<=", "value": "50000000" }
    }
  ]
}
```

---

## Root RuleConfig

Rules kamu dibungkus dalam objek root `RuleConfig` yang mendefinisikan logika keseluruhan:

```ts
interface RuleConfig {
  version?: string;        // Tag versi opsional
  logic: "AND" | "OR";    // Cara rules top-level digabungkan
  rules: AnyRule[];        // Array dari SimpleRule, MultiConditionRule, atau NestedRule
  requires?: string[];     // Modul context yang dibutuhkan: ["oracle", "risk", "state"]
  message?: string;        // Pesan fallback
}
```

**Contoh policy merchant lengkap:**
```json
{
  "version": "1",
  "logic": "AND",
  "rules": [
    {
      "id": "usdc_saja",
      "if": { "field": "tx.asset", "op": "==", "value": "USDC" }
    },
    {
      "id": "min_jumlah",
      "if": { "field": "tx.amount", "op": ">=", "value": "10000000" }
    },
    {
      "id": "range_jumlah",
      "logic": "AND",
      "conditions": [
        { "field": "tx.amount", "op": ">=", "value": "10000000" },
        { "field": "tx.amount", "op": "<=", "value": "500000000" }
      ]
    }
  ]
}
```

Semua 3 rules harus lolos (logika AND) agar pembayaran di-ALLOW.

---

## Referensi Operator

| Operator | Berlaku Untuk | Contoh |
|---|---|---|
| `==` | Nilai apapun | `asset == "USDC"` |
| `!=` | Nilai apapun | `asset != "ETH"` |
| `>=` | Angka atau string | `amount >= "100000000"` |
| `<=` | Angka atau string | `amount <= "5000000000"` |
| `in` | Array nilai | `asset in ["USDC","USDT"]` |
| `not_in` | Array nilai | `chainId not_in [56, 97]` |
| `between` | `[min, max]` | `timestamp between [8, 22]` |
| `not_between` | `[min, max]` | `timestamp not_between [23, 6]` |

---

## Referensi Field Paths

Field-field yang bisa kamu gunakan dalam rules:

| Field | Deskripsi | Contoh Nilai |
|---|---|---|
| `tx.sender` | Alamat wallet payer | `"0xAbCd..."` |
| `tx.receiver` | Alamat wallet receiver | `"0x1234..."` |
| `tx.asset` | Simbol token | `"USDC"` |
| `tx.amount` | Jumlah dalam unit token (string) | `"150000000"` |
| `tx.chainId` | ID jaringan blockchain | `4202` |
| `payId.id` | String payment identity | `"pay.id/merchant"` |
| `payId.owner` | Pemilik PAY.ID | `"0xOwner..."` |
| `env.timestamp` | Unix timestamp saat ini | `1700000000` |
| `state.spentToday` | Jumlah yang dihabiskan hari ini (dari server) | `"50000000"` |
| `state.dailyLimit` | Batas pengeluaran harian | `"500000000"` |
| `oracle.country` | Negara pengguna (dari server) | `"ID"` |
| `oracle.kycLevel` | Level verifikasi KYC | `"2"` |
| `risk.score` | Skor risiko 0–100 (dari server) | `15` |
| `risk.category` | Kategori risiko (dari server) | `"low"` |

Field di bawah `state.*`, `oracle.*`, dan `risk.*` membutuhkan **Server Mode** dan harus dideklarasikan di `requires`:
```json
{ "version": "1", "logic": "AND", "requires": ["oracle", "state"], "rules": [...] }
```

---

## Referensi Cross-field

Nilai rule bisa merujuk ke field lain dengan prefix `$`:

```json
{
  "id": "dalam_batas_harian",
  "if": {
    "field": "state.spentTodayPlusTx",
    "op": "<=",
    "value": "$state.dailyLimit"
  },
  "message": "Batas pengeluaran harian terlampaui"
}
```

Rule ini lolos kalau total pengeluaran hari ini (termasuk transaksi ini) tidak melebihi batas harian.

---

## Rule Hashing

Rules disimpan di IPFS dan hash-nya dicatat on-chain. Untuk memastikan hash deterministik, selalu canonicalize (urutkan keys secara alfabetis) sebelum hashing:

```ts
function canonicalize(obj: any): string {
  if (Array.isArray(obj))
    return `[${obj.map(canonicalize).join(",")}]`;
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj).sort()
      .map(k => `"${k}":${canonicalize(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(obj);
}

// Hash rule untuk disimpan on-chain
const ruleHash = keccak256(toUtf8Bytes(canonicalize(ruleObject)));
```

:::warning Urutan Kunci Penting!
`{"id":"a","if":{...}}` dan `{"if":{...},"id":"a"}` menghasilkan **hash yang berbeda**. Selalu canonicalize dulu sebelum hashing.
:::
