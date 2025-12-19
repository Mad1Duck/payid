# PAY.ID — Grant Interview Q&A Simulation

---

## Q1: Why does PAY.ID need to exist?
**Answer:**  
Payment systems lack a portable, verifiable policy layer. PAY.ID introduces policy as a first-class, cryptographically provable object.

---

## Q2: Why is this off-chain?
**Answer:**  
Policy logic changes frequently. Off-chain execution enables flexibility while on-chain proofs preserve trust.

---

## Q3: Why not do this directly in smart contracts?
**Answer:**  
On-chain logic is expensive, rigid, and difficult to upgrade. PAY.ID separates decision from execution.

---

## Q4: What prevents abuse?
**Answer:**  
Deterministic execution, fail-closed behavior, and cryptographic verification.

---

## Q5: Is this centralized?
**Answer:**  
No. Anyone can self-host. PAY.ID does not custody funds or control execution.

---

## Q6: How does this benefit the ecosystem?
**Answer:**  
It enables safer, composable payments across smart contracts, smart accounts, and fiat rails.

---

## Q7: What will grant funding be used for?
**Answer:**  
Protocol hardening, rule packs, documentation, and developer tooling.

---

## Q8: What happens if PAY.ID fails?
**Answer:**  
The system fails safely. Transactions are rejected, not silently executed.
