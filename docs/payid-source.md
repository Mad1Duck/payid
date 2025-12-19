# PAY.ID — Verifiable Payment Policy Protocol

This document is a complete technical source reference for generating PAY.ID documentation.
It is intended for AI-assisted documentation generation, developers, auditors, and integrators.

Tone requirements for generated docs:

- infrastructure-grade
- calm and precise
- non-marketing
- non-emotional
- factual

---

## 1. What PAY.ID Is

PAY.ID is an open-source protocol for **verifiable payment policy**.

PAY.ID:

- DOES NOT move money
- DOES NOT custody funds
- DOES NOT execute transactions

PAY.ID:

- evaluates payment rules off-chain
- produces deterministic ALLOW / REJECT decisions
- generates cryptographically verifiable decision proofs
- allows smart contracts and systems to verify policy compliance

PAY.ID separates **decision** from **execution**.

---

## 2. What PAY.ID Is Not

PAY.ID is NOT:

- a wallet
- a payment gateway
- a DeFi application
- a bank replacement
- a transaction router

Execution and settlement are always external.

---

## 3. Core Concept

Payment policy is treated as a **first-class, verifiable object**.

Instead of embedding rules directly in smart contracts or backend logic:

- rules are evaluated off-chain
- the result is signed
- the signature is verified at execution time

ASCII model:

Context → Rules → Decision → Decision Proof → Verify

---

## 4. High-Level Architecture

Components:

- Context Builder
- Rule Engine (WASM, deterministic)
- Decision Output
- Decision Proof Generator
- Verifier (on-chain or off-chain)

Trust boundaries:

- Rule execution is off-chain but deterministic
- Verification is trustless
- PAY.ID never needs to be trusted with funds

---

## 5. How PAY.ID Works (Step-by-Step)

### Step 1: Context Construction

Context is a structured object describing the attempted payment.

Example fields:

- sender
- receiver
- amount
- asset
- chainId
- payId identity

Context is immutable for a single evaluation.

---

### Step 2: Rule Evaluation (Off-chain)

Rules are evaluated in a sandboxed WASM environment.

Properties:

- deterministic
- no network access
- no filesystem
- no randomness
- bounded execution

Output is either:

- ALLOW
- REJECT

---

### Step 3: Decision Output

The engine outputs:

- decision (ALLOW / REJECT)
- reason code (off-chain only)

Any error MUST result in REJECT (fail-closed).

---

### Step 4: Decision Proof Generation

If decision is ALLOW, a Decision Proof is generated.

Decision Proof:

- is signed using EIP-712
- binds decision to context hash
- binds decision to rule set hash
- has expiration and nonce

---

### Step 5: Verification

A verifier:

- recovers the signer
- checks ownership authority
- checks expiry
- enforces decision

Verification can happen:

- on-chain (Solidity)
- off-chain (backend, bank, PSP)

---

## 6. Using PAY.ID in Backend Systems

Typical backend usage:

1. Receive payment intent
2. Build context
3. Evaluate rules via PAY.ID SDK
4. Receive decision
5. Proceed or reject execution

Backend systems:

- MUST NOT override REJECT
- SHOULD log decision proofs
- MAY cache rule configurations

PAY.ID can be self-hosted or used via a hosted gateway.

---

## 7. Using PAY.ID in Smart Contracts

Smart contracts:

- do NOT evaluate rules
- do NOT parse context
- only verify Decision Proofs

Typical flow:

1. User submits transaction with proof
2. Contract verifies signature
3. Contract checks decision == ALLOW
4. Contract executes transaction

This keeps contracts:

- simple
- cheap
- auditable

---

## 8. ERC-4337 / Smart Account Usage

PAY.ID integrates naturally with smart accounts.

Pattern:

- PAY.ID acts as a guard / policy oracle
- Decision Proof is attached to UserOperation
- Smart account verifies proof before execution

PAY.ID does NOT act as bundler or paymaster.

---

## 9. Rule System Overview

Rules are data-driven and deterministic.

Rules:

- do not execute transactions
- do not modify context
- do not have side effects

Rules evaluate conditions against context fields.

---

## 10. Supported Rule Operators (v1)

Supported operators:

- ==
- !=
- >
- > =
- <
- <=
- in
- not_in

Rules may be combined using:

- AND
- OR

Nested logic is supported.

---

## 11. Standard Rules (Rule Pack v1)

Supported standard rules include:

- minimum amount
- maximum amount
- asset allowlist
- sender allowlist
- receiver allowlist
- chain allowlist
- exact match

Rules are expressed as JSON configuration.

---

## 12. Failure Semantics

Any of the following MUST result in REJECT:

- invalid context
- invalid rule configuration
- engine failure
- timeout
- signature mismatch

Fail-closed behavior is mandatory.

---

## 13. Security Model

Security principles:

- no custody
- deterministic execution
- explicit trust boundaries
- minimal on-chain logic

PAY.ID does NOT protect against:

- malicious execution contracts
- compromised wallets
- social engineering

---

## 14. Governance & Upgrade Model

PAY.ID uses append-only versioning.

Rules, engines, and proofs are versioned independently.

Old proofs MUST remain verifiable.

Governance is advisory and non-custodial.

---

## 15. Fiat / Bank Extension (Optional)

PAY.ID may be extended to fiat rails.

In this mode:

- banks provide context
- PAY.ID evaluates policy
- banks execute or reject payments

PAY.ID never touches fiat.

---

## 16. Project Status

PAY.ID is:

- open-source
- protocol-focused
- under active development
- intended as public-good infrastructure

Funding may come from:

- grants
- sponsorships
- community donations

Donations do not grant influence over protocol decisions.

---

## 17. Intended Audience

This protocol is intended for:

- blockchain developers
- protocol designers
- auditors
- smart account builders
- fintech infrastructure teams

---

## End of Source Document
