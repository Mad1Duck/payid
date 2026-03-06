---
id: register-combined-rule
title: "Contoh: Daftarkan Combined Rule"
sidebar_label: Daftarkan Combined Rule
---

# Contoh: Daftarkan Combined Rule

Source: `examples/simple/combiner.rule/register-combined-rule.ts`

Setelah Rule NFT dibuat dan diaktifkan, script ini membundel semuanya menjadi **kebijakan payment aktif** di `CombinedRuleStorage`.

---

## Jalankan

```bash
bun run setup:register
```

---

## Walkthrough

```ts
// 1. Ambil tokenId untuk Rule NFT kamu
const tokenId = await ruleNFT.getFunction("ruleTokenId")(ruleId);

// 2. Verifikasi kepemilikan
const owner = await ruleNFT.getFunction("ownerOf")(tokenId);
if (owner.toLowerCase() !== receiverWallet.address.toLowerCase()) throw new Error("Bukan pemiliknya");

// 3. Ambil rule config dari IPFS untuk build ruleSetHash yang benar
const tokenURI = await ruleNFT.getFunction("tokenURI")(tokenId);
const metadata = await fetch(gatewayUrl(tokenURI)).then(r => r.json());

// 4. Build ruleSetHash
const ruleSetHash = keccak256(toUtf8Bytes(canonicalize({ version: "1", logic: "AND", rules: [metadata.rule] })));

// 5. Simulate dulu sebelum kirim
await combined.getFunction("registerCombinedRule").staticCall(ruleSetHash, [RULE_NFT], [tokenId], 1n);

// 6. Daftarkan on-chain
const tx = await combined.getFunction("registerCombinedRule").send(ruleSetHash, [RULE_NFT], [tokenId], 1n);
await tx.wait();
console.log("✅ Terdaftar. TX:", tx.hash);
```

---

## Multiple Rules dalam Satu Kebijakan

```ts
const ruleSetHash = keccak256(toUtf8Bytes(canonicalize({ version: "1", logic: "AND", rules: [rule1, rule2, rule3] })));

await combined.getFunction("registerCombinedRule").send(
  ruleSetHash,
  [RULE_NFT, RULE_NFT, RULE_NFT],
  [tokenId1, tokenId2, tokenId3],
  1n,
);
```

:::info Auto-Replace
`registerCombinedRule()` otomatis menonaktifkan kebijakan sebelumnya. Zero downtime.
:::

---

## Nonaktifkan Kebijakan

```ts
await combined.getFunction("deactivateMyCombinedRule").send();
// Rule NFT tidak terhapus — bisa re-register kapanpun
```
