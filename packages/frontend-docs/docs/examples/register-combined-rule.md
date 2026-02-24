---
id: register-combined-rule
title: "Example: Register Combined Rule"
sidebar_label: Register Combined Rule
---

# Example: Register Combined Rule

Source: `examples/simple/combiner.rule/register-combined-rule.ts`

Setelah Rule NFT dibuat, langkah berikutnya adalah **register sebagai active policy** di `CombinedRuleStorage`.

---

## Jalankan

```bash
bun run setup:register
```

---

## Source Walkthrough

```ts
// 1. Create / Get Rule NFT (dari step sebelumnya)
const { tokenId: ruleTokenId } = await mainRule();
console.log("Using Rule NFT:", ruleTokenId.toString());

// 2. Verifikasi ownership
const owner = await ruleNFT.getFunction("ownerOf")(ruleTokenId);
if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
  throw new Error("You do NOT own this NFT");
}
console.log("✅ Ownership verified");

// 3. Fetch metadata rule dari IPFS
const tokenURI = await ruleNFT.getFunction("tokenURI")(ruleTokenId);
const url = tokenURI.startsWith("ipfs://")
  ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
  : tokenURI;
const metadata = await fetch(url).then(r => r.json());

// 4. Build ruleSetHash dari combined config
const combinedRuleJSON = canonicalize({
  version: "1",
  logic: "AND",
  rules: [metadata.rule],
});
const ruleSetHash = keccak256(toUtf8Bytes(combinedRuleJSON));
console.log("ruleSetHash:", ruleSetHash);

// 5. Simulate dulu (catch revert sebelum tx nyata)
await combined.getFunction("registerCombinedRule").staticCall(
  ruleSetHash,
  [RULE_ITEM_ERC721],
  [ruleTokenId],
  1n
);
console.log("✅ Simulation OK");

// 6. Register (TX nyata)
const tx = await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [RULE_ITEM_ERC721],
  [ruleTokenId],
  1n
);
await tx.wait();
console.log("✅ Registered");

// 7. Verifikasi
const [resolvedOwner, ruleRefs, version] =
  await combined.getFunction("getRuleByHash")(ruleSetHash);
console.log("Owner:", resolvedOwner);
```

---

## Output

```
Using wallet: 0xRECEIVER...
Using Rule NFT: 1
✅ Ownership verified
Fetching: https://gateway.pinata.cloud/ipfs/Qm...
ruleSetHash: 0xabc...
✅ Simulation OK
📝 Registering combined rule...
TX: 0xdef...
✅ Registered

RESULT:
Owner: 0xRECEIVER...
Version: 1
Rule[0] NFT=0xa513... Token=1
```

---

## Multiple Rules

Untuk register beberapa Rule NFT sekaligus:

```ts
const { tokenId: tokenId1 } = await createRule(rule1);
const { tokenId: tokenId2 } = await createRule(rule2);
const { tokenId: tokenId3 } = await createRule(rule3);

const combinedJSON = canonicalize({
  version: "1",
  logic: "AND",
  rules: [rule1, rule2, rule3],
});
const ruleSetHash = keccak256(toUtf8Bytes(combinedJSON));

await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [RULE_NFT, RULE_NFT, RULE_NFT],  // bisa sama contract, tokenId berbeda
  [tokenId1, tokenId2, tokenId3],
  1n
);
```

:::info Auto-Replace
`registerCombinedRule()` otomatis deactivate rule set lama. Tidak perlu `deactivate()` manual dulu.
:::

---

## Baca Active Rule Set

```ts
// Setelah register, bisa dibaca langsung
const activeHash = await combined.getFunction("activeRuleOf")(receiverAddress);
const [owner, refs, ver] = await combined.getFunction("getRuleByHash")(activeHash);

console.log("Active rule set hash:", activeHash);
console.log("Owner:", owner);
console.log("Rule count:", refs.length);
```
