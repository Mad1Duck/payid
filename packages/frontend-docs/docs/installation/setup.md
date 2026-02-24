---
id: setup
title: Installation & Setup
sidebar_label: Setup
---

# Installation & Setup

## Requirements

| Tool | Version |
|---|---|
| Node.js | `≥ 18` |
| Bun | `≥ 1.0` (direkomendasikan) |
| TypeScript | `≥ 5.0` |

---

## 1. Install SDK

```bash
npm install @payid/sdk-core ethers
# atau
bun add @payid/sdk-core ethers
```

---

## 2. WASM Rule Engine

Rule engine adalah **WebAssembly binary** yang mengevaluasi rules secara deterministik off-chain.

### Cara Dapat WASM

Copy dari repository:

```bash
cp examples/rule_engine.wasm ./your-project/
```

### Load di Node.js / Bun

```ts
import fs from "fs";
import path from "path";

const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "rule_engine.wasm"))
);
```

### Load di Browser / React

Taruh `rule_engine.wasm` di folder `public/`, lalu:

```ts
const res = await fetch("/rule_engine.wasm");
const wasm = new Uint8Array(await res.arrayBuffer());
```

### Bundle di SDK (tsup)

Kalau kamu build SDK sendiri di atas PAY.ID, tambah ke `tsup.config.ts` agar WASM ter-bundle:

```ts
// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  loader: {
    ".wasm": "copy",  // copy as-is ke dist/, tidak di-bundle
  },
});
```

---

## 3. Environment Variables

```env
# RPC
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202

# Wallets
SENDER_PRIVATE_KEY=0x...      # Payer (pengirim)
SENDER_ADDRESS=0x...
RECIVER_PRIVATE_KEY=0x...     # Receiver/Merchant
RECIVER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...      # Untuk server mode
ISSUER_ADDRESS=0x...

# IPFS — daftar gratis di pinata.cloud
PINATA_JWT=your_jwt_here
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

# Contracts Lisk Sepolia
COMBINED_RULE_STORAGE=0x5FbDB2315678afecb367f032d93F642f64180aa3
RULE_ITEM_ERC721=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PAYID_VERIFIER=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
PAY_WITH_PAYID=0x610178dA211FEF7D417bC0e6FeD39F05609AD788
MOCK_USDC=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
MOCK_ETH_USD_ORACLE=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

---

## 4. Inisialisasi SDK

### Client Mode (browser / Node.js, tanpa trusted issuers)

```ts
import { createPayID } from "@payid/sdk-core";
import fs from "fs";

const payid = createPayID({
  wasm: new Uint8Array(fs.readFileSync("rule_engine.wasm")),
});
```

### Server Mode (dengan trusted issuers untuk Context V2)

```ts
import { createPayID } from "@payid/sdk-core";
import { ethers } from "ethers";

const payid = createPayID({
  wasm: new Uint8Array(fs.readFileSync("rule_engine.wasm")),
  trustedIssuers: new Set([
    ENV_ISSUER_ADDRESS,
    STATE_ISSUER_ADDRESS,
    ORACLE_ISSUER_ADDRESS,
  ]),
});
```

:::warning Jangan Pass Empty Set
`new Set([])` artinya "tidak ada issuer yang dipercaya" — semua attestation akan ditolak.
Kalau tidak butuh trusted issuers, omit sama sekali atau jangan pass properti `trustedIssuers`.
:::

---

## 5. Verifikasi Instalasi

```ts
const result = await payid.evaluate(
  {
    tx: {
      sender: "0x0000000000000000000000000000000000000001",
      receiver: "0x0000000000000000000000000000000000000002",
      asset: "USDC",
      amount: "150000000",
      chainId: 4202,
    },
    payId: {
      id: "pay.id/test",
      owner: "0x0000000000000000000000000000000000000002",
    },
  },
  {
    version: "1",
    logic: "AND",
    rules: [
      {
        id: "min_amount",
        if: { field: "tx.amount", op: ">=", value: "100000000" },
      },
    ],
  }
);

console.log(result.decision); // "ALLOW"
```

---

## Struktur Repository

```
payid-master/
├── examples/
│   ├── config/config.ts           # Environment loader
│   ├── shared/*.json              # Contract ABIs
│   ├── simple/
│   │   ├── client.ts              # Client payment flow
│   │   ├── server.ts              # Server mode (Context V2)
│   │   ├── mint-usdc.ts           # Mint USDC testnet
│   │   ├── rule.nft/
│   │   │   ├── currentRule.ts     # ← definisikan rule di sini
│   │   │   ├── upload-rule-nft-to-pinata.ts  # Upload + cache IPFS
│   │   │   └── create-rule-item.ts           # subscribe + createRule + activateRule
│   │   └── combiner.rule/
│   │       └── register-combined-rule.ts     # registerCombinedRule
│   └── rule_engine.wasm           # WASM binary
├── packages/
│   ├── sdk-core/                  # SDK utama
│   ├── rule-engine/               # WASM wrapper (sandbox)
│   ├── types/                     # TypeScript types
│   └── contracts/                 # Solidity contracts
```

---

## Troubleshooting

**`No loader is configured for ".wasm" files`**
Tambah `loader: { ".wasm": "copy" }` ke `tsup.config.ts`. Lihat bagian [Bundle di SDK](#bundle-di-sdk-tsup) di atas.

**`Failed to read rule_engine.wasm`**
Pastikan path WASM benar. Gunakan `path.join(__dirname, "rule_engine.wasm")` bukan path relatif.

**`RULE_LICENSE_EXPIRED`**
Rule NFT merchant sudah expired. Merchant perlu subscribe ulang lalu `activateRule()` lagi.

**`RULE_AUTHORITY_NOT_TRUSTED`**
`ruleAuthority` yang di-pass ke proof bukan contract yang di-whitelist PAY.ID. Gunakan `COMBINED_RULE_STORAGE` resmi.

**`RULE_SLOT_FULL`**
Merchant sudah punya 1 rule (tanpa subscription) atau 3 rules (dengan subscription). Subscribe dulu atau hapus rule lama.
