---
id: combining-rules
title: Combining Rules
sidebar_label: Combining Rules
---

# Combining Rules

Rules can be combined into a **CombinedRuleSet** — a single policy consisting of multiple Rule NFTs evaluated together.

---

## Why Combine Rules?

- **Modularization** — separate "USDC only" from "min amount" rules
- **Reuse** — a "block weekends" rule can be used in many combined sets
- **Partial updates** — update one rule without redeploying everything
- **Audit trail** — every rule has its own NFT on-chain

---

## Structure

```
CombinedRuleStorage
└── ruleSetHash → CombinedRule
      ├── owner: "0xMERCHANT"
      └── rules:
            ├── [0] tokenId: 1  → "usdc_only"
            ├── [1] tokenId: 2  → "min_amount"
            └── [2] tokenId: 3  → "business_hours"
```

When a payment arrives, the SDK fetches all rules from IPFS and evaluates them with **AND** logic (all must pass).

---

## Step by Step

### Step 1 — Define Your Rule

```ts
// examples/simple/rule.nft/currentRule.ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] },
  message: "Only stablecoins accepted",
};
```

### Step 2 — Upload to IPFS + Create Rule NFT

```bash
bun run setup:upload
bun run setup:create-rule
```

Repeat for each rule you want to combine. Each run creates one new Rule NFT.

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

When called: deactivates old set → validates ownership + expiry → registers new set as active.

:::note
One address can only have **one** active rule set. Registering a new one automatically replaces the old one.
:::

---

## Read Active Rule Set

```ts
const ruleSetHash = await combined.getFunction("activeRuleOf")(merchantAddress);
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

const rules = await Promise.all(
  ruleRefs.map(async (ref) => {
    const tokenURI = await ruleNFT.getFunction("tokenURI")(ref.tokenId);
    const url = tokenURI.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    return (await fetch(url).then(r => r.json())).rule;
  })
);
```

---

## Limits

The contract limits a maximum of **10 Rule NFTs** per combined set. For more complex logic, use `NestedRule` within a single Rule NFT.

---

## Update Rules

1. Update `currentRule.ts`
2. `bun run setup:upload`
3. `bun run setup:create-rule`
4. `bun run setup:register`

`registerCombinedRule()` automatically deactivates the old set. No downtime.
