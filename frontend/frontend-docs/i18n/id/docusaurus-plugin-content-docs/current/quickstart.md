---
id: quickstart
title: Quick Start
sidebar_label: '⚡ Quick Start'
sidebar_position: 2
slug: /quickstart
---

# Quick Start

Tutorial ini memandu kamu dari **nol ke payment pertama** di jaringan Hardhat lokal dalam 5 langkah.

Kamu akan:

1. Install SDK dan jalankan local node
2. Deploy kontrak + mint test USDC
3. Buat Rule NFT sebagai merchant (receiver)
4. Daftarkan Combined Rule Set
5. Kirim payment dengan Decision Proof sebagai payer

:::info Dua Peran
PAY.ID punya dua peran: **receiver** (merchant, setup rules sekali) dan **payer** (pelanggan, jalankan setiap payment).
:::

---

## Prasyarat

- Node.js `≥ 18` atau Bun `≥ 1.0`
- Akun [Pinata](https://pinata.cloud) gratis untuk IPFS
- Familiar dengan TypeScript dan ethers.js

---

## Langkah 1 — Install & Konfigurasi

Clone repo dan install dependencies:

```bash
git clone https://github.com/Mad1Duck/payid.git
cd payid && bun install
cp .env.example .env
```

Isi `.env` kamu. Untuk development lokal cukup wallet dan IPFS:

```env
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

## Langkah 2 — Jalankan Node Lokal & Deploy Kontrak

Di satu terminal, jalankan Hardhat:

```bash
cd packages/contracts
npx hardhat node
```

Di terminal lain, deploy semua kontrak:

```bash
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost
```

Salin address kontrak dari `ignition/deployments/chain-31337/deployed_addresses.json` ke `.env` kamu.

Lalu mint test USDC ke payer:

```bash
bun run examples/simple/mint-usdc.ts
# ✅ Minted 1000 USDC ke alamat payer
```

---

## Langkah 3 — Subscribe + Buat Rule NFT

Langkah ini dilakukan oleh **receiver (merchant)**.

```bash
bun run setup:upload         # Upload rule JSON ke IPFS
bun run setup:create-rule    # Subscribe + buat + aktifkan rule
```

Output yang diharapkan:

```
Already subscribed
Uploading to IPFS...
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2026-01-01T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready ✅
```

:::info Apa itu Rule NFT?
Rules pembayaranmu disimpan dalam NFT. NFT punya tanggal kedaluwarsa. Kalau expired, pembayaran ke kamu akan revert dengan `RULE_LICENSE_EXPIRED` — ingat perpanjang via `extendRuleExpiry()`!
:::

Rule kamu ada di `examples/simple/rule.nft/currentRule.ts`. Default rule:

```ts
export const RULE_OBJECT = {
  id: 'usdc_only',
  if: { field: 'tx.asset', op: 'in', value: ['USDC', 'USDT'] },
  message: 'Hanya stablecoin yang diterima',
};
```

---

## Langkah 4 — Daftarkan Combined Rule Set

Daftarkan Rule NFT kamu sebagai kebijakan pembayaran aktif:

```bash
bun run setup:register
```

Output yang diharapkan:

```
Using Rule NFT: 1
✅ Ownership verified
ruleSetHash: 0xabc...
✅ Simulation OK
📝 Registering combined rule...
TX: 0xdef...
✅ Registered
```

---

## Langkah 5 — Kirim Payment

Sekarang beralih ke peran **payer** dan kirim payment:

```bash
bun run examples/simple/client.ts
```

Output yang diharapkan:

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

---

## Ringkasan

```
RECEIVER (setup sekali):
  subscribe()               → aktifkan akun (ETH fee / 30 hari)
  createRule(hash, uri)     → daftarkan definisi rule
  activateRule(ruleId)      → mint Rule NFT
  registerCombinedRule(...) → aktifkan kebijakan pembayaran
  extendRuleExpiry(id, ts)  → perpanjang sebelum expired

PAYER (setiap payment):
  getActiveRuleOf(receiver) → ambil hash rule aktif merchant
  evaluateAndProve(...)     → evaluasi rules + generate signed proof
  approve(contract, amount) → izinkan contract pakai token (auto di hooks)
  payERC20(payload, sig, [])→ kirim ke blockchain
  payETH(payload, sig, [])  → untuk payment ETH native
```

---

## Selanjutnya

- [📋 Jenis Rule →](./rules/rule-basics) — Pelajari cara menulis berbagai jenis rule
- [🔗 Menggabungkan Rules →](./rules/combining-rules) — Bundel beberapa rules jadi satu kebijakan
- [🖥 Server Mode →](./examples/server) — Tambahkan KYC, rate limit, dan lebih banyak
- [⚛️ Integrasi React →](./integration/react-integration) — Pakai PAY.ID di frontend
- [📍 Contract Addresses →](./network/contracts-address) — Deploy ke testnet
