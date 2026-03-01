---
id: quickstart
title: Quick Start
sidebar_label: ' Quick Start'
sidebar_position: 2
slug: /quickstart
---

# Quick Start

Tutorial ini memandu kamu dari **nol sampai payment pertama** di Lisk Sepolia.

Kamu akan:

1. Install SDK dan setup environment
2. Subscribe ke PAY.ID + buat Rule NFT
3. Register Combined Rule Set
4. Kirim payment dengan Decision Proof

---

## Prerequisites

- Node.js `≥ 18` atau Bun `≥ 1.0`
- Akun [Pinata](https://pinata.cloud) (gratis) untuk IPFS
- 2 wallet di Lisk Sepolia dengan sedikit ETH untuk gas

---

## Step 1 — Install & Setup

```bash
git clone https://github.com/your-org/payid.git
cd payid && bun install
cp .env.example .env
```

Isi `.env`:

```env
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202

SENDER_PRIVATE_KEY=0x...
SENDER_ADDRESS=0x...
RECIVER_PRIVATE_KEY=0x...
RECIVER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...
ISSUER_ADDRESS=0x...

PINATA_JWT=eyJh...
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

COMBINED_RULE_STORAGE=0x5FbDB2315678afecb367f032d93F642f64180aa3
RULE_ITEM_ERC721=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PAYID_VERIFIER=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
PAY_WITH_PAYID=0x610178dA211FEF7D417bC0e6FeD39F05609AD788
MOCK_USDC=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

---

## Step 2 — Mint USDC Testnet

```bash
bun run examples/simple/mint-usdc.ts
# ✅ Minted 1000 USDC ke payer address
```

---

## Step 3 — Subscribe + Buat Rule NFT

Sebagai **receiver/merchant**, kamu perlu subscribe dulu sebelum bisa buat rule.

```bash
bun run setup:upload
bun run setup:create-rule
```

```
Already subscribed
Uploading to IPFS... ← atau " Cache hit"
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2025-03-23T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready
```

:::info Flow
`subscribe()` → `createRule(hash, uri)` → `activateRule(ruleId)` → tokenId

Rule NFT punya lifecycle sendiri yang terikat ke subscription.
:::

---

## Step 4 — Register Combined Rule

```bash
bun run setup:register
```

```
Using Rule NFT: 1
✅ Ownership verified
ruleSetHash: 0xabc...
✅ Simulation OK
📝 Registering combined rule...
TX: 0xdef...
✅ Registered
```

`registerCombinedRule()` langsung mengaktifkan rule set — tidak perlu `activateRuleSet()` terpisah.

---

## Step 5 — Kirim Payment

```bash
bun run examples/simple/client.ts
```

```
[1/5] Loading rule set from chain + IPFS...
[2/5] Building Context V1...
[3/5] Evaluating rule & generating proof...
  Decision: ALLOW (OK)
  ✅ Proof generated
[4/5] Checking USDC allowance...
[5/5] Sending payERC20...
✅ Payment success!
```

---

## Ringkasan Flow

```
RECEIVER (setup sekali):
  subscribe()                    → aktifkan akun, 0.0001 ETH / 30 hari
  createRule(ruleHash, uri)      → daftarkan rule definition
  activateRule(ruleId)           → mint NFT
  registerCombinedRule(...)      → aktifkan policy

PAYER (setiap payment):
  activeRuleOf(receiver)         → baca ruleSetHash dari chain
  evaluateAndProve(...)          → evaluate + sign proof
  payERC20(payload, sig, [])     → kirim ke blockchain
```

---

## Selanjutnya

- [Pahami Rule Types →](./rules/rule-basics)
- [Kombinasi Rules →](./rules/combining-rules)
- [Server Mode →](./examples/server)
- [Integrasi React →](./integration/react-integration)
