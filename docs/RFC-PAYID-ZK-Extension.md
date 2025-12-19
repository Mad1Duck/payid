# RFC: PAY.ID ZK Extension (Research Draft)

## Status of This Memo

This document describes a research extension and is NOT a standards-track specification.

## 1. Motivation

ZK-PAY.ID explores zero-knowledge proofs to allow rule compliance verification
without revealing rule contents or transaction context.

## 2. Goals

A ZK extension SHOULD:
- Hide rule logic
- Hide transaction context
- Preserve decision verifiability

## 3. Threat Model

ZK proofs MUST:
- Prevent rule inference
- Prevent context leakage
- Be non-interactive

## 4. Architecture

Rule Evaluation -> ZK Proof Generation -> On-chain Verification

## 5. Limitations

- High proving cost
- Complex circuits
- Not suitable for v1 production

## 6. Status

This extension is research-only and OPTIONAL.
