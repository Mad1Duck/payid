---
id: intro
title: Introduction
sidebar_label: What is PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · ERC-4337 Ready**

## The Simple Idea 💡

Imagine you're a merchant. You want to accept payments, but only under certain conditions:
- Only stablecoins (USDC, USDT)
- Only between $10–$500
- Only during business hours
- Only from verified customers

Normally, enforcing these rules would require a backend server, a database, and complex code. **PAY.ID lets you define these rules as simple JSON files** — and enforces them automatically on any blockchain, without you running a server.

> **PAY.ID answers one fundamental question: "Should this transaction be allowed?"**

---

## How It Works — The Big Picture

Think of PAY.ID like a **smart security guard** for your payments:

```
[Payer wants to send money]
        ↓
[Security Guard checks your rules]  ← This is PAY.ID
        ↓                    ↓
   [ALLOWED ✅]          [BLOCKED ❌]
        ↓
[Smart contract on blockchain]
        ↓
   [Money transferred]
```

More technically:

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

| Step | What Happens |
|---|---|
| **Context** | PAY.ID collects info: who's paying, what token, how much, when |
| **Rules** | Your rules are evaluated in a fast, secure WASM engine |
| **Decision** | Result is ALLOW ✅ or REJECT ❌ |
| **Proof** | If ALLOW, a cryptographic proof is generated (signed with payer's wallet) |
| **Verify** | Smart contract checks the proof, then transfers money or reverts |

---

## PAY.ID Is NOT...

| ❌ Not | ✅ But |
| --- | --- |
| A wallet | A policy layer for payments |
| A payment gateway | A cryptographic proof generator |
| A custodian (holds your money) | An identity + rules protocol |
| A DeFi protocol | ERC-4337 compatible |
| A blockchain or L2 | Works on any EVM chain |

---

## The 4 Core Pillars

### 🪪 1. Payment Identity

`pay.id/yourname` is your **payment identity**. It's not just a wallet address — it carries your payment rules. When someone pays you, the rules attached to your ID are automatically checked.

### 📋 2. Rule Engine

Rules are **pure JSON configs** evaluated in a sandboxed WASM engine. They are:
- **Deterministic** — same input always produces same output
- **Auditable** — anyone can read the rules
- **Immutable** — stored on IPFS + hashed on-chain

There are 3 rule formats: `SimpleRule`, `MultiConditionRule`, and `NestedRule`. See [Rule Basics →](./rules/rule-basics)

### 🔐 3. Decision Proof

Every evaluation produces an **EIP-712 signed proof** — a cryptographic receipt that says "this payment was checked and approved at this moment." The proof is signed by the payer's own wallet, so no trusted third party is needed.

### ⛓️ 4. On-chain Enforcement

Smart contracts only verify the proof. They **never see or execute the rules**. This keeps contracts simple, cheap to run, and easy to audit.

---

## Quick Code Preview

```ts
import { createPayID } from 'payid/client';

// 1. Create the SDK
const payid = createPayID({});

// 2. Evaluate rules and generate proof (signed by payer's wallet)
const { result, proof } = await payid.evaluateAndProve({
  context,        // payment details (who, what, how much)
  authorityRule,  // merchant's rules loaded from blockchain
  payId: 'pay.id/merchant',
  payer: '0xPAYER',
  receiver: '0xRECEIVER',
  asset: USDC_ADDRESS,
  amount: 150_000_000n, // 150 USDC (6 decimals)
  signer,
  ttlSeconds: 300, // proof valid for 5 minutes
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

// 3. Send to blockchain (only if rules passed)
if (proof) {
  await payContract.payERC20(proof.payload, proof.signature, []);
}
```

---

## Getting Started

- [⚡ Quick Start →](./quickstart) — Zero to first payment in 5 steps
- [🔧 Installation & Setup →](./installation/setup) — Detailed environment setup
- [📖 Core Concepts →](./core-concepts/overview) — Understand the building blocks
- [📋 Rule Basics →](./rules/rule-basics) — Learn how to write rules
