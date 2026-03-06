---
id: create-nft-rule
title: 'Example: Create Rule NFT'
sidebar_label: Create Rule NFT
---

# Example: Create Rule NFT

Source: `examples/simple/rule.nft/create-rule-item.ts`

This script does 3 things: **subscribe (if needed) → createRule → activateRule**. IPFS upload is a separate step before this.

---

## Step 1 — Define Your Rule

```ts
// examples/simple/rule.nft/currentRule.ts
export const RULE_OBJECT = {
  id:      'min_amount',
  if:      { field: 'tx.amount', op: '>=', value: '100000000' },
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

Under the hood:

```ts
import ruleNFTAbi from "../../packages/contracts/artifacts/contracts/RuleItemERC721.sol/RuleItemERC721.json";
import { ethers } from "ethers";

const provider       = new ethers.JsonRpcProvider(process.env.RPC_URL);
const receiverWallet = new ethers.Wallet(process.env.RECIVER_PRIVATE_KEY!, provider);
const ruleNFT        = new ethers.Contract(process.env.RULE_ITEM_ERC721!, ruleNFTAbi.abi, receiverWallet);

// 1. Subscribe if not already active
const hasActive = await ruleNFT.getFunction("hasActiveSubscription")(receiverWallet.address);
if (!hasActive) {
  const price = await ruleNFT.getFunction("subscriptionPriceETH")();
  const tx = await ruleNFT.getFunction("subscribe").send({ value: price });
  await tx.wait();
  console.log("Subscribed ✅");
} else {
  console.log("Already subscribed");
}

// 2. createRule — register the rule definition (no NFT yet)
const ruleHash = keccak256(toUtf8Bytes(canonicalize(RULE_OBJECT)));
const txCreate = await ruleNFT.getFunction("createRule").send(ruleHash, tokenURI);
const receipt  = await txCreate.wait();

// Extract ruleId from RuleCreated event
const iface    = new ethers.Interface(ruleNFTAbi.abi);
const ruleId   = receipt.logs
  .map((log: any) => { try { return iface.parseLog(log); } catch { return null; } })
  .find((e: any) => e?.name === "RuleCreated")
  ?.args.ruleId;

// 3. activateRule — mint the NFT (expiry = current subscription expiry)
const txActivate = await ruleNFT.getFunction("activateRule").send(ruleId);
await txActivate.wait();

// Get the minted token ID
const tokenId = await ruleNFT.getFunction("ruleTokenId")(ruleId);
console.log("NFT Token ID:", tokenId.toString());
```

Expected output:
```
Already subscribed
Cache hit — skip Pinata upload
Creating rule...
Activating rule...
NFT Token ID: 1
DONE — Rule NFT Ready ✅
```

---

## Rule Slot Limits

| Status | Max Rule NFTs |
|---|---|
| Without subscription | 1 slot |
| With subscription | 3 slots (`MAX_SLOT`) |

When the limit is reached you'll get a `RULE_SLOT_FULL` revert. Subscribe first, or deactivate an existing rule via `deactivateRule(tokenId)`.

---

## Step 4 — Extend Rule Expiry

After activating, the rule's expiry matches your current subscription expiry. You must explicitly extend it to keep it alive:

```ts
// Extend expiry by 30 days
const newExpiry = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
const price     = await ruleNFT.getFunction("subscriptionPriceETH")();

const txExtend = await ruleNFT.getFunction("extendRuleExpiry").send(
  tokenId,
  newExpiry,
  { value: price },
);
await txExtend.wait();
console.log("Rule expiry extended ✅");
```

:::warning Expiry ≠ Subscription
The rule's NFT expiry and your subscription expiry are **separate**. Renewing your subscription does not automatically extend your Rule NFTs — you must call `extendRuleExpiry(tokenId, newExpiry)` for each active token.
:::

---

## Verify Manually

```ts
const tokenId  = await ruleNFT.getFunction("ruleTokenId")(ruleId);
const expiry   = await ruleNFT.getFunction("ruleExpiry")(tokenId);
const owner    = await ruleNFT.getFunction("ownerOf")(tokenId);
const tokenURI = await ruleNFT.getFunction("tokenURI")(tokenId);

console.log("Owner:",    owner);
console.log("Expiry:",   new Date(Number(expiry) * 1000).toISOString());
console.log("TokenURI:", tokenURI);
```
