# PAY.ID — 3 Minute Demo Video Script (Grant Reviewer Friendly)

## Duration: ~3 minutes

### 0:00–0:20 — Problem
Today, payment rules are embedded directly into smart contracts or backend systems.
This makes them expensive, rigid, and difficult to audit.

### 0:20–0:50 — Introduction
PAY.ID is a programmable payment identity protocol.
It does not move money.
It decides whether money should be allowed to move.

### 0:50–1:30 — How It Works
Rules are evaluated off-chain in a deterministic WASM engine.
The result is signed as an EIP-712 Decision Proof.
This proof can be verified on-chain or by external systems without trusting a backend.

### 1:30–2:20 — Demo Walkthrough
Show:
- Rule config JSON
- Context input
- SDK evaluation result (ALLOW / REJECT)
- Generated Decision Proof
- On-chain verifier accepting the proof

### 2:20–2:50 — Why It Matters
PAY.ID enables safer, composable, and auditable payment systems.
It works with EOA, ERC-4337 smart accounts, and can extend to fiat rails.

### 2:50–3:00 — Closing
PAY.ID is open-source infrastructure for verifiable payment policy.
