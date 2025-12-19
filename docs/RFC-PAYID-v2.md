# RFC PAY.ID v2 — Attested Context Extension

## Status
Draft

## Abstract
This RFC defines PAY.ID v2 as a backward-compatible extension introducing **attested context inputs**
to support time-based, cumulative, oracle-based, and risk-aware rules without breaking deterministic
rule execution.

PAY.ID v1 remains unchanged and fully supported.

---

## Design Goals

- Preserve PAY.ID v1 semantics
- Keep rule engine deterministic and stateless
- Introduce state and external data ONLY via signed attestations
- Make trust explicit and verifiable

---

## Compatibility

- PAY.ID v1 context is fully valid in v2
- v2 context fields are OPTIONAL
- Rules MUST declare required context fields
- Missing required fields MUST result in REJECT

---

## Core Principle

> Rules do not access time, storage, or network.
> Rules only evaluate context.
> Context may include attested claims.

---

## New Concepts

### Attestation
A cryptographically signed claim about some external or stateful fact.

Common fields:
- issuer
- signature
- issuedAt
- expiresAt
- scope

---

## Context v2 Namespaces

New optional namespaces:
- env
- state
- oracle
- risk

Each namespace MUST include a corresponding proof object.

---

## Verification Rules

- All attestations MUST be verified before rule evaluation
- Issuer allowlists are verifier-defined
- Expired attestations MUST be rejected

---

## Security Considerations

- Attestors are explicit trust anchors
- Compromised attestors can be rotated
- No implicit trust in backend clocks or databases

---

## Conclusion

PAY.ID v2 extends expressiveness while preserving the original protocol guarantees.
