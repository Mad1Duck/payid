# 🔐 PAY.ID — Threat Model & Security Notes

> **Scope:** PAY.ID Protocol v1  
> **Audience:** Protocol engineers, auditors, security reviewers  
> **Status:** Public Draft (Deep)

---

## 1. Scope & Assumptions

### 1.1 In-Scope Components

PAY.ID threat model mencakup:

- PAY.ID SDK
- Rule Resolver (IPFS / HTTP)
- Rule Engine (WASM)
- Decision Proof Generator (EIP-712)
- Solidity Verifier (on-chain)
- ERC-4337 integration boundary

---

### 1.2 Out-of-Scope Components

PAY.ID **TIDAK** menjamin keamanan:

- Wallet implementation (EOA / MPC / HW)
- Bundler infrastructure
- Paymaster logic
- RPC providers
- IPFS gateways availability

PAY.ID mengasumsikan:

- Blockchain consensus aman
- Cryptographic primitives (ECDSA, keccak256) aman

---

## 2. Security Philosophy

PAY.ID dibangun dengan prinsip:

1. **Fail-closed by default**
2. **Minimal trust surface**
3. **Deterministic execution**
4. **Explicit trust boundaries**
5. **Proof over trust**

> Jika sistem ragu → **REJECT transaksi**

---

## 3. Assets to Protect

### 3.1 Primary Assets

| Asset               | Description                                |
| ------------------- | ------------------------------------------ |
| Decision Integrity  | Keputusan rule tidak boleh dimanipulasi    |
| Authority Signature | Signature PAY.ID owner                     |
| Rule Integrity      | Rule config tidak boleh diubah diam-diam   |
| Determinism         | Input sama → output sama                   |
| Replay Safety       | Proof tidak bisa dipakai ulang sembarangan |

---

### 3.2 Secondary Assets

- UX clarity (reason, code)
- Auditability
- Backward compatibility

---

## 4. Trust Boundaries

┌────────────┐
│ User / App │
└─────┬──────┘
▼
┌────────────┐ ← Trust boundary
│ PAY.ID SDK │
└─────┬──────┘
▼
┌────────────┐ ← Trust boundary
│ Rule Engine│
│ (WASM) │
└─────┬──────┘
▼
┌────────────┐
│ Decision │
│ Proof │
└─────┬──────┘
▼
┌────────────┐ ← Trust boundary
│ Blockchain │
│ Verifier │
└────────────┘

Each boundary assumes **hostile input**.

---

## 5. Threat Enumeration (STRIDE-based)

---

### 5.1 Spoofing

#### Threat: Fake PAY.ID owner signs proof

- **Vector:** Attacker forges signature
- **Mitigation:**
  - EIP-712 typed data
  - On-chain signature recovery
  - Owner address embedded in payload
- **Residual Risk:** Wallet compromise (out-of-scope)

---

### 5.2 Tampering

#### Threat: Rule config modified in transit

- **Vector:** IPFS gateway / HTTP MITM
- **Mitigation:**
  - keccak256 hash verification
  - Immutable rule reference
- **Fail Behavior:** REJECT

---

#### Threat: Context manipulation after decision

- **Vector:** App changes tx after proof
- **Mitigation:**
  - `contextHash` embedded in proof
  - On-chain verifier recomputes digest
- **Fail Behavior:** Signature invalid

---

### 5.3 Repudiation

#### Threat: Owner denies decision

- **Vector:** Claim decision never approved
- **Mitigation:**
  - Signed EIP-712 payload
  - Nonce + timestamp
- **Auditability:** Strong

---

### 5.4 Information Disclosure

#### Threat: Sensitive data leaked via rule/reason

- **Vector:** Rule reason includes private info
- **Mitigation:**
  - Reason is off-chain only
  - Proof excludes reason
- **Guidance:** Never include PII in rule config

---

### 5.5 Denial of Service (DoS)

#### Threat: Rule resolver unavailable

- **Vector:** IPFS / HTTP down
- **Mitigation:**
  - Fail-closed
  - Multiple gateways (future)
- **Impact:** Temporary rejection only

---

#### Threat: WASM resource exhaustion

- **Vector:** Malicious rule config
- **Mitigation:**
  - Execution time limit
  - Memory limit
  - No recursion
- **Fail Behavior:** REJECT

---

### 5.6 Elevation of Privilege

#### Threat: Rule executes side-effects

- **Vector:** WASM escapes sandbox
- **Mitigation:**
  - No syscalls
  - No filesystem
  - No network
  - Deterministic WASM runtime
- **Residual Risk:** WASM runtime bug (low)

---

## 6. Rule Engine Security

### 6.1 Determinism Guarantees

Rule engine enforces:

- ❌ No randomness
- ❌ No clock
- ❌ No network
- ❌ No file access
- ❌ No global mutable state

Supported operations:

- JSON parsing
- Numeric comparison
- String equality
- Array membership

---

### 6.2 Panic & Crash Handling

- Panic → execution abort
- Abort → REJECT
- No partial state

---

## 7. Decision Proof Security

### 7.1 Replay Attacks

#### Threat

- Proof reused for different tx

#### Mitigations

- `expiresAt`
- `nonce`
- `contextHash`
- Optional: on-chain nonce tracking (app-level)

---

### 7.2 Signature Malleability

- ECDSA malleability mitigated by OpenZeppelin ECDSA
- v/r/s normalized

---

### 7.3 Domain Separation

- EIP-712 domain includes:
  - name
  - version
  - chainId
  - verifyingContract

Prevents:

- Cross-chain replay
- Cross-contract replay

---

## 8. ERC-4337 Specific Threats

### 8.1 Bundler Manipulation

- Bundler cannot forge decision proof
- Bundler only relays UserOperation
- Smart account verifies proof

---

### 8.2 Paymaster Abuse

- Paymaster may sponsor gas for REJECTED tx
- Mitigation:
  - Paymaster SHOULD verify proof off-chain
- PAY.ID is agnostic to paymaster policy

---

## 9. On-chain Verifier Threats

### 9.1 Gas Griefing

- Verification cost is bounded
- No loops over unbounded data

---

### 9.2 Storage Corruption

- Verifier stores no state
- Stateless verification

---

## 10. Known Limitations

- Wallet compromise breaks authority
- SDK misuse can bypass PAY.ID (by design)
- No global replay protection (app responsibility)

---

## 11. Recommended Best Practices

### For App Developers

- Always verify proof on-chain
- Never trust off-chain ALLOW without proof
- Use short `expiresAt`
- Track nonces for high-value actions

---

### For Rule Authors

- Keep rules simple
- Avoid large arrays
- Avoid sensitive data
- Prefer allowlist over denylist

---

### For PAY.ID Owners

- Use hardware wallet or MPC
- Rotate rules via new hash
- Monitor signed decisions

---

## 12. Audit Checklist

- [ ] EIP-712 domain matches SDK
- [ ] Rule hash verified
- [ ] Expiry enforced
- [ ] Decision enforced on-chain
- [ ] No side effects in rule engine
- [ ] Fail-closed everywhere

---

## 13. Future Hardening (v2)

- Multi-sig authority
- On-chain nonce registry
- Rule attestation registry
- Zero-knowledge rule proofs (research)

---

## 14. Summary

PAY.ID minimizes risk by:

- Moving logic off-chain
- Keeping on-chain contracts dumb
- Using cryptographic proofs
- Enforcing strict boundaries

> **If PAY.ID fails, it fails safely.**

---

## Final Statement

> **PAY.ID does not attempt to be unhackable.  
> It is designed to be hard to misuse,  
> easy to audit,  
> and safe when something goes wrong.**
