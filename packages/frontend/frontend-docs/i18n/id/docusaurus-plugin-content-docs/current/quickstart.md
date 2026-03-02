---
id: quickstart
title: Quick Start
sidebar_label: '⚡ Quick Start'
sidebar_position: 2
slug: /quickstart
---

# Quick Start

Tutorial ini memandu kamu dari **nol sampai payment pertama** di Lisk Sepolia dalam 5 langkah.

Kamu akan:
1. Install SDK dan konfigurasi environment
2. Mint USDC testnet
3. Buat Rule NFT sebagai merchant (receiver)
4. Register Combined Rule Set
5. Kirim payment dengan Decision Proof sebagai payer

:::info Dua Peran
PAY.ID punya dua peran: **receiver** (merchant, setup rules sekali saja) dan **payer** (pelanggan, jalankan setiap kali bayar).
:::

---

## Yang Dibutuhkan

- Node.js `≥ 18` atau Bun `≥ 1.0`
- Akun [Pinata](https://pinata.cloud) gratis untuk simpan rules di IPFS
- 2 wallet di Lisk Sepolia dengan sedikit ETH untuk gas

---

## Langkah 1 — Install & Konfigurasi

Clone repo dan install dependencies:

```bash
git clone https://github.com/your-org/payid.git
cd payid && bun install
cp .env.example .env
```

Isi file `.env` kamu. Variabel terpenting:

```env
# Network
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202

# Wallet (pakai test wallet saja — jangan pernah pakai wallet isi uang sungguhan!)
SENDER_PRIVATE_KEY=0x...   # Wallet payer
SENDER_ADDRESS=0x...
RECIVER_PRIVATE_KEY=0x...  # Wallet receiver/merchant
RECIVER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...    # Admin wallet (bisa sama dengan receiver untuk testing)
ADMIN_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...   # Issuer wallet (untuk server mode, bisa skip dulu)
ISSUER_ADDRESS=0x...

# IPFS (dapatkan dari pinata.cloud)
PINATA_JWT=eyJh...
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

# Alamat kontrak (sudah di-deploy di Lisk Sepolia)
COMBINED_RULE_STORAGE=0x5FbDB2315678afecb367f032d93F642f64180aa3
RULE_ITEM_ERC721=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PAYID_VERIFIER=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
PAY_WITH_PAYID=0x610178dA211FEF7D417bC0e6FeD39F05609AD788
MOCK_USDC=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

---

## Langkah 2 — Mint USDC Testnet

Payer butuh USDC untuk membayar. Jalankan ini sekali untuk mint token testnet:

```bash
bun run examples/simple/mint-usdc.ts
# ✅ Minted 1000 USDC ke payer address
```

---

## Langkah 3 — Subscribe + Buat Rule NFT

Langkah ini dilakukan oleh **receiver (merchant)**. Kamu sedang menyiapkan rules pembayaranmu.

**Yang dilakukan:**
1. `subscribe()` — aktifkan akunmu (biaya ~0.0001 ETH, berlaku 30 hari)
2. `createRule()` — daftarkan definisi rules kamu on-chain
3. `activateRule()` — mint Rule NFT kamu

```bash
# Upload rule JSON ke IPFS (sudah di-cache — skip kalau rule tidak berubah)
bun run setup:upload

# Subscribe + create + activate rule (semuanya dalam satu command)
bun run setup:create-rule
```

Output yang diharapkan:
```
Already subscribed          ← atau otomatis subscribe
Uploading to IPFS...        ← atau "Cache hit" kalau rule tidak berubah
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2025-03-23T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready ✅
```

:::info Apa itu Rule NFT?
Rules pembayaranmu disimpan dalam sebuah NFT. NFT ini punya tanggal kadaluarsa yang terikat ke subscription kamu. Kalau subscription expired, pembayaran ke kamu akan gagal — jadi ingat untuk perpanjang sebelum habis!
:::

Rules kamu ada di `examples/simple/rule.nft/currentRule.ts`. Rule default terlihat seperti ini:

```ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] },
  message: "Hanya stablecoin yang diterima",
};
```

---

## Langkah 4 — Register Combined Rule Set

Sekarang daftarkan Rule NFT-mu sebagai policy aktif:

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

:::tip
`registerCombinedRule()` langsung mengaktifkan rule set-nya. Kamu bisa gabungkan beberapa Rule NFT menjadi satu policy — lihat [Menggabungkan Rules →](./rules/combining-rules)
:::

---

## Langkah 5 — Kirim Payment

Sekarang beralih ke peran **payer** dan kirim pembayaran:

```bash
bun run examples/simple/client.ts
```

Output yang diharapkan:
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

**Apa yang baru terjadi?**
1. SDK mengambil rules merchant dari blockchain + IPFS
2. Mengevaluasi rules terhadap detail pembayaran
3. Menghasilkan bukti kriptografis (ditandatangani wallet payer)
4. Approve pengeluaran USDC (kalau belum di-approve)
5. Mengirim pembayaran ke smart contract bersama proof-nya

---

## Ringkasan

```
RECEIVER (setup sekali):
  subscribe()                    → aktifkan akun (~0.0001 ETH / 30 hari)
  createRule(ruleHash, uri)      → daftarkan definisi rule
  activateRule(ruleId)           → mint Rule NFT
  registerCombinedRule(...)      → aktifkan payment policy

PAYER (setiap pembayaran):
  activeRuleOf(receiver)         → ambil ruleSetHash aktif dari chain
  evaluateAndProve(...)          → evaluasi rules + buat signed proof
  payERC20(payload, sig, [])     → submit pembayaran ke blockchain
```

---

## Selanjutnya

- [📋 Jenis Rule →](./rules/rule-basics) — Pelajari cara tulis berbagai jenis rule
- [🔗 Menggabungkan Rules →](./rules/combining-rules) — Gabungkan beberapa rules jadi satu policy
- [🖥 Server Mode →](./examples/server) — Tambahkan KYC, rate limit, dan lainnya
- [⚛️ Integrasi React →](./integration/react-integration) — Pakai PAY.ID di frontend-mu
