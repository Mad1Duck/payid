---
id: quickstart
title: Quick Start — End to End
sidebar_label: "⚡ Quick Start"
slug: /quickstart
---

# Quick Start — End to End dalam 15 Menit

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
- `rule_engine.wasm` dari repo

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

# Contract addresses — lihat docs/network/contracts-address
COMBINED_RULE_STORAGE=0x...
RULE_ITEM_ERC721=0x...
PAYID_VERIFIER=0x...
PAY_WITH_PAYID=0x...
MOCK_USDC=0x...
MOCK_ETH_USD_ORACLE=0x...
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
# Upload rule ke IPFS (ada cache — kalau rule sama, skip upload)
bun run setup:upload

# Subscribe + createRule + activateRule (mint NFT)
bun run setup:create-rule
```

Output:
```
Already subscribed   ← atau "Subscribed" kalau pertama kali
Uploading to IPFS... ← atau "⚡ Cache hit" kalau rule sama
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2025-03-23T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready
```

:::info Flow Sebenarnya
`subscribe()` → `createRule(hash, uri)` → `activateRule(ruleId)` → tokenId

Ini berbeda dari ERC721 biasa. Rule NFT punya lifecycle sendiri yang terikat ke subscription.
:::

---

## Step 4 — Register Combined Rule

```bash
bun run setup:register
```

Output:
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

Output:
```
Payer: 0xPAYER_ADDRESS

[1/5] Loading rule set from chain + IPFS...
  ruleSetHash: 0xabc...
  rules count: 1

[2/5] Building Context V1...

[3/5] Evaluating rule & generating proof...
  Decision: ALLOW (OK)
  ✅ Proof generated

[4/5] Checking USDC allowance...
  ✅ Approved

[5/5] Sending payERC20...
  TX hash: 0xghi...

✅ Payment success!
```

---

## Ringkasan Flow

```
RECEIVER (setup sekali):
  subscribe()                    → aktifkan akun, 0.0001 ETH / 30 hari
  upload rule ke IPFS            → dapat tokenURI
  createRule(ruleHash, uri)      → daftarkan rule definition
  activateRule(ruleId)           → mint NFT, expiry = subscriptionExpiry
  registerCombinedRule(...)      → aktifkan policy, siap menerima payment

PAYER (setiap payment):
  activeRuleOf(receiver)         → baca ruleSetHash dari chain
  fetch rule dari IPFS           → load rule configs
  evaluateAndProve(...)          → evaluate + payer sign proof
  approve ERC20                  → kalau allowance kurang
  payERC20(payload, sig, [])     → kirim ke blockchain
```

---

## Selanjutnya

- [Pahami Rule Types →](./rules/rule-basics)
- [Kombinasi Rules →](./rules/combining-rules)
- [Server Mode (KYC/Oracle) →](./examples/server)
- [Integrasi React →](./integration/react-integration)
