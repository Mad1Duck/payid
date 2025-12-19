# PAY.ID — Grant Proposal (2 Pages)

## Project Title
PAY.ID — Programmable Payment Identity Protocol

## Summary
PAY.ID is an open-source protocol that separates payment policy decision from execution. It enables deterministic, off-chain rule evaluation with on-chain verifiable decision proofs. PAY.ID is designed as neutral infrastructure compatible with EOA, ERC-4337 smart accounts, and future fiat rails.

## Problem
Current payment systems embed policy directly into smart contracts or backend services. This results in:
- High on-chain costs
- Rigid, non-upgradable logic
- Poor auditability
- Tight coupling between identity, execution, and settlement

## Solution
PAY.ID introduces a new primitive: **verifiable payment decisions**.
Rules are evaluated off-chain in a deterministic WASM sandbox. The result is signed as an EIP-712 Decision Proof, which can be verified on-chain or consumed by external systems.

## Deliverables
- PAY.ID SDK (TypeScript)
- Generic WASM Rule Engine
- Solidity Verifier Contract
- Rule Pack v1
- ERC-4337 compatible flow
- Formal RFC & Threat Model

## Impact
PAY.ID improves:
- Security (fail-closed policy)
- Composability (rule reuse)
- Auditability (cryptographic proof)
- UX (policy without wallet friction)

## Open Source Commitment
All core components are MIT licensed and publicly auditable.

## Requested Support
Funding to support 6–12 months of protocol R&D and ecosystem documentation.
