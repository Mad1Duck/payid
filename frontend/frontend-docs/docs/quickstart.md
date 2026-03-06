---
id: quickstart
title: Quick Start
sidebar_label: '⚡ Quick Start'
sidebar_position: 2
slug: /quickstart
---

# Quick Start

This tutorial walks you through **zero to first payment** on a local Hardhat network in 5 steps.

You will:

1. Install the SDK and spin up a local node
2. Deploy contracts + mint test USDC
3. Create a Rule NFT as the merchant (receiver)
4. Register a Combined Rule Set
5. Send a payment with a Decision Proof as the payer

:::info Two Roles
PAY.ID has two roles: the **receiver** (merchant, sets up rules once) and the **payer** (customer, runs every payment).
:::

---

## Prerequisites

- Node.js `≥ 18` or Bun `≥ 1.0`
- A free [Pinata](https://pinata.cloud) account for IPFS storage
- Basic familiarity with TypeScript and ethers.js

---

## Step 1 — Install & Configure

Clone the repo and install dependencies:

```bash
git clone https://github.com/Mad1Duck/payid.git
cd payid && bun install
cp .env.example .env
```

Fill in your `.env`. For local development you only need wallets and IPFS:

```env
# Use a local Hardhat node
# Network (use your target network RPC)
RPC_URL=https://your-rpc-url.com
CHAIN_ID=31337

# Wallets (use test wallets only — never put real money here)
SENDER_PRIVATE_KEY=0x...
SENDER_ADDRESS=0x...
RECIVER_PRIVATE_KEY=0x...
RECIVER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...
ISSUER_ADDRESS=0x...

# IPFS (get from pinata.cloud)
PINATA_JWT=eyJh...
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

# Contract addresses — fill after deploying or get from network docs
COMBINED_RULE_STORAGE=0x0000000000000000000000000000000000000000
RULE_ITEM_ERC721=0x0000000000000000000000000000000000000000
PAYID_VERIFIER=0x0000000000000000000000000000000000000000
PAY_WITH_PAYID=0x0000000000000000000000000000000000000000
MOCK_USDC=0x0000000000000000000000000000000000000000
```

---

## Step 2 — Start Local Node & Deploy Contracts

In one terminal, start Hardhat:

```bash
cd packages/contracts
npx hardhat node
```

In another terminal, deploy all contracts:

```bash
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost
```

Copy the deployed addresses from `ignition/deployments/chain-31337/deployed_addresses.json` into your `.env`.

Then mint test USDC to the payer:

```bash
bun run examples/simple/mint-usdc.ts
# ✅ Minted 1000 USDC to payer address
```

---

## Step 3 — Subscribe + Create Rule NFT

This step is done by the **receiver (merchant)**. You're setting up your payment rules.

**What this does:**

1. `subscribe()` — activates your account (costs a small ETH fee, valid 30 days)
2. `createRule()` — registers your rule definition on-chain
3. `activateRule()` — mints your Rule NFT

```bash
# Upload your rule JSON to IPFS
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
Rule expiry : 2026-01-01T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready ✅
```

:::info What is a Rule NFT?
Your payment rules are stored in an NFT. The NFT has an expiry date. If it expires, payments to you will revert with `RULE_LICENSE_EXPIRED` — remember to renew via `extendRuleExpiry()`!
:::

Your rule lives in `examples/simple/rule.nft/currentRule.ts`. The default rule:

```ts
export const RULE_OBJECT = {
  id: 'usdc_only',
  if: { field: 'tx.asset', op: 'in', value: ['USDC', 'USDT'] },
  message: 'Only stablecoins accepted',
};
```

---

## Step 4 — Register Combined Rule Set

Register your Rule NFT(s) as an active payment policy:

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
`registerCombinedRule()` activates the rule set immediately and replaces the old one if any. See [Combining Rules →](./rules/combining-rules) for multi-rule policies.
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
[2/5] Building Context...
[3/5] Evaluating rule & generating proof...
  Decision: ALLOW ✅
  Proof generated
[4/5] Checking USDC allowance...
[5/5] Sending payERC20...

✅ Payment success!
   Payer   : 0xf39F...
   Receiver: 0x7099...
   Amount  : 50000000 μUSDC (50 USDC)
   TX      : 0x...
```

**What just happened?**

1. The SDK fetched the merchant's rules from the blockchain + IPFS
2. Evaluated the rules against the payment context
3. Generated a cryptographic proof (EIP-712 signed with payer's wallet)
4. Checked + approved USDC spending
5. Sent the payment to the smart contract with the proof attached

---

## Summary

```
RECEIVER (one-time setup):
  subscribe()                → activate account (ETH fee / 30 days)
  createRule(ruleHash, uri)  → register rule definition
  activateRule(ruleId)       → mint Rule NFT
  registerCombinedRule(...)  → activate payment policy
  extendRuleExpiry(id, ts)   → renew before expiry

PAYER (every payment):
  getActiveRuleOf(receiver)   → fetch merchant's active rule hash
  evaluateAndProve(...)       → evaluate rules + generate signed proof
  approve(contract, amount)   → ERC20 approval (auto-handled in hooks)
  payERC20(payload, sig, [])  → submit payment to blockchain
  payETH(payload, sig, [])    → for native ETH payments
```

---

## Next Steps

- [📋 Rule Types →](./rules/rule-basics) — Learn to write different kinds of rules
- [🔗 Combining Rules →](./rules/combining-rules) — Bundle multiple rules into one policy
- [🖥 Server Mode →](./examples/server) — Add KYC, rate limits, and more
- [⚛️ React Integration →](./integration/react-integration) — Use PAY.ID in your frontend
- [📍 Contract Addresses →](./network/contracts-address) — Deploy to testnets
