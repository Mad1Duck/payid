---
id: combining-rules
title: Combining Rules
sidebar_label: Combining Rules
---

# Combining Rules

A **CombinedRuleSet** lets you bundle multiple Rule NFTs into a single payment policy. When someone pays you, **all rules in the set are evaluated together** (AND logic — all must pass).

---

## Why Combine Rules?

Instead of writing one giant rule with everything in it, you can split rules into separate NFTs:

| Benefit | Example |
|---|---|
| **Modular** | Separate "USDC only" from "min amount" — manage them independently |
| **Reusable** | One "block weekends" rule NFT shared across many combined sets |
| **Easy updates** | Update one rule without re-deploying everything |
| **Audit trail** | Every rule has its own NFT with its own on-chain history |

---

## How It Looks

```
CombinedRuleStorage
└── ruleSetHash → CombinedRule
      ├── owner: "0xMERCHANT"
      └── rules:
            ├── [0] tokenId: 1  → "usdc_only"    (stored on IPFS)
            ├── [1] tokenId: 2  → "min_amount"   (stored on IPFS)
            └── [2] tokenId: 3  → "business_hours" (stored on IPFS)
```

When a payment arrives:
1. SDK reads the `ruleSetHash` for the receiver from the blockchain
2. Fetches all 3 rule JSONs from IPFS
3. Evaluates them all — all 3 must ALLOW for the payment to go through

---

## Step by Step

### Step 1 — Define Your Rule

Edit `examples/simple/rule.nft/currentRule.ts`:

```ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] },
  message: "Only stablecoins accepted",
};
```

### Step 2 — Upload to IPFS + Create Rule NFT

```bash
bun run setup:upload       # Upload rule JSON to IPFS
bun run setup:create-rule  # Subscribe + create + activate Rule NFT
```

Repeat this for **each rule** you want to combine. Each run creates one new Rule NFT. You'll get a Token ID for each one.

### Step 3 — Register Combined Rule Set

```bash
bun run setup:register
```

This looks at your active Rule NFTs and combines them into one policy.

---

## The `registerCombinedRule` Function

Under the hood, the SDK calls:

```solidity
function registerCombinedRule(
  bytes32 ruleSetHash,    // Hash of all combined rules
  address[] ruleNFTs,     // Array of RuleItemERC721 contract addresses
  uint256[] tokenIds,     // Array of token IDs (one per rule)
  uint64 version          // Version number for this policy
) external
```

What this does:
1. Deactivates your old combined rule set (if any)
2. Verifies you own all the Rule NFTs
3. Verifies none of the Rule NFTs are expired
4. Registers the new set as your active policy immediately

:::note One Policy Per Address
Each address can only have **one active rule set** at a time. Registering a new one automatically replaces the old one. No downtime.
:::

---

## Read Active Rule Set

To see what rules are currently active for a receiver:

```ts
// 1. Get the rule set hash for the receiver
const ruleSetHash = await combined.getFunction("activeRuleOf")(merchantAddress);

// 2. Get the list of rule NFT references
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

// 3. Fetch each rule from IPFS
const rules = await Promise.all(
  ruleRefs.map(async (ref) => {
    const tokenURI = await ruleNFT.getFunction("tokenURI")(ref.tokenId);
    const url = tokenURI.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    return (await fetch(url).then(r => r.json())).rule;
  })
);

console.log("Active rules:", rules);
```

---

## Limits

| Limit | Value |
|---|---|
| Max Rule NFTs per combined set | **10** |
| Max rule slots without subscription | **1** |
| Max rule slots with subscription | **3** |

For more complex logic, use `NestedRule` within a single Rule NFT instead of adding more NFTs.

---

## Updating Your Rules

When you want to change your payment policy:

```bash
# 1. Edit your rule
vim examples/simple/rule.nft/currentRule.ts

# 2. Upload to IPFS
bun run setup:upload

# 3. Create new Rule NFT
bun run setup:create-rule

# 4. Register updated combined rule set
bun run setup:register
```

`registerCombinedRule()` automatically deactivates the old set and activates the new one. **Zero downtime** — existing payments that have already generated a proof will still work until their TTL expires.

---

## Using the React UI

In the `example-product`, the **Combine** tab lets you do all of this in a browser:

1. Go to **Rule NFTs** tab → view and activate your rules
2. Go to **Combine** tab → select rules and click "Register Combined Rule"
3. Go to **Pay** tab → test a payment against your new policy

The UI uses these hooks from `payid-react`:
- `useMyRules()` — fetch all your Rule NFTs
- `useActiveCombinedRule(address)` — read active policy for any address
- `useAllCombinedRules()` — list all registered combined rules
