# 📦 PAY.ID — Rule Pack v1 Specification

> **Standard Rules for Programmable Payment Identity**  
> Version: v1  
> Status: Public Draft

---

## 1. Overview

**Rule Pack v1** adalah kumpulan **rule standar** yang:

- Paling sering dibutuhkan aplikasi pembayaran
- Aman, deterministic, dan reusable
- Bisa langsung dipakai tanpa menulis WASM baru

Rule Pack v1:

- Dieksekusi oleh **generic WASM evaluator**
- Didefinisikan **100% via JSON**
- Bisa dipublish sebagai **IPFS bundle**

---

## 2. Design Principles

Setiap rule di Rule Pack v1 harus:

1. **Deterministic**
2. **Stateless**
3. **Fail-closed**
4. **Composable**
5. **Human-readable**
6. **Auditable**

Rule **TIDAK BOLEH**:

- Mengakses waktu sistem
- Mengakses network
- Mengubah state
- Menghasilkan randomness

---

## 3. Rule Pack Structure

Satu Rule Pack direpresentasikan sebagai:

rule-pack-v1/
├── metadata.json
├── rule.config.json
└── README.md

### 3.1 `metadata.json`

```json
{
  "name": "payid.rulepack.v1.standard",
  "version": "1.0.0",
  "engine": "generic.wasm",
  "compatibility": {
    "sdk": ">=1.0.0",
    "protocol": "v1"
  }
}
```

## 4. Standard Rule Definitions

### 4.1 Minimum Amount Rule

Purpose
Mencegah transaksi di bawah nilai minimum.

Rule ID

```nginx
min_amount
```

Config Example

```json
{
  "id": "min_amount",
  "if": {
    "field": "tx.amount",
    "op": ">=",
    "value": "100000000"
  }
}
```

- Context Fields Used
  - tx.amount
- Typical Use Case
  - Merchant minimum payment
  - Anti-spam micropayment

### 4.2 Maximum Amount Rule

Purpose
Mencegah transaksi di atas limit tertentu.
Rule ID

```nginx
max_amount
```

Config Example

```json
Copy code
{
  "id": "max_amount",
  "if": {
    "field": "tx.amount",
    "op": "<=",
    "value": "5000000000"
  }
}
```

- Typical Use Case
  - Risk control
  - Spending cap

### 4.3 Asset Allowlist Rule

Purpose
Hanya mengizinkan token tertentu.
Rule ID

```nginx
asset_allowlist
```

Config Example

```json
{
  "id": "asset_allowlist",
  "if": {
    "field": "tx.asset",
    "op": "in",
    "value": ["USDT", "USDC"]
  }
}
```

- Context Fields Used
  - tx.asset

### 4.4 Sender Allowlist Rule

Purpose
Hanya mengizinkan pengirim tertentu.
Rule ID

```nginx
sender_allowlist
```

Config Example

```json
{
  "id": "sender_allowlist",
  "if": {
    "field": "tx.sender",
    "op": "in",
    "value": ["0xabc...", "0xdef..."]
  }
}
```

- Context Fields Used
  - tx.sender

### 4.5 Receiver Allowlist Rule

Purpose
Membatasi penerima transaksi.
Rule ID

```nginx
receiver_allowlist
```

Config Example

```json
{
  "id": "receiver_allowlist",
  "if": {
    "field": "tx.receiver",
    "op": "in",
    "value": ["0xmerchant...", "0xvault..."]
  }
}
```

### 4.6 Chain Allowlist Rule

Purpose
Membatasi chain tempat transaksi boleh dilakukan.
Rule ID

```nginx
chain_allowlist
```

Config Example

```json
{
  "id": "chain_allowlist",
  "if": {
    "field": "tx.chainId",
    "op": "in",
    "value": [1, 137, 8453]
  }
}
```

### 4.7 Exact Match Rule

Purpose
Mengharuskan nilai field sama persis.
Rule ID

```nginx
exact_match
```

Config Example

```json
{
  "id": "exact_match",
  "if": {
    "field": "tx.asset",
    "op": "==",
    "value": "USDT"
  }
}
```

### 4.8 Multiple Rule Composition

Rules dapat dikombinasikan menggunakan logic:

```json
{
  "version": "1",
  "logic": "AND",
  "rules": [{ "...": "min_amount" }, { "...": "asset_allowlist" }]
}
```

- Supported logic:
  - AND
  - OR

## 5. Context Schema (v1)

Rule Pack v1 mengasumsikan context minimal:

```json
{
  "tx": {
    "sender": "0x...",
    "receiver": "0x...",
    "asset": "USDT",
    "amount": "150000000",
    "chainId": 1
  },
  "payId": {
    "id": "pay.id/example",
    "owner": "0x..."
  }
}
```

## 6. Error Semantics

| Condition            | Result   |
| -------------------- | -------- |
| Rule condition false | `REJECT` |
| Missing field        | `REJECT` |
| Invalid config       | `REJECT` |
| Unsupported operator | `REJECT` |

All failures are fail-closed.

## 7. Reason & Code Mapping

Standard Codes
| Code | Meaning |
| ------------------ | --------------------- |
| `OK` | All rules passed |
| `RULE_FAILED` | One rule failed |
| `FIELD_NOT_FOUND` | Context field missing |
| `INVALID_CONFIG` | Rule config invalid |
| `INVALID_OPERATOR` | Unsupported operator |

reason:

- Human-readable
- Off-chain only
- NOT included in Decision Proof

## 8. Versioning & Compatibility

Rule Pack versioned independently

New rules added without breaking existing packs

Removal or semantic change = major version bump

## 9. Distribution

- Rule Pack v1 can be distributed via:
- IPFS (recommended)
- HTTP(S)
- Git repository
  Recommended:

```perl
ipfs://<CID-of-rule-pack>
```

## 10. Security Considerations

- Prefer small allowlists
- Avoid sensitive data in rule values
- Do not encode secrets
- Review rule packs like code

## 11. Non-Goals (Explicit)

Rule Pack v1 does NOT include:

Time-based rules

Stateful limits (daily quota)

External oracle checks

Compliance heuristics

These are planned for Rule Pack v2+.

## 12. Future Extensions

Planned additions:

Time window rules

Spending bucket rules

Multisig / DAO approval rules

Zero-knowledge rule proofs

## 13. Summary

Rule Pack v1 provides:

A safe default set of rules

Minimal learning curve

High composability

Strong determinism guarantees

Most payment policies can be expressed using Rule Pack v1 alone.

## Final Note

Rules are data.
Data is auditable.
Auditable rules build trust.
