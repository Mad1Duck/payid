# 📘 PAY.ID — Developer Quick Start

> **Programmable Payment Identity**  
> One ID · Rule-based · Non-custodial · ERC-4337 Ready

---

## 🧠 What is PAY.ID (1 minute)

**PAY.ID** lets developers:

- Use **one identifier** (`pay.id/yourname`)
- Define **payment rules** (off-chain, deterministic)
- Generate **Decision Proof** verifiable on-chain
- Work with **EOA and ERC-4337 Smart Accounts**

PAY.ID is **not**:

- a wallet
- a payment gateway
- a DeFi protocol

PAY.ID **is** a **policy + proof layer**.

---

## ⚡ TL;DR (10 minutes to running)

1. Install SDK
2. Load WASM rule engine
3. Evaluate rule
4. (Optional) Generate Decision Proof
5. (Optional) Send via ERC-4337

---

## 1️⃣ Installation

```bash
npm install @payid/sdk-core ethers
Requirements
Node.js ≥ 18 or Bun

rule_engine.wasm (compiled rule engine)
```

2️⃣ Minimal Rule Configuration
Copy code

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
    }
  ]
}
```

Rules are:

- Immutable
- Data-driven
- Executed off-chain

3️⃣ Minimal Context

```ts
import type { RuleContext } from '@payid/sdk-core';

export const context: RuleContext = {
  tx: {
    sender: '0x0000000000000000000000000000000000000001',
    asset: 'USDT',
    amount: '150000000',
    chainId: 1,
  },
  payId: {
    id: 'pay.id/demo',
    owner: '0xOWNER_ADDRESS',
  },
};
```

4️⃣ Evaluate Rule (Basic)

```ts
Copy code
import { PayID } from "@payid/sdk-core";

const payid = new PayID("./rule_engine.wasm");

const result = await payid.evaluate(context, ruleConfig);

console.log(result);
```

Example Output

```json
{
  "decision": "ALLOW",
  "code": "OK",
  "reason": "all rules passed"
}
```

Decision Semantics
Decision Meaning
ALLOW Transaction may proceed
REJECT Transaction must stop

5️⃣ Evaluate + Decision Proof (EIP-712)

```ts
Copy code
import { ethers } from "ethers";

const wallet = new ethers.Wallet(PRIVATE_KEY);

const { result, proof } = await payid.evaluateAndProve({
  context,
  ruleConfig,
  payId: "pay.id/demo",
  owner: wallet.address,
  signer: wallet,
  chainId: 1,
  verifyingContract: "0xPAYID_VERIFIER"
});
```

Output

```ts
{
  result: { decision: "ALLOW", ... },
  proof: {
    payload: { ... },
    signature: "0x..."
  }
}
```

The proof can be verified on-chain.

6️⃣ Resolve Rules from IPFS / HTTP

```ts
Copy code
const { result } = await payid.evaluateWithRuleSource(
  context,
  {
    uri: "ipfs://QmRuleCID",
    hash: "0xRuleHash"
  }
);
```

Resolver behavior:

- Verifies content hash
- Fail-closed on error
- Supports ipfs:// and https://

7️⃣ ERC-4337 (Smart Account Ready)

```ts
const { result, userOp } = await payid.evaluateProveAndBuildUserOp({
  context,
  ruleSource: {
    uri: 'ipfs://QmRuleCID',
    hash: '0xRuleHash',
  },

  payId: 'pay.id/demo',
  owner: ownerWallet.address,
  signer: ownerWallet,

  smartAccount: '0xSMART_ACCOUNT',
  targetContract: '0xPAY_CONTRACT',
  nonce: '0x01',

  gas: {
    callGasLimit: '120000',
    verificationGasLimit: '250000',
    preVerificationGas: '60000',
    maxFeePerGas: '30000000000',
    maxPriorityFeePerGas: '2000000000',
  },

  chainId: 1,
  verifyingContract: '0xPAYID_VERIFIER',
});

// Send to bundler
await bundler.sendUserOperation(userOp);
```

PAY.ID:

- Does NOT act as bundler
- Does NOT pay gas
- Is ERC-4337 native

8️⃣ Solidity Verifier (On-chain)

```solidity
verifier.requireAllowed(decision, signature);
```

Smart contracts:

- Do not know rules
- Do not know IPFS
- Only verify Decision Proof

9️⃣ Error Handling Model
| Case | Result |
| ---------------- | -------- |
| Rule fails | `REJECT` |
| Rule invalid | `REJECT` |
| WASM error | `REJECT` |
| Rule fetch fails | `REJECT` |
| SDK misuse | `throw` |

PAY.ID is fail-closed by default.

🔐 Security Model (Summary)

- Rule = immutable data
- Execution = deterministic WASM
- Proof = signed EIP-712
- On-chain = verification only

🧩 Mental Model

```mathematica
Wallet        → Authority
PAY.ID        → Identity
Rules         → Guardrails
WASM          → Interpreter
SDK           → Enforcer
Blockchain    → Verifier
📁 Repository Structure
pgsql
Copy code
packages/
├── sdk-core
├── rule-engine
├── types
└── examples
🚀 What’s Next?
Rule Pack v1 (standard rules)

DAO / multisig rules

Paymaster integration

Threat model documentation
```

PAY.ID is not about sending money.
It is about deciding whether money should move.
