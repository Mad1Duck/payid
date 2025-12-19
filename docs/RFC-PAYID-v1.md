# RFC: PAY.ID — Programmable Payment Identity Protocol (v1)

- **RFC ID**: PAYID-0001  
- **Title**: PAY.ID Protocol v1  
- **Category**: Standards Track  
- **Status**: Draft  

---

## Abstract

This document specifies **PAY.ID**, a protocol for **programmable payment identity** that separates **policy decision** from **payment execution**.

PAY.ID defines:
- Deterministic rule evaluation
- Cryptographically verifiable Decision Proofs
- Minimal on-chain verification
- ERC-4337 and fiat-rail compatibility

---

## 1. Motivation

Traditional payment systems tightly couple identity, execution, and settlement.
PAY.ID decouples **decision** from **execution**, allowing policy to be verified independently.

---

## 2. Goals

The protocol MUST:
- Be non-custodial
- Be deterministic
- Be fail-closed
- Support off-chain execution
- Support on-chain verification

---

## 3. Non-Goals

The protocol MUST NOT:
- Custody funds
- Execute transactions
- Replace banks or wallets

---

## 4. Terminology

- **PAY.ID**: Programmable payment identity
- **Rule**: Deterministic condition
- **Decision Proof**: Signed EIP-712 decision
- **Authority**: PAY.ID owner

---

## 5. Architecture

Context → Rule Engine → Decision → Decision Proof → Verifier

---

## 6. Rule Model

Rules MUST be deterministic, stateless, and side-effect free.

---

## 7. Decision Proof

Decision Proof MUST be signed using EIP-712 and include:
- payId
- owner
- decision
- contextHash
- ruleSetHash
- expiry
- nonce

---

## 8. Verification

On-chain verifier MUST:
- Recover signer
- Validate expiry
- Enforce decision

---

## 9. ERC-4337 Compatibility

PAY.ID is execution-agnostic and compatible with smart accounts.

---

## 10. Security

All failures MUST result in REJECT.

---

## Final Statement

PAY.ID proves whether money is allowed to move — it never moves money itself.
