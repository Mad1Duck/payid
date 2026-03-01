---
id: combining-rules
title: Combining Rules
sidebar_label: Combining Rules
---

# Combining Rules

Rules bisa digabung menjadi **CombinedRuleSet** — satu policy yang terdiri dari beberapa Rule NFT berbeda, dievaluasi bersama.

---

## Mengapa Combined Rules?

- **Modularisasi** — pisah rule "USDC only" dari rule "min amount"
- **Reuse** — rule "block weekends" bisa dipakai di banyak combined sets
- **Update parsial** — update satu rule tanpa harus redeploy semua
- **Audit trail** — setiap rule punya NFT token-nya sendiri di chain

---

## Struktur

```
CombinedRuleStorage
└── ruleSetHash → CombinedRule
      ├── owner: "0xMERCHANT"
      └── rules:
            ├── [0] tokenId: 1  → "usdc_only"
            ├── [1] tokenId: 2  → "min_amount"
            └── [2] tokenId: 3  → "business_hours"
```

---

## Step by Step

### Step 1 — Definisikan Rule

```ts
// examples/simple/rule.nft/currentRule.ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] },
  message: "Hanya menerima stablecoin",
};
```

### Step 2 — Upload ke IPFS + Buat Rule NFT

```bash
bun run setup:upload
bun run setup:create-rule
```

Ulangi untuk setiap rule yang mau dikombinasikan.

### Step 3 — Register Combined Rule Set

```bash
bun run setup:register
```

---

## registerCombinedRule

```solidity
function registerCombinedRule(
  bytes32 ruleSetHash,
  address[] ruleNFTs,
  uint256[] tokenIds,
  uint64 version
) external
```

Saat dipanggil, contract: deactivate set lama → validate ownership + expiry → register baru → set `activeRuleOf[msg.sender]`.

:::note
Satu address hanya bisa punya **satu** active rule set. Register baru otomatis replace yang lama.
:::

---

## Baca Active Rule Set

```ts
const ruleSetHash = await combined.getFunction("activeRuleOf")(merchantAddress);
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

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
```

---

## Batasan

Contract membatasi maksimal **10 Rule NFT** per combined set. Untuk policy lebih kompleks, gunakan `NestedRule` di dalam satu NFT.

---

## Update Rules

1. Update `currentRule.ts`
2. `bun run setup:upload`
3. `bun run setup:create-rule`
4. `bun run setup:register`

`registerCombinedRule()` otomatis deactivate set lama. Tidak ada downtime.
