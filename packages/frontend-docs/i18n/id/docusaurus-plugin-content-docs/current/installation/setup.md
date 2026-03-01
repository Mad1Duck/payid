---
id: setup
title: Instalasi & Setup
sidebar_label: Setup
---

# Instalasi & Setup

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

## 2. Inisialisasi SDK

### Client Mode (browser / Node.js — tanpa trusted issuers)

```ts
import { createPayID } from "payid/client";

const payid = createPayID({});
```

### Server Mode (dengan trusted issuers untuk Context V2)

```ts
import { createPayID } from "payid/server";

const payid = createPayID({
  trustedIssuers: new Set([
    ENV_ISSUER_ADDRESS,
    STATE_ISSUER_ADDRESS,
  ]),
});
```

:::warning
`new Set([])` artinya "tidak ada issuer yang dipercaya" — semua attestation akan ditolak. Kalau tidak butuh trusted issuers, omit sama sekali.
:::

---

## 3. Environment Variables

```env
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202

SENDER_PRIVATE_KEY=0x...
RECIVER_PRIVATE_KEY=0x...
ISSUER_PRIVATE_KEY=0x...

PINATA_JWT=your_jwt_here
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

COMBINED_RULE_STORAGE=0x5FbDB2315678afecb367f032d93F642f64180aa3
RULE_ITEM_ERC721=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PAYID_VERIFIER=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
PAY_WITH_PAYID=0x610178dA211FEF7D417bC0e6FeD39F05609AD788
MOCK_USDC=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

---

## 4. Verifikasi Instalasi

```ts
import { createPayID } from "payid/client";

const payid = createPayID({});
const result = await payid.evaluate(
  {
    tx: { sender: "0x01", receiver: "0x02", asset: "USDC", amount: "150000000", chainId: 4202 },
    payId: { id: "pay.id/test", owner: "0x02" },
  },
  {
    version: "1",
    logic: "AND",
    rules: [{ id: "min_amount", if: { field: "tx.amount", op: ">=", value: "100000000" } }],
  }
);

console.log(result.decision); // "ALLOW"
```

---

## 5. Struktur Repository

```
payid-master/
├── examples/
│   ├── simple/
│   │   ├── client.ts                  # Flow payment client
│   │   ├── server.ts                  # Server mode (Context V2)
│   │   ├── mint-usdc.ts               # Mint USDC testnet
│   │   ├── rule.nft/currentRule.ts    # ← definisikan rule di sini
│   │   └── combiner.rule/             # registerCombinedRule
│   └── wasm/rule_engine.wasm          # WASM binary
└── packages/
    ├── sdk-core/                      # SDK utama
    ├── types/                         # TypeScript types
    └── contracts/                     # Solidity contracts
```

---

## Troubleshooting

**`RULE_LICENSE_EXPIRED`**
Rule NFT merchant sudah expired. Merchant perlu subscribe ulang lalu `activateRule()` lagi.

**`RULE_AUTHORITY_NOT_TRUSTED`**
`ruleAuthority` bukan contract yang di-whitelist. Gunakan `COMBINED_RULE_STORAGE` resmi.

**`RULE_SLOT_FULL`**
Merchant sudah mencapai limit rule slot. Subscribe atau hapus rule lama dulu.
