---
id: register-combined-rule
title: "Example: Register Combined Rule"
sidebar_label: Register Combined Rule
---

# Example: Register Combined Rule

Source: `examples/simple/combiner.rule/register-combined-rule.ts`

After Rule NFTs are created and activated, this script bundles them into an **active payment policy** in `CombinedRuleStorage`.

---

## Run

```bash
bun run setup:register
```

---

## Full Walkthrough

```ts
import combinedAbi from "../../packages/contracts/artifacts/contracts/CombinedRuleStorage.sol/CombinedRuleStorage.json";
import ruleNFTAbi  from "../../packages/contracts/artifacts/contracts/RuleItemERC721.sol/RuleItemERC721.json";
import { ethers, keccak256, toUtf8Bytes } from "ethers";

const provider       = new ethers.JsonRpcProvider(process.env.RPC_URL);
const receiverWallet = new ethers.Wallet(process.env.RECIVER_PRIVATE_KEY!, provider);

const combined = new ethers.Contract(
  process.env.COMBINED_RULE_STORAGE!,
  combinedAbi.abi,
  receiverWallet,
);
const ruleNFT  = new ethers.Contract(
  process.env.RULE_ITEM_ERC721!,
  ruleNFTAbi.abi,
  receiverWallet,
);

// 1. Get tokenId for your Rule NFT
const ruleId  = 1n;  // ruleId of the rule you created
const tokenId = await ruleNFT.getFunction("ruleTokenId")(ruleId);

// 2. Verify ownership
const owner = await ruleNFT.getFunction("ownerOf")(tokenId);
if (owner.toLowerCase() !== receiverWallet.address.toLowerCase()) {
  throw new Error("Not the owner of this Rule NFT");
}

// 3. Fetch rule config from IPFS to build the correct ruleSetHash
const tokenURI = await ruleNFT.getFunction("tokenURI")(tokenId);
const url      = tokenURI.startsWith("ipfs://")
  ? `${process.env.PINATA_GATEWAY}/ipfs/${tokenURI.slice(7)}`
  : tokenURI;
const metadata  = await fetch(url).then(r => r.json());

// 4. Build ruleSetHash — must match what the SDK will compute
//    Canonical form: { version, logic, rules } with sorted keys
const combinedRuleJSON = canonicalize({
  version: "1",
  logic:   "AND",
  rules:   [metadata.rule],
});
const ruleSetHash = keccak256(toUtf8Bytes(combinedRuleJSON));

// 5. Static call (simulate) first — catch errors before spending gas
await combined.getFunction("registerCombinedRule").staticCall(
  ruleSetHash,
  [process.env.RULE_ITEM_ERC721!],
  [tokenId],
  1n,
);

// 6. Register on-chain
const tx = await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [process.env.RULE_ITEM_ERC721!],
  [tokenId],
  1n,
);
await tx.wait();
console.log("✅ Registered. TX:", tx.hash);
```

Expected output:
```
Using Rule NFT tokenId: 1
✅ Ownership verified
ruleSetHash: 0xabc...
✅ Simulation OK
📝 Registering combined rule...
TX: 0xdef...
✅ Registered
```

---

## Multiple Rules in One Policy

To bundle 3 Rule NFTs into a single policy:

```ts
// Build ruleSetHash from all rules together (must match what SDK evaluates)
const combinedRuleJSON = canonicalize({
  version: "1",
  logic:   "AND",
  rules:   [rule1Config, rule2Config, rule3Config],
});
const ruleSetHash = keccak256(toUtf8Bytes(combinedRuleJSON));

await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [RULE_NFT, RULE_NFT, RULE_NFT],   // same contract address repeated
  [tokenId1, tokenId2, tokenId3],   // one tokenId per rule
  1n,                               // policy version
);
```

:::info Auto-Replace
`registerCombinedRule()` automatically deactivates the previous policy for your address. No separate `deactivate()` call needed. Zero downtime — existing proofs generated before the update remain valid until their TTL expires.
:::

---

## Read Active Policy

Verify your policy is live:

```ts
// Get ruleSetHash for any address
const activeHash = await combined.getFunction("getActiveRuleOf")(receiverWallet.address);

if (activeHash === ethers.ZeroHash) {
  console.log("No active policy — payments pass through unrestricted");
} else {
  const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(activeHash);
  console.log("Policy owner:", owner);
  console.log("Rules:",        ruleRefs.length);
  console.log("Version:",      version.toString());
}
```

---

## Deactivating a Policy

To temporarily disable your policy (all payments pass through until a new one is registered):

```ts
await combined.getFunction("deactivateMyCombinedRule").send();
```

This does **not** burn your Rule NFTs — you can re-register the same policy with `registerCombinedRule()` at any time.
