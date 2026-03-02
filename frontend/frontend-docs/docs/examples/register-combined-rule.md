---
id: register-combined-rule
title: "Example: Register Combined Rule"
sidebar_label: Register Combined Rule
---

# Example: Register Combined Rule

Source: `examples/simple/combiner.rule/register-combined-rule.ts`

After the Rule NFT is created, the next step is to **register it as an active policy** in `CombinedRuleStorage`.

---

## Run

```bash
bun run setup:register
```

---

## Source Walkthrough

```ts
// 1. Get Rule NFT tokenId
const { tokenId: ruleTokenId } = await mainRule();

// 2. Verify ownership
const owner = await ruleNFT.getFunction("ownerOf")(ruleTokenId);
if (owner.toLowerCase() !== walletAddress.toLowerCase()) throw new Error("Not the owner");

// 3. Fetch rule metadata from IPFS
const tokenURI = await ruleNFT.getFunction("tokenURI")(ruleTokenId);
const metadata = await fetch(gatewayUrl(tokenURI)).then(r => r.json());

// 4. Build ruleSetHash
const combinedRuleJSON = canonicalize({ version: "1", logic: "AND", rules: [metadata.rule] });
const ruleSetHash = keccak256(toUtf8Bytes(combinedRuleJSON));

// 5. Simulate first
await combined.getFunction("registerCombinedRule").staticCall(ruleSetHash, [RULE_ITEM_ERC721], [ruleTokenId], 1n);

// 6. Register
const tx = await combined.getFunction("registerCombinedRule").send(ruleSetHash, [RULE_ITEM_ERC721], [ruleTokenId], 1n);
await tx.wait();
```

---

## Multiple Rules

```ts
const combinedJSON = canonicalize({ version: "1", logic: "AND", rules: [rule1, rule2, rule3] });
const ruleSetHash = keccak256(toUtf8Bytes(combinedJSON));

await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [RULE_NFT, RULE_NFT, RULE_NFT],
  [tokenId1, tokenId2, tokenId3],
  1n
);
```

:::info Auto-Replace
`registerCombinedRule()` automatically deactivates the old rule set. No manual `deactivate()` needed.
:::
