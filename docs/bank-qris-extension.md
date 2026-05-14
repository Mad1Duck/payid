# 🏦 PAY.ID — Bank / QRIS Extension Specification

**Version:** 1.1 (Implementation Draft)  
**Status:** Non-normative extension  
**Last Updated:** May 2026

---

## Status of This Memo

This document specifies a non-normative extension for integrating PAY.ID with
banking and QRIS payment rails. It has been expanded from the original v1.0
specification memo to include concrete implementation architecture, adapter
patterns, and reference code.

---

## 1. Design Principles

| Principle | Enforcement |
|-----------|-------------|
| **No Fiat Custody** | PAY.ID never holds fiat funds. The protocol only reads policy state and emits decision proofs. |
| **No Settlement** | PAY.ID never executes fund transfers. Banks and PSPs remain the sole settlement layer. |
| **Policy Oracle Only** | PAY.ID evaluates programmable rules and returns a signed `DecisionProof`. The bank decides whether to act on it. |
| **Fail-Closed** | Any evaluation error, timeout, or missing rule → implicit REJECT. |
| **Complement AML/KYC** | PAY.ID does not replace bank compliance systems; it augments them with programmable policy. |

---

## 2. High-Level Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│   End User  │────▶│   Bank App  │────▶│  PAY.ID Engine  │────▶│  Decision   │────▶│    Bank      │
│ (Scan QRIS) │     │             │     │  (Off-chain)    │     │   Proof     │     │  Settlement │
└─────────────┘     └─────────────┘     └─────────────────┘     └─────────────┘     └──────────────┘
                                               │
                                               ▼
                                        ┌─────────────────┐
                                        │  Rule Authority │
                                        │  (On-chain)     │
                                        └─────────────────┘
