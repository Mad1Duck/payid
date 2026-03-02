---
id: quickstart
title: Quick Start
sidebar_label: '⚡ Quick Start'
sidebar_position: 2
slug: /quickstart
---

# Quick Start

This tutorial walks you through **zero to first payment** on Lisk Sepolia in 5 steps.

You will:
1. Install the SDK and configure your environment
2. Mint some test USDC
3. Create a Rule NFT as the merchant (receiver)
4. Register a Combined Rule Set
5. Send a payment with a Decision Proof as the payer

:::info Two Roles
PAY.ID has two roles: the **receiver** (merchant, sets up rules once) and the **payer** (customer, runs every payment).
:::

---

## Prerequisites

- Node.js `≥ 18` or Bun `≥ 1.0`
- A free [Pinata](https://pinata.cloud) account for storing rules on IPFS
- 2 wallets on Lisk Sepolia with a small amount of ETH for gas

---

## Step 1 — Install & Configure

Clone the repo and install dependencies:

```bash
git clone https://github.com/your-org/payid.git
cd payid && bun install
cp .env.example .env
```

Fill in your `.env` file. The most important variables:

```env
# Network
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202

# Wallets (use test wallets only — never put real money here!)
SENDER_PRIVATE_KEY=0x...   # The payer's wallet
SENDER_ADDRESS=0x...
RECIVER_PRIVATE_KEY=0x...  # The receiver/merchant's wallet
RECIVER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...    # Admin wallet (can be same as receiver for testing)
ADMIN_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...   # Issuer wallet (for server mode, can skip for now)
ISSUER_ADDRESS=0x...

# IPFS (get from pinata.cloud)
PINATA_JWT=eyJh...
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

# Contract addresses (already deployed on Lisk Sepolia)
COMBINED_RULE_STORAGE=0x5FbDB2315678afecb367f032d93F642f64180aa3
RULE_ITEM_ERC721=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PAYID_VERIFIER=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
PAY_WITH_PAYID=0x610178dA211FEF7D417bC0e6FeD39F05609AD788
MOCK_USDC=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

---

## Step 2 — Mint Testnet USDC

The payer needs some USDC to pay with. Run this once to mint test tokens:

```bash
bun run examples/simple/mint-usdc.ts
# ✅ Minted 1000 USDC to payer address
```

---

## Step 3 — Subscribe + Create Rule NFT

This step is done by the **receiver (merchant)**. You're setting up your payment rules.

**What this does:**
1. `subscribe()` — activates your account (costs ~0.0001 ETH, valid 30 days)
2. `createRule()` — registers your rule definition on-chain
3. `activateRule()` — mints your Rule NFT

```bash
# Upload your rule JSON to IPFS (cached — skips if rule unchanged)
bun run setup:upload

# Subscribe + create + activate rule (all in one command)
bun run setup:create-rule
```

Expected output:
```
Already subscribed          ← or subscribes automatically
Uploading to IPFS...        ← or "Cache hit" if rule unchanged
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2025-03-23T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready ✅
```

:::info What is a Rule NFT?
Your payment rules are stored in an NFT. The NFT has an expiry date tied to your subscription. If the subscription expires, payments to you will be blocked — so remember to renew!
:::

Your rule lives in `examples/simple/rule.nft/currentRule.ts`. The default rule looks like:

```ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] },
  message: "Only stablecoins accepted",
};
```

---

## Step 4 — Register Combined Rule Set

Now register your Rule NFT(s) as an active policy:

```bash
bun run setup:register
```

Expected output:
```
Using Rule NFT: 1
✅ Ownership verified
ruleSetHash: 0xabc...
✅ Simulation OK
📝 Registering combined rule...
TX: 0xdef...
✅ Registered
```

:::tip
`registerCombinedRule()` activates the rule set immediately. You can combine multiple Rule NFTs into one policy — see [Combining Rules →](./rules/combining-rules)
:::

---

## Step 5 — Send Payment

Now switch to the **payer** role and send a payment:

```bash
bun run examples/simple/client.ts
```

Expected output:
```
[1/5] Loading rule set from chain + IPFS...
[2/5] Building Context V1...
[3/5] Evaluating rule & generating proof...
  Decision: ALLOW (OK)
  ✅ Proof generated
[4/5] Checking USDC allowance...
[5/5] Sending payERC20...

✅ Payment success!
   Payer   : 0x...
   Receiver: 0x...
   Amount  : 666000000 μUSDC (666 USDC)
```

**What just happened?**
1. The SDK fetched the merchant's rules from the blockchain + IPFS
2. Evaluated the rules against the payment details
3. Generated a cryptographic proof (signed with payer's wallet)
4. Approved USDC spending (if not already approved)
5. Sent the payment to the smart contract with the proof attached

---

## Summary

```
RECEIVER (one-time setup):
  subscribe()                → activate account (~0.0001 ETH / 30 days)
  createRule(ruleHash, uri)  → register your rule definition
  activateRule(ruleId)       → mint your Rule NFT
  registerCombinedRule(...)  → activate your payment policy

PAYER (every payment):
  activeRuleOf(receiver)     → fetch the merchant's active rule hash from chain
  evaluateAndProve(...)      → evaluate rules + generate signed proof
  payERC20(payload, sig, []) → submit payment to blockchain
```

---

## Next Steps

- [📋 Rule Types →](./rules/rule-basics) — Learn to write different kinds of rules
- [🔗 Combining Rules →](./rules/combining-rules) — Combine multiple rules into one policy
- [🖥 Server Mode →](./examples/server) — Add KYC, rate limits, and more
- [⚛️ React Integration →](./integration/react-integration) — Use PAY.ID in your frontend
