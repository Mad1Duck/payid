---
id: intro
title: Introduction
sidebar_label: What is PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · On-chain Enforced**

PAY.ID is a programmable payment system for EVM blockchains. It lets receivers (merchants, creators, DAOs) define **Rules** that control who can pay them, how much, and under what conditions — enforced automatically on-chain without running a server.

---

## The Simple Idea

Imagine you're a merchant. You want to accept payments, but only under certain conditions:
- Only stablecoins (USDC, USDT)
- Only between $10–$500
- Only from KYC-verified users

Normally, enforcing these rules requires a backend server, a database, and custom off-chain code. **PAY.ID lets you define these rules as simple JSON and enforces them on-chain.**

> **PAY.ID answers one fundamental question before every payment: "Should this transaction be allowed?"**

---

## How It Works

```
Context → Rules (WASM engine) → Decision → Proof (EIP-712) → On-chain Verify
```

| Step | What Happens |
|---|---|
| **Context** | Payment details: who's paying, what token, how much, when |
| **Rules** | Your rules evaluated in a WASM sandbox — deterministic, auditable |
| **Decision** | `ALLOW ✅` or `REJECT ❌` |
| **Proof** | If ALLOW, an EIP-712 signed proof is generated (payer signs with their wallet) |
| **Verify** | Smart contract checks the proof, then executes the transfer or reverts |

The contracts **never run your rules on-chain** — they only verify the signed proof. This keeps gas costs low.

---

## Choose Your Integration Path

### Path A — React / Frontend (`payid-react`)

Install one package, wrap your app in a provider, and use a single hook. Recommended for most dApps.

```tsx
import { usePayIDFlow } from 'payid-react'

function CheckoutButton() {
  const { execute, status, txHash } = usePayIDFlow()

  return (
    <button onClick={() => execute({
      receiver: '0xMerchant...',
      asset:    '0xUSDC...',
      amount:   50_000_000n,       // 50 USDC
      payId:    'pay.id/my-store',
    })}>
      {status === 'idle'    && 'Pay 50 USDC'}
      {status === 'proving' && 'Sign in wallet...'}
      {status === 'success' && '✅ Paid!'}
    </button>
  )
}
```

→ **[React Quick Start →](./quickstart)**

---

### Path B — Node.js / Backend (`payid`)

For servers, APIs, automated bots, and ERC-4337 bundlers. The server wallet signs proofs.

```ts
import { createPayIDServer } from 'payid/server'
import { Wallet } from 'ethers'

const payid = createPayIDServer({
  signer: new Wallet(process.env.PRIVATE_KEY!),
})

const { result, proof } = await payid.evaluateAndProve({
  context, payId, payer, receiver, asset, amount,
  verifyingContract, ruleAuthority, chainId, blockTimestamp,
})
```

→ **[Server Guide →](./examples/server)**

---

## The 4 Core Concepts

### 🪪 1. Payment Identity (`pay.id/yourname`)
Not just a wallet address — it carries your payment rules. When someone pays `pay.id/my-store`, PAY.ID automatically fetches and evaluates the rules attached to that identity.

### 📋 2. Rules (JSON configs)
Rules define your payment policy. They are stored on IPFS with their hash committed on-chain. Three formats: `SimpleRule`, `MultiConditionRule`, `NestedRule`. → [Rule Basics →](./rules/rule-basics)

### 🔐 3. Decision Proof (EIP-712)
Every approved payment generates a cryptographic receipt signed by the payer's own wallet. No trusted third party needed — the blockchain verifies it.

### ⛓️ 4. On-chain Enforcement
Smart contracts verify the proof (never execute rules). This keeps contracts simple and cheap to audit.

---

## What PAY.ID Is NOT

| ❌ Not | ✅ But |
|---|---|
| A wallet | A policy layer for payments |
| A payment gateway | A cryptographic proof generator |
| A custodian | An identity + rules protocol |
| A blockchain or L2 | Works on any EVM chain |

---

## Packages

| Package | Description | Install |
|---|---|---|
| `payid` | Core SDK — rule engine, proof generation | `npm i payid ethers` |
| `payid-react` | React hooks — wallet integration | `npm i payid-react wagmi viem ethers` |

---

## Getting Started

- [⚡ Quick Start →](./quickstart) — React app to first payment in minutes
- [🔧 Installation →](./installation/setup) — Install and configure packages
- [📖 Core Concepts →](./core-concepts/overview) — Deep dive into Rules, Context, and Proofs
- [📋 Rule Basics →](./rules/rule-basics) — Write your first payment rule
- [⚛️ React Integration →](./integration/react-integration) — All 20+ React hooks with examples
- [🖥️ Server Guide →](./examples/server) — Backend / Node.js integration
