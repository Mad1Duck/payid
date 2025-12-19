# 📐 PAY.ID — Architecture Whitepaper

> **Programmable Payment Identity Protocol**  
> Version: v1  
> Status: Public Draft

---

## 1. Executive Summary

**PAY.ID** adalah **policy & proof layer** untuk sistem pembayaran digital.

Alih-alih memindahkan dana atau menjadi payment rail, PAY.ID memutuskan:

> **“Apakah sebuah transaksi boleh terjadi?”**

Keputusan ini:

- Dieksekusi **off-chain**
- Bersifat **deterministic**
- Dapat dibuktikan **on-chain** melalui **Decision Proof**

PAY.ID dirancang untuk:

- Crypto-native
- Non-custodial
- ERC-4337 compatible
- Bank / QRIS extensible (future)

---

## 2. Problem Statement

### 2.1 Masalah pada sistem pembayaran saat ini

1. **Identity ≠ Policy**
   - Address / account tidak membawa aturan
2. **Logic terlalu on-chain**
   - Mahal, kaku, sulit di-upgrade
3. **UX buruk**
   - Wallet-centric, bukan user-centric
4. **Tidak ada portable enforcement**
   - Policy tidak bisa dibawa lintas app

---

## 3. Design Goals

PAY.ID dirancang dengan prinsip:

1. **Identity-first**
2. **Rule-based (data-driven)**
3. **Off-chain execution**
4. **On-chain verification**
5. **Fail-closed by default**
6. **Minimal trust surface**

---

## 4. Non-Goals (Explicit)

PAY.ID **BUKAN**:

- Wallet
- Payment gateway
- Custodian
- DeFi protocol
- Blockchain payment rail

PAY.ID **TIDAK**:

- Menyimpan dana
- Mengirim transaksi
- Membayar gas
- Menjadi bundler / paymaster

---

## 5. Core Concepts

### 5.1 PAY.ID

**PAY.ID** adalah **payment identity** yang merepresentasikan:

- Owner (wallet / authority)
- Rule set
- Configuration metadata

PAY.ID ≠ address  
PAY.ID ≠ ENS

PAY.ID = **intent identity**

---

### 5.2 Rule

Rule adalah **guardrail** yang memutuskan:

- `ALLOW`
- `REJECT`

Karakteristik rule:

- Deterministic
- No side effects
- No network
- No randomness

Rule tidak:

- Mengirim dana
- Mengubah state
- Menyimpan data

---

### 5.3 Decision Proof

Decision Proof adalah:

- Signed statement (EIP-712)
- Menyatakan hasil evaluasi rule
- Diverifikasi on-chain

Decision Proof = **bridge antara off-chain logic & on-chain enforcement**

---

## 6. High-Level Architecture

User / App
│
▼
PAY.ID SDK
│
├─ Rule Resolver (IPFS / HTTP)
│
├─ Rule Engine (WASM, off-chain)
│
├─ Decision Proof Generator
│
▼
Decision Proof
│
▼
Smart Contract Verifier

---

## 7. Component Breakdown

### 7.1 PAY.ID SDK

Tanggung jawab:

- Normalize context
- Resolve rule
- Execute rule engine
- Generate decision proof
- Build ERC-4337 UserOperation (optional)

SDK **tidak**:

- Mengirim transaksi
- Membayar gas
- Mengelola bundler

---

### 7.2 Rule Resolver

Rule dapat berasal dari:

- IPFS (`ipfs://`)
- HTTP(S)

Resolver:

- Fetch rule config
- Verify integrity (hash)
- Fail-closed on error

---

### 7.3 Rule Engine (WASM)

Rule engine:

- Single generic WASM
- Rule logic = JSON config
- Execution sandboxed

WASM constraints:

- No filesystem
- No network
- No clock
- No randomness
- Memory limited

---

### 7.4 Decision Proof Generator

Decision Proof:

- Canonical payload
- EIP-712 typed data
- Signed by PAY.ID owner

Payload berisi:

- payId
- owner
- decision
- contextHash
- ruleSetHash
- expiry
- nonce

---

### 7.5 Smart Contract Verifier

Smart contract hanya:

- Verify signature
- Check expiry
- Enforce decision

Smart contract **tidak tahu**:

- Rule logic
- IPFS
- WASM
- SDK internals

---

## 8. Execution Flow

### 8.1 Off-chain Flow

Context
↓
Rule Resolve
↓
Rule Execution (WASM)
↓
Decision
↓
Decision Proof (signed)

yaml
Copy code

---

### 8.2 On-chain Flow

Decision Proof
↓
EIP-712 Verification
↓
ALLOW → continue
REJECT → revert

yaml
Copy code

---

## 9. ERC-4337 Compatibility

PAY.ID mendukung Account Abstraction:

- Smart Account = transaction executor
- PAY.ID owner = policy authority
- Bundler = transport layer

Boundary:
PAY.ID → decides
Smart Account → executes
Bundler → broadcasts

yaml
Copy code

PAY.ID **tidak**:

- Menjadi bundler
- Menjadi paymaster

---

## 10. Security Model

### 10.1 Trust Assumptions

| Component      | Trust Level       |
| -------------- | ----------------- |
| Rule Engine    | Deterministic     |
| SDK            | Open-source       |
| Rule Source    | Verified via hash |
| Smart Contract | Minimal           |
| Blockchain     | Source of truth   |

---

### 10.2 Fail-Closed Principle

Jika terjadi:

- Rule invalid
- Resolver error
- WASM error
- Hash mismatch
- Signature invalid

➡️ **Decision = REJECT**

---

## 11. Determinism Guarantees

PAY.ID menjamin:

- Same input → same output
- No hidden state
- No time dependency
- No randomness

Didukung oleh:

- WASM sandbox
- Golden test vectors
- Canonical hashing

---

## 12. Extensibility

PAY.ID dapat diperluas ke:

- Bank / QRIS
- Compliance rules
- DAO / multisig
- Spending limits
- Time-based policies

Tanpa mengubah:

- Smart contract
- Rule engine binary

---

## 13. Comparison

| Feature             | PAY.ID | Wallet | Payment Gateway |
| ------------------- | ------ | ------ | --------------- |
| Policy layer        | ✅     | ❌     | ⚠️              |
| Non-custodial       | ✅     | ✅     | ❌              |
| On-chain verifiable | ✅     | ❌     | ❌              |
| ERC-4337 ready      | ✅     | ⚠️     | ❌              |

---

## 14. Design Philosophy

> **Move logic off-chain.  
> Keep proof on-chain.  
> Keep contracts dumb.**

---

## 15. Conclusion

PAY.ID adalah:

- Bukan aplikasi
- Bukan wallet
- Bukan payment rail

PAY.ID adalah **infrastructure protocol**  
untuk **policy-driven payments** di era crypto & account abstraction.

---

## Appendix A — Terminology

- **Policy**: aturan yang membatasi transaksi
- **Decision Proof**: bukti kriptografis keputusan
- **Authority**: signer PAY.ID owner
- **Enforcement**: on-chain verification

---

## Appendix B — Versioning

- Protocol: `v1`
- Decision Proof: `payid.decision.v1`
- Rule Engine: `generic.wasm`

---

## Final Note

> **PAY.ID does not move money.  
> PAY.ID decides whether money is allowed to move.**
