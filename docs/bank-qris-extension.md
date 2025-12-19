# 🏦 PAY.ID — Bank / QRIS Extension Specification

## Status of This Memo
This document specifies a non-normative extension for integrating PAY.ID with
banking and QRIS payment rails.

## 1. Design Principles

- PAY.ID MUST NOT custody fiat funds
- PAY.ID MUST NOT execute settlements
- PAY.ID acts only as a **policy oracle**

## 2. High-Level Flow

User scans QRIS → Bank App → PAY.ID evaluation → Decision Proof → Bank executes or rejects

## 3. Extended Context Schema

```json
{
  "tx": {
    "amount": "150000",
    "currency": "IDR",
    "rail": "QRIS",
    "merchantId": "MID123",
    "psp": "BANK_ABC"
  },
  "payId": {
    "id": "pay.id/merchant"
  }
}
```

## 4. Rule Examples

### Minimum Fiat Amount
```json
{
  "id": "min_amount_fiat",
  "if": {
    "field": "tx.amount",
    "op": ">=",
    "value": "10000"
  }
}
```

### PSP Allowlist
```json
{
  "id": "psp_allowlist",
  "if": {
    "field": "tx.psp",
    "op": "in",
    "value": ["BANK_ABC"]
  }
}
```

## 5. Failure Semantics

Any failure MUST result in payment rejection.

## 6. Regulatory Alignment

PAY.ID complements existing AML/KYC systems and does not bypass regulation.

## 7. Summary

PAY.ID enables programmable policy for fiat rails without becoming a bank.
