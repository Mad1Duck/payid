---
id: combining-rules
title: Combining Rules
sidebar_label: Combining Rules
---

# Combining Rules

Rules bisa digabung menjadi **CombinedRuleSet** — satu policy yang terdiri dari beberapa Rule NFT berbeda, dievaluasi bersama.

---

## Mengapa Combined Rules?

Setiap Rule NFT = satu atomic rule yang punya lifecycle (expiry) sendiri. Combined rule set memungkinkan kamu:

- **Modularisasi** — pisah rule "USDC only" dari rule "min amount"
- **Reuse** — rule "block weekends" bisa dipakai di banyak combined sets
- **Update parsial** — update satu rule tanpa harus redeploy semua
- **Audit trail** — setiap rule punya NFT token-nya sendiri di chain

---

## Struktur Combined Rule Set

```
CombinedRuleStorage
└── ruleSetHash → CombinedRule
      ├── owner: "0xMERCHANT"
      ├── version: 1
      ├── active: true
      └── rules:
            ├── [0] { ruleNFT: "0xRuleNFT", tokenId: 1 }  → rule: "usdc_only"
            ├── [1] { ruleNFT: "0xRuleNFT", tokenId: 2 }  → rule: "min_amount"
            └── [2] { ruleNFT: "0xRuleNFT", tokenId: 3 }  → rule: "business_hours"
```

Saat payment masuk, SDK fetch semua rule dari IPFS lalu evaluasi dengan logic **AND** (semua harus pass).

---

## Step by Step: Buat Combined Rule Set

### Step 1 — Definisikan Rule Kamu

Edit file `examples/simple/rule.nft/currentRule.ts`:

```ts
// currentRule.ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: {
    field: "tx.asset",
    op: "in",
    value: ["USDC", "USDT"],
  },
  message: "Hanya menerima stablecoin",
};
```

### Step 2 — Upload ke IPFS + Buat Rule NFT

```bash
# Upload rule ke Pinata (ada cache, skip kalau rule sama)
bun run setup:upload

# Subscribe + createRule + activateRule
bun run setup:create-rule
```

Ulangi untuk setiap rule yang kamu mau kombinasikan. Setiap run akan buat satu Rule NFT baru.

### Step 3 — Register Combined Rule Set

```bash
bun run setup:register
```

Script ini otomatis:
1. Fetch tokenId dari semua Rule NFT yang sudah dibuat
2. Build `ruleSetHash` dari combined config JSON
3. Call `registerCombinedRule()` — langsung aktif

---

## Cara Kerja registerCombinedRule

```ts
// Contract signature
function registerCombinedRule(
  bytes32 ruleSetHash,      // hash dari combined rule config JSON
  address[] ruleNFTs,       // array contract Rule NFT
  uint256[] tokenIds,       // array tokenId tiap NFT
  uint64 version
) external
```

Saat dipanggil, contract:
1. Deactivate rule set lama milik `msg.sender` (kalau ada)
2. Validate ownership + expiry tiap Rule NFT
3. Register rule set baru sebagai aktif
4. Set `activeRuleOf[msg.sender] = ruleSetHash`

:::note
Satu address hanya bisa punya **satu** active rule set (via `activeRuleOf`). Register baru otomatis replace yang lama.
:::

---

## Baca Active Rule Set

```ts
import { ethers } from "ethers";

// Baca active rule set hash milik merchant
const ruleSetHash = await combined.getFunction("activeRuleOf")(merchantAddress);

// Baca detail rule set
const [owner, ruleRefs, version] =
  await combined.getFunction("getRuleByHash")(ruleSetHash);

// Fetch setiap rule dari IPFS
const rules = await Promise.all(
  ruleRefs.map(async (ref) => {
    const tokenURI = await ruleNFT.getFunction("tokenURI")(ref.tokenId);
    const url = tokenURI.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    const metadata = await fetch(url).then(r => r.json());
    return metadata.rule;
  })
);

// Gabungkan jadi satu RuleConfig untuk SDK
const authorityRule = {
  version: version.toString(),
  logic: "AND",
  rules,
};
```

---

## Max 10 Rules Per Set

Contract membatasi maksimal **10 Rule NFT** per combined set:

```solidity
require(ruleNFTs.length <= MAX_RULES, "MAX_10_RULES");
```

Kalau butuh lebih kompleks, gunakan `NestedRule` di dalam satu Rule NFT — bukan 10+ NFT terpisah.

---

## Rule Direction (Advanced)

Untuk use case yang perlu policy berbeda untuk INBOUND vs OUTBOUND:

```ts
// Register rule khusus untuk payment keluar
await combined.getFunction("registerCombinedRuleForDirection").send(
  ruleSetHash,
  "OUTBOUND",
  [RULE_NFT_ADDRESS],
  [tokenId],
  1n
);
```

Default `registerCombinedRule()` menggunakan mode legacy yang berlaku untuk semua direction.

---

## Contoh Policy Lengkap

Merchant mau setup policy: **USDC only + min 50 USDC + jam kerja + bukan weekend**

```ts
// Rule 1: USDC only
const rule1 = {
  id: "usdc_only",
  if: { field: "tx.asset", op: "==", value: "USDC" },
};

// Rule 2: Minimum 50 USDC
const rule2 = {
  id: "min_50_usdc",
  if: { field: "tx.amount", op: ">=", value: "50000000" },
};

// Rule 3: Business hours + bukan weekend
// (ini satu NestedRule dalam satu NFT)
const rule3 = {
  id: "business_hours",
  logic: "AND",
  conditions: [
    { field: "env.timestamp", op: "between", value: [8, 22] },
  ],
};

// Upload + mint NFT untuk masing-masing, lalu:
await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [RULE_NFT, RULE_NFT, RULE_NFT],
  [tokenId1, tokenId2, tokenId3],
  1n
);
```

---

## Update Rules

Kalau mau update satu rule tanpa reset semua:

1. Update `currentRule.ts` dengan rule baru
2. `bun run setup:upload` — upload ke IPFS
3. `bun run setup:create-rule` — `createRuleVersion()` atau `createRule()` baru
4. `bun run setup:register` — `registerCombinedRule()` ulang dengan tokenId baru

`registerCombinedRule()` otomatis deactivate set lama dan aktivasi yang baru. Tidak ada downtime.
