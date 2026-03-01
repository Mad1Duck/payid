---
id: intro
title: Introduction
sidebar_label: What is PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · ERC-4337 Ready**

PAY.ID is an open-source **policy & proof layer** for programmable payments. It answers one fundamental question:

> **"Should this transaction be allowed?"**

PAY.ID lets you define **payment rules** as data, evaluate them off-chain in a deterministic WASM engine, and generate a cryptographically signed **Decision Proof** verifiable on-chain by any smart contract.

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

---

## PAY.ID Is Not...

| ❌ Not          | ✅ But              |
| --------------- | ------------------- |
| Wallet          | Policy layer        |
| Payment gateway | Proof generator     |
| Custodian       | Identity protocol   |
| DeFi protocol   | ERC-4337 compatible |
| Blockchain / L2 | Chain-agnostic      |

---

## 4 Core Pillars

### 🪪 Payment Identity

`pay.id/yourname` is your **payment identity** — it carries your rules, not just your address.

### 📋 Rule Engine

Rules are **pure JSON configs** executed by a **sandboxed WASM engine**. Deterministic, auditable, immutable. Supports 3 formats: `SimpleRule`, `MultiConditionRule`, and `NestedRule`.

### 🔐 Decision Proof

Every evaluation produces an **EIP-712 signed proof** verifiable on-chain. Zero trust required.

### ⛓️ On-chain Enforcement

Smart contracts only verify the proof. They never execute or know the rules. **Contracts stay dumb.**

---

## Quick Flow

```ts
import { createPayID } from 'payid/client';

const payid = createPayID({});

const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: 'pay.id/merchant',
  payer: '0xPAYER',
  receiver: '0xRECEIVER',
  asset: USDC_ADDRESS,
  amount: 150_000_000n,
  signer,
  ttlSeconds: 300,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

await payContract.payERC20(proof.payload, proof.signature, []);
```

---

## Getting Started

- [ Quick Start →](./quickstart)
- [Installation & Setup →](./installation/setup)
- [Core Concepts →](./core-concepts/overview)
- [Rule Basics →](./rules/rule-basics)
