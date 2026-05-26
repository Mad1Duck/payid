---
id: intro
title: Introduction
sidebar_label: What is PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **Define rules for payments · Enforced on-chain · No server needed**

PAY.ID lets you control who can pay you, how much, and under what conditions — enforced automatically on-chain.

**Use cases:**
- Only accept stablecoins (USDC, USDT)
- Set spending limits ($10–$500)
- Require KYC verification
- Block payments from blacklisted addresses
- Time-based policies (business hours only)

---

## Quick Start: What do you want to do?

| I want to... | Start here |
|---|---|
| **Test a payment** (pay someone) | [Simple Usage →](./simple-usage) — 5-minute test
| **Integrate into my dApp** | [Quick Start →](./quickstart) — React or Node.js
| **Set up payment rules** (receive payments) | [Quick Start →](./quickstart#step-5---create-your-merchant-rules-receiver) — Merchant setup
| **Understand how it works** | [Core Concepts →](./core-concepts/overview) — Deep dive

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

## What's New

- **[🛡️ VRAN Reputation](./integration/vran-reputation)** — Decentralized trust layer. Check merchant reputation and blacklist status before paying.
- **[🏦 Bank / QRIS Bridge](./integration/bank-qris-bridge)** — Use PAY.ID as a policy oracle for fiat payment rails (QRIS, SWIFT, SEPA).
- **[⚙️ Configurable Storage Resolver](./api/sdk-reference)** — Override the storage indexer URL via SDK options instead of global variables.

---

## Live Testnets

Choose a testnet to start building:

| Network | Chain ID | Currency | Faucet |
|---|---|---|---|
| **Arbitrum Sepolia** | 421614 | ETH | [Get ETH →](https://faucet.triangleplatform.com/arbitrum/sepolia) |
| **0G Galileo** | 16602 | A0GI | [Get A0GI →](https://faucet.0g.ai) |
| **Sepolia** | 11155111 | ETH | [Get ETH →](https://sepoliafaucet.com) |
| **Base Sepolia** | 84532 | ETH | [Get ETH →](https://sepoliafaucet.com) |
| **Polygon Amoy** | 80002 | MATIC | [Get MATIC →](https://faucet.polygon.technology) |

**Contract addresses:** [See full list →](./network/contracts-address)

---

## Getting Started

**New to PAY.ID?** Start here:
| Step | Link |
|---|---|
| 1. Test a payment in 5 minutes | [� Simple Usage →](./simple-usage) |
| 2. Integrate into your app | [⚡ Quick Start →](./quickstart) |
| 3. Learn how rules work | [📋 Rule Basics →](./rules/rule-basics) |

**Already familiar?**
| Goal | Link |
|---|---|
| All React hooks (20+) | [⚛️ React Integration →](./integration/react-integration) |
| Backend / Node.js | [🖥️ Server Guide →](./examples/server) |
| Core concepts deep dive | [📖 Core Concepts →](./core-concepts/overview) |
