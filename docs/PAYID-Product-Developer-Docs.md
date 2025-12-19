# PAY.ID — Product & Developer Documentation

## 1. Product Overview

PAY.ID is a **verifiable payment policy protocol**.

PAY.ID allows developers to:
- define payment rules off-chain
- evaluate them deterministically
- produce cryptographically verifiable decisions
- enforce those decisions in smart contracts or backend systems

PAY.ID **does not**:
- custody funds
- execute transactions
- replace wallets or banks

Core idea:
> **Decision is separated from execution**

---

## 2. High-Level Flow

1. A payment intent is created
2. Context is constructed (who, what, how much, where)
3. Rules are evaluated off-chain (WASM)
4. Result = ALLOW / REJECT
5. A Decision Proof is signed
6. Verifier checks proof before execution

---

## 3. Installation

### 3.1 Backend (Node.js / Bun)

```bash
npm install @payid/sdk-core @payid/types
```

You also need a WASM rule engine binary.

---

### 3.2 Smart Contract (Solidity / Hardhat)

```bash
npm install @openzeppelin/contracts
```

Copy `PayIDVerifier.sol` into your contracts folder.

---

## 4. Backend Usage

### 4.1 Basic Rule Evaluation

```ts
import { PayID } from "@payid/sdk-core";

const payid = new PayID("./rule_engine.wasm");

const result = await payid.evaluate(context, ruleConfig);

if (result.decision !== "ALLOW") {
  throw new Error("Payment rejected");
}
```

---

### 4.2 Evaluate + Proof

```ts
const { result, proof } = await payid.evaluateAndProve({
  context,
  ruleConfig,
  payId: "pay.id/demo",
  owner: owner.address,
  signer: ownerWallet,
  chainId: 1,
  verifyingContract: verifierAddress
});
```

---

## 5. Smart Contract Usage

### 5.1 Verify Decision Proof

```solidity
PayIDVerifier verifier;

function execute(
  PayIDVerifier.Decision calldata d,
  bytes calldata sig
) external {
  verifier.requireAllowed(d, sig);
  // execute transfer
}
```

The smart contract:
- does NOT evaluate rules
- only verifies proofs

---

## 6. Supported Rules (v1)

### 6.1 Amount Rules

| Rule | Description | Example |
|----|----|----|
| min_amount | Minimum allowed amount | amount >= 100 |
| max_amount | Maximum allowed amount | amount <= 10000 |

```json
{
  "id": "min_amount",
  "if": { "field": "tx.amount", "op": ">=", "value": "100" }
}
```

---

### 6.2 Asset Rules

| Rule | Description |
|----|----|
| asset_allowlist | Only allow listed tokens |
| asset_denylist | Reject specific tokens |

```json
{
  "id": "asset_allowlist",
  "if": {
    "field": "tx.asset",
    "op": "in",
    "value": ["USDT","USDC"]
  }
}
```

---

### 6.3 Address Rules

| Rule | Description |
|----|----|
| sender_allowlist | Allowed senders |
| receiver_allowlist | Allowed receivers |

```json
{
  "id": "receiver_allowlist",
  "if": {
    "field": "tx.receiver",
    "op": "in",
    "value": ["0xSAFE"]
  }
}
```

---

### 6.4 Chain Rules

| Rule | Description |
|----|----|
| chain_allowlist | Allowed chains |

```json
{
  "id": "chain_allowlist",
  "if": {
    "field": "tx.chainId",
    "op": "in",
    "value": [1,137]
  }
}
```

---

## 7. Rule Composition

Rules are combined using:

```json
{
  "logic": "AND",
  "rules": [...]
}
```

Supported operators:
`==, !=, >, >=, <, <=, in, not_in`

---

## 8. Security Model

- Deterministic rule execution
- Fail-closed by default
- Minimal on-chain logic
- Explicit trust boundaries

---

## 9. Use Cases

- DAO treasury protection
- Smart account guards
- Payment simulations
- Compliance gating
- Hackathon demos

---

## 10. Roadmap Extensions

- Attested context (v2)
- Daily limits
- Oracle snapshots
- ERC-4337 deep integration

---

## End of Document
