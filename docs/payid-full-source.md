# PAY.ID — Complete Technical Documentation Source

This document is a complete, code-inclusive source of truth for PAY.ID.
It is intended to be used directly for documentation generation (including AI-based generation).

---

## 1. Overview

PAY.ID is an open-source protocol for verifiable payment policy.

PAY.ID:

- does NOT move money
- does NOT custody funds
- does NOT execute transactions

PAY.ID evaluates payment rules off-chain and produces cryptographically verifiable decisions.

---

## 2. Core Model

Context → Rules → Decision → Proof → Verify

---

## 3. Context Example

```json
{
  "tx": {
    "sender": "0xSenderAddress",
    "receiver": "0xReceiverAddress",
    "asset": "USDT",
    "amount": "150000000",
    "chainId": 1
  },
  "payId": {
    "id": "pay.id/demo",
    "owner": "0xOwnerAddress"
  }
}
```

---

## 4. Rule Configuration Example

```json
{
  "version": "1",
  "logic": "AND",
  "rules": [
    {
      "id": "min_amount",
      "if": {
        "field": "tx.amount",
        "op": ">=",
        "value": "100000000"
      }
    },
    {
      "id": "asset_allowlist",
      "if": {
        "field": "tx.asset",
        "op": "in",
        "value": ["USDT", "USDC"]
      }
    }
  ]
}
```

---

## 5. Supported Rule Operators

==, !=, >, >=, <, <=, in, not_in

---

## 6. Backend Usage (TypeScript)

```ts
import { PayID } from '@payid/sdk-core';

const payid = new PayID('./rule_engine.wasm');
const result = await payid.evaluate(context, ruleConfig);
console.log(result);
```

---

## 7. Decision Proof Generation

```ts
const { result, proof } = await payid.evaluateAndProve({
  context,
  ruleConfig,
  payId: 'pay.id/demo',
  owner: '0xOwner',
  signer: wallet,
  chainId: 1,
  verifyingContract: '0xVerifier',
});
```

---

## 8. Smart Contract Verification (Solidity)

```solidity
require(decision.decision == 1, "REJECTED");
require(decision.expiresAt >= block.timestamp, "EXPIRED");
```

---

## 9. ERC-4337 Usage

PAY.ID acts as a policy guard for smart accounts.
Decision Proofs are verified before execution.

---

## 10. Failure Semantics

Any error MUST result in REJECT (fail-closed).

---

## End of Document
