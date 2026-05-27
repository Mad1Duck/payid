---
id: bank-qris-bridge
title: Bank / QRIS Bridge
sidebar_label: Bank / QRIS Bridge
---

# 🏦 Bank / QRIS Bridge Integration

PAY.ID can act as a **policy oracle** for traditional fiat payment rails like QRIS, SWIFT, SEPA, and ACH — without ever custodying funds or executing settlements.

---

## Architecture Overview

```
End User → Bank App → PAY.ID Engine → Decision Proof → Bank Settlement
                  │
                  ▼
         Rule Authority (on-chain)
```

1. **User scans QRIS** → Bank app reads payload
2. **Bank app constructs PAY.ID context** with fiat fields
3. **PAY.ID evaluates** merchant rules off-chain
4. **PAY.ID returns `DecisionProof`** (EIP-712 signed)
5. **Bank verifies proof** → executes or rejects payment

---

## Extended Context Schema

Fiat payments extend the standard `RuleContext` with additional `tx` fields:

```typescript
interface FiatContext {
  tx: {
    // Standard fields
    sender: string;      // wallet or bank account hash
    receiver: string;    // merchant identifier
    asset: string;       // "IDR" | "USD" | "ETH"
    amount: string;      // smallest unit
    chainId?: number;    // optional for crypto-fiat hybrid

    // Fiat extension
    currency: string;     // ISO-4217: "IDR", "USD", "EUR"
    rail: string;       // "QRIS" | "SWIFT" | "SEPA" | "ACH" | "CARD"
    merchantId: string;   // MID
    psp: string;         // PSP code, e.g. "BANK_ABC"
    terminalId?: string; // POS terminal
    mcc?: string;        // Merchant Category Code
  };
  payId: { id: string; owner: string };
  env: { timestamp: number };
  oracle?: { kycLevel?: number; country?: string };
  risk?: { score?: number };
}
```

---

## Rule Examples

### PSP Allowlist
```json
{
  "id": "psp_allowlist",
  "if": {
    "field": "tx.psp",
    "op": "in",
    "value": ["BANK_ABC", "BANK_XYZ"]
  }
}
```

### MCC Blocklist
```json
{
  "id": "mcc_blocklist",
  "if": {
    "field": "tx.mcc",
    "op": "not_in",
    "value": ["7995", "7994"]
  }
}
```

### Combined Fiat Policy
```json
{
  "version": "1",
  "logic": "and",
  "rules": [
    { "id": "psp", "if": { "field": "tx.psp", "op": "in", "value": ["BANK_ABC"] } },
    { "id": "min", "if": { "field": "tx.amount", "op": ">=", "value": "10000" } },
    { "id": "mcc", "if": { "field": "tx.mcc", "op": "not_in", "value": ["7995"] } }
  ]
}
```

---

## Fiat Adapter

```typescript
import { createPayIDClient } from 'payid';
import type { RuleContext, DecisionProof } from 'payid';

interface QRISPayload {
  amount: string;
  currency: string;
  merchantId: string;
  pspCode: string;
  terminalId?: string;
  mcc?: string;
}

export class FiatAdapter {
  private client = createPayIDClient();

  async evaluatePayment(
    payload: QRISPayload,
    merchantRuleURI: string,
    signer: any
  ) {
    const context: RuleContext = {
      tx: {
        amount: payload.amount,
        currency: payload.currency,
        rail: 'QRIS',
        merchantId: payload.merchantId,
        psp: payload.pspCode,
        terminalId: payload.terminalId,
        mcc: payload.mcc,
        sender: 'bank:user:anon',
        receiver: payload.merchantId,
        asset: payload.currency,
      },
      payId: {
        id: `pay.id/${payload.merchantId}`,
        owner: payload.merchantId,
      },
      env: { timestamp: Math.floor(Date.now() / 1000) },
    };

    return this.client.evaluateAndProve({
      context,
      authorityRule: { uri: merchantRuleURI },
      payId: `pay.id/${payload.merchantId}`,
      payer: 'bank:user:anon',
      receiver: payload.merchantId,
      asset: payload.currency,
      amount: BigInt(payload.amount),
      signer,
      verifyingContract: '0x...',
      ruleAuthority: '0x...',
      chainId: 31337,
      blockTimestamp: context.env.timestamp,
    });
  }
}
```

---

## Failure Semantics

| Scenario | Result |
|----------|--------|
| Rule REJECT | Bank MUST reject |
| Evaluation error / timeout | Bank MUST reject (fail-closed) |
| Invalid proof signature | Bank MUST reject |
| Expired proof | Bank MUST reject |

---

## Regulatory Notes

- PAY.ID **does not replace** bank KYC — it **complements** it with programmable transaction-level policy
- No fiat custody → no banking license required for PAY.ID
- Context `sender` can be pseudonymized
- Evidence stored off-chain (IPFS/Arweave), only hashes on-chain

---

## Deployment Roadmap

| Phase | Milestone |
|-------|-----------|
| Phase 1 | QRIS MVP with single PSP (testnet) |
| Phase 2 | Multi-PSP support |
| Phase 3 | VRAN integration (merchant reputation) |
| Phase 4 | SWIFT / SEPA cross-border |
| Phase 5 | CBDC programmable policy pilot |
