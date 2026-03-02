---
id: register-combined-rule
title: "Contoh: Register Combined Rule"
sidebar_label: Register Combined Rule
---

# Contoh: Register Combined Rule

Source: `examples/simple/combiner.rule/register-combined-rule.ts`

Setelah Rule NFT dibuat, langkah selanjutnya adalah **register sebagai policy aktif** di `CombinedRuleStorage`.

---

## Jalankan

```bash
bun run setup:register
```

---

## Walkthrough

```ts
// 1. Ambil tokenId
const { tokenId: ruleTokenId } = await mainRule();

// 2. Verifikasi ownership
const owner = await ruleNFT.getFunction("ownerOf")(ruleTokenId);
if (owner.toLowerCase() !== walletAddress.toLowerCase()) throw new Error("Bukan owner");

// 3. Fetch metadata dari IPFS
const tokenURI = await ruleNFT.getFunction("tokenURI")(ruleTokenId);
const metadata = await fetch(gatewayUrl(tokenURI)).then(r => r.json());

// 4. Build ruleSetHash
const combinedRuleJSON = canonicalize({ version: "1", logic: "AND", rules: [metadata.rule] });
const ruleSetHash = keccak256(toUtf8Bytes(combinedRuleJSON));

// 5. Simulate dulu
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
`registerCombinedRule()` otomatis deactivate rule set lama. Tidak perlu `deactivate()` manual.
:::
