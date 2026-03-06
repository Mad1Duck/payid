---
id: intro
title: Introduction
sidebar_label: What is PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · On-chain Enforced**

## The Simple Idea 💡

Imagine you're a merchant. You want to accept payments, but only under certain conditions:
- Only stablecoins (USDC, USDT)
- Only between $10–$500
- Only during business hours
- Only from verified customers

Normally, enforcing these rules requires a backend server, a database, and custom code that runs before every payment. **PAY.ID lets you define these rules as simple JSON — and enforces them automatically on any EVM chain, without running a server.**

> **PAY.ID answers one fundamental question: "Should this transaction be allowed?"**

---

## How It Works

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

| Step | What Happens |
|---|---|
| **Context** | Payment details assembled: who's paying, what token, how much, when |
| **Rules** | Your rules evaluated in a sandboxed WASM engine — deterministic, auditable |
| **Decision** | Result is `ALLOW ✅` or `REJECT ❌` |
| **Proof** | If ALLOW, an EIP-712 signed proof is generated — payer signs with their own wallet |
| **Verify** | Smart contract checks the proof, then transfers money or reverts |

The contracts **never execute your rules on-chain** — they only verify the signed proof. This keeps gas costs low and contracts simple to audit.

---

## PAY.ID Is NOT...

| ❌ Not | ✅ But |
| --- | --- |
| A wallet | A policy layer for payments |
| A payment gateway | A cryptographic proof generator |
| A custodian (holds your money) | An identity + rules protocol |
| A DeFi protocol | Works on any EVM chain |
| A blockchain or L2 | ERC-4337 compatible |

---

## The 4 Core Pillars

### 🪪 1. Payment Identity

`pay.id/yourname` is your **payment identity**. It's not just a wallet address — it carries your payment rules. When someone pays you, the rules attached to your ID are automatically checked.

### 📋 2. Rule Engine

Rules are **pure JSON configs** evaluated in a sandboxed WASM engine. They are:
- **Deterministic** — same input always produces same output
- **Auditable** — anyone can read the rules
- **Immutable** — stored on IPFS with their hash committed on-chain

Three rule formats: `SimpleRule`, `MultiConditionRule`, and `NestedRule`. See [Rule Basics →](./rules/rule-basics).

### 🔐 3. Decision Proof

Every payment evaluation produces an **EIP-712 signed proof** — a cryptographic receipt that says "this payment was checked and approved at this moment." The proof is signed by the payer's own wallet, so no trusted third party is needed.

### ⛓️ 4. On-chain Enforcement

Smart contracts only verify the proof. They **never see or execute the rules**. This keeps contracts simple, cheap to run, and easy to audit.

---

## Quick Code Preview

### Client Mode (React, browser, Node.js)

```ts
import { createPayID } from 'payid/client';

const payid = createPayID({});
await payid.ready();

const { result, proof } = await payid.evaluateAndProve({
  context: {
    tx: { sender: payer, receiver: merchant, asset: usdcAddress, amount: '150000000', chainId: 1 },
    env: { timestamp: Math.floor(Date.now() / 1000) },
  },
  authorityRule,        // merchant's rules loaded from IPFS
  payId:    'pay.id/merchant',
  payer,
  receiver: merchant,
  asset:    usdcAddress,
  amount:   150_000_000n,
  signer,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority:     COMBINED_RULE_STORAGE,
  chainId:        1,
  blockTimestamp: Math.floor(Date.now() / 1000),
  ttlSeconds:     300,
});

if (proof) {
  await payContract.payERC20(proof.payload, proof.signature, []);
}
```

### React (payer — single hook)

```tsx
import { usePayIDFlow } from 'payid-react';

const { execute, status, isPending, txHash } = usePayIDFlow();

execute({ receiver, asset: usdcAddress, amount: 150_000_000n, payId: 'pay.id/merchant' });
```

### React (merchant QR)

```tsx
import { usePayIDQR } from 'payid-react';

const { generate, payload, qrDataUrl } = usePayIDQR();

generate({ payId: 'pay.id/my-shop', allowedAsset: usdcAddress, maxAmount: 50_000_000n, expiresAt: ... });
// → payload = "payid-v2:eyJ..."  (encode to any QR library)
// → qrDataUrl = "data:image/png;base64,..." (if 'qrcode' package installed)
```

---

## Getting Started

- [⚡ Quick Start →](./quickstart) — Zero to first payment in 5 steps
- [🔧 Installation & Setup →](./installation/setup) — Package names, env config, repo structure
- [📖 Core Concepts →](./core-concepts/overview) — Context, Rules, Decision, Proof explained
- [📋 Rule Basics →](./rules/rule-basics) — Write your first payment rule
- [⚛️ React Integration →](./integration/react-integration) — All hooks with examples
- [📍 Contract Addresses →](./network/contracts-address) — Deploy to your network
