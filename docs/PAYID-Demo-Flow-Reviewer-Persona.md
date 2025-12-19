# PAY.ID — Demo Flow Refined by Reviewer Persona

This document refines the demo flow depending on the background of the grant reviewer.

---

## Persona A — Protocol Engineer / Core Dev

### What They Care About
- Determinism
- Clean boundaries
- Minimal on-chain logic

### Demo Emphasis
1. Show rule config JSON
2. Show WASM execution determinism
3. Show EIP-712 payload
4. Show Solidity verifier code

### Key Line to Say
"All logic is off-chain, all trust is on-chain."

---

## Persona B — Grant Committee / Foundation Reviewer

### What They Care About
- Public good value
- Ecosystem impact
- Non-custodial design

### Demo Emphasis
1. Problem slide (policy hard-coded today)
2. PAY.ID mental model
3. Demo ALLOW vs REJECT
4. Open-source repo & RFC

### Key Line to Say
"PAY.ID is infrastructure, not an app."

---

## Persona C — Bank / Fintech Reviewer

### What They Care About
- Risk control
- Auditability
- Regulatory alignment

### Demo Emphasis
1. Deterministic decision flow
2. Signed decision proof
3. Audit trail explanation
4. Bank / QRIS extension diagram

### Key Line to Say
"PAY.ID does not move money, it proves policy compliance."
