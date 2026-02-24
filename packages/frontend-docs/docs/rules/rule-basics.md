---
id: rule-basics
title: Rule Basics
sidebar_label: Rule Basics
---

# Rule Basics

Rule adalah **JSON config** yang dievaluasi oleh WASM engine. PAY.ID mendukung 3 format rule yang bisa dikombinasikan bebas.

---

## Format A: SimpleRule

Satu kondisi, paling sering dipakai.

```ts
interface SimpleRule {
  id: string;
  if: {
    field: string;   // path ke context field
    op: string;      // operator perbandingan
    value: any;      // nilai atau "$field.ref"
  };
  message?: string;  // pesan rejection (human-readable)
}
```

**Contoh:**

```json
{
  "id": "usdc_only",
  "if": {
    "field": "tx.asset",
    "op": "==",
    "value": "USDC"
  },
  "message": "Hanya menerima USDC"
}
```

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

---

## Format B: MultiConditionRule

Beberapa kondisi dalam satu rule dengan logic AND/OR.

```ts
interface MultiConditionRule {
  id: string;
  logic: "AND" | "OR";
  conditions: Array<{
    field: string;
    op: string;
    value: any;
  }>;
  message?: string;
}
```

**Contoh — amount harus antara 10 dan 500 USDC:**

```json
{
  "id": "amount_range",
  "logic": "AND",
  "conditions": [
    { "field": "tx.amount", "op": ">=", "value": "10000000" },
    { "field": "tx.amount", "op": "<=", "value": "500000000" }
  ],
  "message": "Transaksi hanya 10–500 USDC"
}
```

**Contoh — terima USDC atau USDT:**

```json
{
  "id": "stablecoin_only",
  "logic": "OR",
  "conditions": [
    { "field": "tx.asset", "op": "==", "value": "USDC" },
    { "field": "tx.asset", "op": "==", "value": "USDT" }
  ]
}
```

---

## Format C: NestedRule

Rules di dalam rules — untuk policy kompleks.

```ts
interface NestedRule {
  id: string;
  logic: "AND" | "OR";
  rules: AnyRule[];   // bisa mix SimpleRule, MultiConditionRule, NestedRule
  message?: string;
}
```

**Contoh — VIP bisa transfer besar, non-VIP dibatasi:**

```json
{
  "id": "tiered_limit",
  "logic": "OR",
  "rules": [
    {
      "id": "vip_sender",
      "if": {
        "field": "tx.sender",
        "op": "in",
        "value": ["0xVIP1...", "0xVIP2..."]
      }
    },
    {
      "id": "small_amount",
      "if": {
        "field": "tx.amount",
        "op": "<=",
        "value": "50000000"
      }
    }
  ]
}
```

---

## Root RuleConfig

Semua rules dibungkus dalam `RuleConfig`:

```ts
interface RuleConfig {
  version?: string;
  logic: "AND" | "OR";   // logic antar rules di array ini
  rules: AnyRule[];
  requires?: string[];    // context namespace wajib: ["oracle", "risk", "state"]
  message?: string;
}
```

**Contoh lengkap policy merchant:**

```json
{
  "version": "1",
  "logic": "AND",
  "rules": [
    {
      "id": "usdc_only",
      "if": { "field": "tx.asset", "op": "==", "value": "USDC" }
    },
    {
      "id": "min_amount",
      "if": { "field": "tx.amount", "op": ">=", "value": "10000000" }
    }
  ]
}
```

---

## Semua Operator

| Operator | Tipe Value | Contoh |
|---|---|---|
| `==` | any | `asset == "USDC"` |
| `!=` | any | `asset != "ETH"` |
| `>` | number/string | `amount > "0"` |
| `>=` | number/string | `amount >= "100000000"` |
| `<` | number/string | `amount < "500000000"` |
| `<=` | number/string | `amount <= "5000000000"` |
| `in` | array | `asset in ["USDC","USDT"]` |
| `not_in` | array | `chainId not_in [56, 97]` |
| `between` | array [min, max] | `timestamp between [8, 22]` |
| `not_between` | array [min, max] | `timestamp not_between [23, 6]` |

---

## Field Paths

Field path mengikuti struktur Context:

```
tx.sender          → alamat pengirim
tx.receiver        → alamat penerima
tx.asset           → nama asset ("USDC", "ETH", dll)
tx.amount          → jumlah sebagai string (micro-units)
tx.chainId         → chain ID

payId.id           → "pay.id/merchant"
payId.owner        → alamat owner rules

env.timestamp      → Unix timestamp (dari server / attestation)

state.spentToday   → total sudah dibelanjakan hari ini (string)
state.dailyLimit   → batas harian (string)
state.period       → periode tracking

oracle.country     → kode negara dari KYC oracle
oracle.kycLevel    → level KYC
oracle.fxRate      → exchange rate

risk.score         → skor risiko (number)
risk.category      → "LOW" | "MEDIUM" | "HIGH"
```

---

## Cross-field Reference

Value bisa merujuk ke field context lain dengan prefix `$`:

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

## Field Modifier: `|mod`

WASM engine mendukung modifier pada field path:

```json
{
  "_comment": "Blokir amount kelipatan 666",
  "id": "no_cursed",
  "if": {
    "field": "tx.amount|mod:666000000",
    "op": "!=",
    "value": 0
  },
  "message": "666 USDC? Duit setan, ditolak 👹"
}
```

Syntax: `field|mod:N` — menghitung `field % N` sebelum dibandingkan.

---

## Rule Hashing

Setiap rule di-hash sebelum disimpan on-chain untuk integritas:

```ts
import { keccak256, toUtf8Bytes } from "ethers";

// Rule harus di-canonicalize dulu sebelum hash
function canonicalize(obj: any): string {
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj).sort()
      .map(k => `"${k}":${canonicalize(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(obj);
}

const ruleHash = keccak256(toUtf8Bytes(canonicalize(ruleObject)));
```

:::warning
Selalu canonicalize sebelum hash. Key order berbeda menghasilkan hash berbeda, dan kontrak akan reject `INVALID_RULE_HASH`.
:::
