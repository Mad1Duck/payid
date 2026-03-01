---
id: create-nft-rule
title: 'Example: Create Rule NFT'
sidebar_label: Create Rule NFT
---

# Example: Create Rule NFT

Source: `examples/simple/rule.nft/create-rule-item.ts`

This script does 4 things at once: **subscribe → upload IPFS → createRule → activateRule**.

---

## Step 1 — Define Your Rule

```ts
// examples/simple/rule.nft/currentRule.ts
export const RULE_OBJECT = {
  id: 'min_amount',
  if: { field: 'tx.amount', op: '>=', value: '100000000' },
  message: 'Minimum 100 USDC',
};
```

---

## Step 2 — Upload to IPFS

```bash
bun run setup:upload
```

```
 Cache hit — skip Pinata upload
   ruleHash : 0xabc...
   tokenURI : ipfs://Qm...
```

---

## Step 3 — Subscribe + Create + Activate

```bash
bun run setup:create-rule
```

```ts
// Check subscription
if (!isSubscribed) {
  const price = await ruleNFT.getFunction('subscriptionPriceETH')();
  await ruleNFT.getFunction('subscribe').send({ value: price });
}

// createRule
const txCreate = await ruleNFT.getFunction('createRule').send(ruleHash, tokenURI);
const ruleId = getRuleIdFromReceipt(receipt, ruleNFT);

// activateRule → mint NFT
await ruleNFT.getFunction('activateRule').send(ruleId);
```

```
Using wallet: 0xRECEIVER...
Already subscribed
 Cache hit — skip Pinata upload
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2025-03-23T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready
```

---

## Slot Limits

| Status               | Max Rule NFTs      |
| -------------------- | ------------------ |
| Without subscription | 1 slot             |
| With subscription    | 3 slots (MAX_SLOT) |

The `RULE_SLOT_FULL` error appears when the limit is reached. Subscribe or remove an old rule to free up a slot.

---

## Verify Manually

```ts
const expiry = await ruleNFT.getFunction('ruleExpiry')(tokenId);
const owner = await ruleNFT.getFunction('ownerOf')(tokenId);
const tokenURI = await ruleNFT.getFunction('tokenURI')(tokenId);
```