```

1. **User scans QRIS** → Bank app reads QRIS payload (merchant ID, amount, currency).
2. **Bank app constructs PAY.ID context** with fiat rail fields (`currency`, `rail`, `psp`).
3. **PAY.ID evaluates** the merchant's rule set against the enriched context.
4. **PAY.ID returns a `DecisionProof`** (EIP-712 signed statement).
5. **Bank verifies the proof** (on-chain or via SDK) and **executes or rejects** the payment.

---

## 3. Extended Context Schema

PAY.ID's standard context (`tx`, `payId`, `env`, `oracle`, `risk`, `state`) is extended with fiat-specific fields under `tx`:

```typescript
interface FiatContext {
  tx: {
    // Standard fields
    sender: string;      // user wallet OR bank account hash
    receiver: string;    // merchant wallet OR bank account hash
    asset: string;       // "IDR" | "USD" | "ETH" | "USDC"
    amount: string;      // smallest unit (e.g. IDR satang, USD cents)
    chainId?: number;    // omitted for pure fiat rails

    // Fiat extension fields
    currency: string;     // ISO-4217 code: "IDR", "USD", "EUR"
    rail: string;       // "QRIS" | "SWIFT" | "SEPA" | "ACH" | "CARD"
    merchantId: string;   // MID or merchant identifier
    psp: string;         // Payment Service Provider code, e.g. "BANK_ABC"
    terminalId?: string; // Optional POS terminal identifier
    mcc?: string;        // Merchant Category Code (ISO 18245)
  };
  payId: {
    id: string;          // "pay.id/merchant"
    owner: string;        // merchant wallet address or bank account hash
  };
  env: {
    timestamp: number;    // Unix seconds
  };
  oracle?: {
    kycLevel?: number;   // Bank KYC tier (1-3)
    country?: string;    // ISO-3166 alpha-2
  };
  risk?: {
    score?: number;      // 0-100 risk score from bank's risk engine
  };
}
```

### Example Context (QRIS IDR)

```json
{
  "tx": {
    "amount": "150000",
    "currency": "IDR",
    "rail": "QRIS",
    "merchantId": "MID123",
    "psp": "BANK_ABC",
    "mcc": "5411",
    "sender": "0x71C7...976F",
    "receiver": "0xAbCd...Ef12"
  },
  "payId": {
    "id": "pay.id/merchant",
    "owner": "0xAbCd...Ef12"
  },
  "env": {
    "timestamp": 1750000000
  },
  "oracle": {
    "kycLevel": 2,
    "country": "ID"
  }
}
```

---

## 4. Rule Examples

### 4.1 Minimum Fiat Amount
```json
{
  "id": "min_amount_fiat",
  "if": {
    "field": "tx.amount",
    "op": ">=",
    "value": "10000"
  },
  "message": "Minimum transaction amount is IDR 10,000"
}
```

### 4.2 PSP Allowlist
```json
{
  "id": "psp_allowlist",
  "if": {
    "field": "tx.psp",
    "op": "in",
    "value": ["BANK_ABC", "BANK_XYZ", "FI_CORE"]
  },
  "message": "PSP not in approved list"
}
```

### 4.3 Currency Restriction
```json
{
  "id": "idr_only",
  "if": {
    "field": "tx.currency",
    "op": "eq",
    "value": "IDR"
  },
  "message": "Only IDR payments accepted"
}
```

### 4.4 MCC Blocklist (Gaming / Gambling)
```json
{
  "id": "mcc_blocklist",
  "if": {
    "field": "tx.mcc",
    "op": "not_in",
    "value": ["7995", "7994", "5122"]
  },
  "message": "Merchant category not allowed"
}
```

### 4.5 QRIS Rail Only
```json
{
  "id": "qris_only",
  "if": {
    "field": "tx.rail",
    "op": "eq",
    "value": "QRIS"
  },
  "message": "Only QRIS payments accepted"
}
```

### 4.6 Combined Fiat Policy (Nested)
```json
{
  "version": "1",
  "logic": "and",
  "rules": [
    {
      "id": "psp_allowlist",
      "if": { "field": "tx.psp", "op": "in", "value": ["BANK_ABC", "BANK_XYZ"] }
    },
    {
      "id": "min_amount",
      "if": { "field": "tx.amount", "op": ">=", "value": "10000" }
    },
    {
      "id": "max_amount",
      "if": { "field": "tx.amount", "op": "<=", "value": "100000000" }
    },
    {
      "id": "mcc_check",
      "if": { "field": "tx.mcc", "op": "not_in", "value": ["7995"] }
    },
    {
      "id": "business_hours",
      "if": { "field": "env.timestamp|hour", "op": "between", "value": [9, 17] }
    }
  ]
}
```

---

## 5. Implementation Architecture

### 5.1 PSP Adapter Pattern

Banks and PSPs integrate PAY.ID through a lightweight **adapter layer** that normalizes their internal payload into PAY.ID context.

```typescript
// packages/sdk-core/src/adapters/fiatAdapter.ts

import { createPayIDClient } from '@payid/sdk-core';
import type { RuleContext, DecisionProof } from '@payid/sdk-core';

interface QRISPayload {
  amount: string;        // e.g. "150000"
  currency: string;        // "IDR"
  merchantId: string;
  pspCode: string;
  terminalId?: string;
  mcc?: string;
  userWallet?: string;   // optional linked wallet
}

export class FiatAdapter {
  private client = createPayIDClient();

