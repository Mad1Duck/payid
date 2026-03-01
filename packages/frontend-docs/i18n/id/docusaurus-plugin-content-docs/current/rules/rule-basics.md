---
id: rule-basics
title: Rule Basics
sidebar_label: Rule Basics
---

# Rule Basics

Rule adalah **JSON config** yang dievaluasi oleh WASM engine. PAY.ID mendukung 3 format yang bisa dikombinasikan bebas.

---

## Format A: SimpleRule

```ts
interface SimpleRule {
  id: string;
  if: { field: string; op: string; value: any; };
  message?: string;
}
```

```json
{ "id": "usdc_only", "if": { "field": "tx.asset", "op": "==", "value": "USDC" }, "message": "Hanya menerima USDC" }
```

```json
{ "id": "min_amount", "if": { "field": "tx.amount", "op": ">=", "value": "100000000" }, "message": "Minimum 100 USDC" }
```

---

## Format B: MultiConditionRule

**Contoh — amount harus antara 10 dan 500 USDC:**

```json
{ "id": "amount_range", "logic": "AND", "conditions": [
  { "field": "tx.amount", "op": ">=", "value": "10000000" },
  { "field": "tx.amount", "op": "<=", "value": "500000000" }
], "message": "Transaksi hanya 10–500 USDC" }
```

**Contoh — terima USDC atau USDT:**

```json
{ "id": "stablecoin_only", "logic": "OR", "conditions": [
  { "field": "tx.asset", "op": "==", "value": "USDC" },
  { "field": "tx.asset", "op": "==", "value": "USDT" }
]}
```

---

## Format C: NestedRule

**Contoh — VIP bisa transfer besar, non-VIP dibatasi:**

```json
{ "id": "tiered_limit", "logic": "OR", "rules": [
  { "id": "vip_sender", "if": { "field": "tx.sender", "op": "in", "value": ["0xVIP1..."] } },
  { "id": "small_amount", "if": { "field": "tx.amount", "op": "<=", "value": "50000000" } }
]}
```

---

## Root RuleConfig

```ts
interface RuleConfig {
  version?: string;
  logic: "AND" | "OR";
  rules: AnyRule[];
  requires?: string[];  // ["oracle", "risk", "state"]
  message?: string;
}
```

**Contoh lengkap policy merchant:**

```json
{ "version": "1", "logic": "AND", "rules": [
  { "id": "usdc_only", "if": { "field": "tx.asset", "op": "==", "value": "USDC" } },
  { "id": "min_amount", "if": { "field": "tx.amount", "op": ">=", "value": "10000000" } }
]}
```

---

## Semua Operator

| Operator | Tipe Value | Contoh |
|---|---|---|
| `==` | any | `asset == "USDC"` |
| `!=` | any | `asset != "ETH"` |
| `>=` | number/string | `amount >= "100000000"` |
| `<=` | number/string | `amount <= "5000000000"` |
| `in` | array | `asset in ["USDC","USDT"]` |
| `not_in` | array | `chainId not_in [56, 97]` |
| `between` | array [min, max] | `timestamp between [8, 22]` |
| `not_between` | array [min, max] | `timestamp not_between [23, 6]` |

---

## Field Paths

```
tx.sender / tx.receiver / tx.asset / tx.amount / tx.chainId
payId.id / payId.owner
env.timestamp
state.spentToday / state.dailyLimit
oracle.country / oracle.kycLevel / oracle.fxRate
risk.score / risk.category
```

---

## Cross-field Reference

Value bisa merujuk ke field context lain dengan prefix `$`:

```json
{ "id": "within_daily_limit", "if": { "field": "state.spentToday", "op": "<=", "value": "$state.dailyLimit" } }
```

---

## Rule Hashing

Selalu canonicalize sebelum hash. Key order berbeda menghasilkan hash berbeda:

```ts
function canonicalize(obj: any): string {
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj).sort().map(k => `"${k}":${canonicalize(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(obj);
}

const ruleHash = keccak256(toUtf8Bytes(canonicalize(ruleObject)));
```
