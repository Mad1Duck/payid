# RFC: PAY.ID Protocol v1 (IETF-Style)

## Status of This Memo

This document specifies an Internet standards track protocol for the PAY.ID protocol.
Distribution of this memo is unlimited.

## 1. Introduction

PAY.ID defines a programmable payment identity protocol that separates policy decision
from payment execution.

## 2. Conventions and Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119.

## 3. Protocol Goals

The protocol MUST:
- Be non-custodial
- Be deterministic
- Be fail-closed
- Support off-chain rule execution
- Support on-chain verification

The protocol MUST NOT:
- Execute transactions
- Custody funds
- Act as a wallet or payment rail

## 4. Rule Evaluation

Rule engines MUST:
- Execute deterministically
- Have no side effects
- Reject on any execution error

## 5. Decision Proof

Decision Proofs MUST:
- Be signed using EIP-712
- Include contextHash and ruleSetHash
- Include expiry and nonce

## 6. Verification

Verifiers MUST:
- Recover signer from signature
- Ensure signer equals PAY.ID owner
- Reject expired proofs
- Reject non-ALLOW decisions

## 7. Security Considerations

Any failure MUST result in REJECT.

## 8. IANA Considerations

This protocol requires no IANA actions.