  async evaluatePayment(
    payload: QRISPayload,
    merchantRuleURI: string,
    signer: ethers.Signer
  ): Promise<{ allowed: boolean; proof?: DecisionProof; reason?: string }> {
    const context: RuleContext = {
      tx: {
        amount: payload.amount,
        currency: payload.currency,
        rail: 'QRIS',
        merchantId: payload.merchantId,
        psp: payload.pspCode,
        terminalId: payload.terminalId,
        mcc: payload.mcc,
        sender: payload.userWallet ?? 'bank:user:anon',
        receiver: payload.merchantId,
        asset: payload.currency,
      },
      payId: {
        id: `pay.id/${payload.merchantId}`,
        owner: payload.merchantId,
      },
      env: { timestamp: Math.floor(Date.now() / 1000) },
    };

    const { result, proof } = await this.client.evaluateAndProve({
      context,
      authorityRule: { uri: merchantRuleURI },
      payId: `pay.id/${payload.merchantId}`,
      payer: payload.userWallet ?? 'bank:user:anon',
      receiver: payload.merchantId,
      asset: payload.currency,
      amount: BigInt(payload.amount),
      signer,
      verifyingContract: PAYID_VERIFIER_ADDRESS,
      ruleAuthority: RULE_AUTHORITY_ADDRESS,
      chainId: 31337, // or the bank's permissioned chain
      blockTimestamp: context.env.timestamp,
    });

    return {
      allowed: result.decision === 'ALLOW',
      proof: proof ?? undefined,
      reason: result.decision === 'REJECT' ? result.reason : undefined,
    };
  }
}
```

### 5.2 Bank Verification Endpoint

The bank's backend verifies the `DecisionProof` before settling:

```typescript
// bank-backend/src/payid/verify.ts
import { verifyDecision } from '@payid/contracts'; // ABI helper

export async function verifyPaymentProof(
  proof: DecisionProof,
  expectedMerchant: string
): Promise<boolean> {
  // 1. Verify EIP-712 signature on-chain
  const valid = await verifyDecision(proof);
  if (!valid) return false;

  // 2. Check proof expiry
  if (proof.payload.expiresAt < Math.floor(Date.now() / 1000)) return false;

  // 3. Check merchant binding
  if (proof.payload.receiver !== expectedMerchant) return false;

  // 4. Check amount binding
  if (proof.payload.amount !== expectedAmount) return false;

  return true;
}
```

---

## 6. Failure Semantics

| Scenario | Behavior |
|----------|----------|
| Rule evaluation returns REJECT | Bank MUST reject the payment. |
| Rule evaluation throws / times out | Bank MUST reject the payment (fail-closed). |
| DecisionProof signature invalid | Bank MUST reject the payment. |
| DecisionProof expired | Bank MUST reject the payment. |
| Missing merchant rule set | Bank MUST reject the payment. |
| PSP not in allowlist | Rule evaluation returns REJECT → Bank rejects. |

---

## 7. Regulatory Alignment

### 7.1 AML/KYC Complementarity

PAY.ID does not replace bank KYC. It **complements** it by adding programmable policy:
- Bank performs KYC during onboarding.
- PAY.ID enforces **ongoing transaction-level policies** (amount limits, PSP restrictions, time windows).
- Together they satisfy both **customer due diligence** (KYC) and **transaction monitoring** (policy).

### 7.2 Data Privacy

- PAY.ID stores **hashes** and **rule configurations**, not PII.
- Context fields like `sender` can be pseudonymized (`bank:user:hash`) rather than raw account numbers.
- Evidence in VRAN reports is stored on IPFS/Arweave, with only the CID on-chain.

### 7.3 Licensing

- PAY.ID does **not** require a banking license because it never custody funds or execute settlements.
- Banks remain fully licensed and responsible for settlement.

---

## 8. Deployment Roadmap

| Phase | Milestone |
|-------|-----------|
| **Phase 1** | MVP adapter for a single PSP (e.g. QRIS via BANK_ABC). Testnet only. |
| **Phase 2** | Multi-PSP support with standardized `psp` field mapping. |
| **Phase 3** | VRAN integration — merchant reputation + blacklist checks before fiat payment. |
| **Phase 4** | Cross-border rails (SWIFT, SEPA) with currency conversion policies. |
| **Phase 5** | Central bank pilot — programmable CBDC policy via PAY.ID rules. |

---

## 9. Summary

PAY.ID enables **programmable policy for fiat rails** without becoming a bank, custodian, or payment processor. By acting as a neutral policy oracle, it allows traditional financial institutions to adopt Web3-style programmable rules while remaining fully compliant with existing regulatory frameworks.

**Key Takeaway:** *PAY.ID moves policy logic off-chain and brings cryptographic proof on-chain — for both crypto and fiat payments.*
