---
id: create-nft-rule
title: "Example: Create Rule NFT"
sidebar_label: Create Rule NFT
---

# Example: Create Rule NFT

Source: `examples/simple/rule.nft/create-rule-item.ts`

Script ini melakukan 4 hal sekaligus: **subscribe → upload IPFS → createRule → activateRule**.

---

## Langkah 1 — Definisikan Rule

Edit `examples/simple/rule.nft/currentRule.ts`:

```ts
// currentRule.ts — ini yang kamu edit sesuai kebutuhan
export const RULE_OBJECT = {
  id: "min_amount",
  if: {
    field: "tx.amount",
    op: ">=",
    value: "100000000",   // 100 USDC (6 decimals)
  },
  message: "Minimum 100 USDC",
};
```

Atau rule yang lebih complex:

```ts
export const RULE_OBJECT = {
  id: "usdc_only",
  if: {
    field: "tx.asset",
    op: "in",
    value: ["USDC", "USDT"],
  },
  message: "Hanya stablecoin",
};
```

---

## Langkah 2 — Upload ke IPFS (dengan Cache)

```bash
bun run setup:upload
```

Script `upload-rule-nft-to-pinata.ts` punya **cache system**:
- Kalau `rule.json` ada dan `ruleHash` sama → **skip upload**, pakai cache
- Kalau rule berubah → upload fresh ke Pinata

```
⚡ Cache hit — skip upload Pinata
   ruleHash : 0xabc...
   tokenURI : ipfs://Qm...

# atau kalau rule berubah:
📦 Uploading to Pinata (no cache found)...
   ruleHash: 0xabc...
🖼 Uploading image...
📤 Uploading metadata JSON...
✅ Upload done
   tokenURI : ipfs://Qm...
```

---

## Langkah 3 — Subscribe + Create + Activate

```bash
bun run setup:create-rule
```

Script lengkapnya:

```ts
// create-rule-item.ts (disederhanakan)

// 1. Cek subscription
const isSubscribed = await ruleNFT.getFunction("hasSubscription")(walletAddress);
if (!isSubscribed) {
  const price = await ruleNFT.getFunction("subscriptionPriceETH")();
  await ruleNFT.getFunction("subscribe").send({ value: price });
}

// 2. Upload ke IPFS (dengan cache)
const { url: tokenURI, metadata } = await mainPinata();
const ruleHash = keccak256(toUtf8Bytes(canonicalize(metadata.rule)));

// 3. createRule — daftarkan definition (belum mint NFT)
const txCreate = await ruleNFT.getFunction("createRule").send(ruleHash, tokenURI);
const receipt = await txCreate.wait();

// 4. Ambil ruleId dari event RuleCreated
let ruleId;
for (const log of receipt.logs) {
  const parsed = ruleNFT.interface.parseLog(log);
  if (parsed?.name === "RuleCreated") {
    ruleId = parsed.args.ruleId;
  }
}

// 5. activateRule — mint NFT, ruleExpiry = subscriptionExpiry
await ruleNFT.getFunction("activateRule").send(ruleId);

// 6. Ambil tokenId dan verifikasi
const tokenId = await ruleNFT.getFunction("ruleTokenId")(ruleId);
const expiry = await ruleNFT.getFunction("ruleExpiry")(tokenId);
```

Output yang diharapkan:

```
Using wallet: 0xRECEIVER...
Already subscribed           ← atau "Subscribed" kalau pertama kali
⚡ Cache hit — skip upload Pinata
Creating rule...
Activating rule...
NFT Token ID: 1
Rule expiry : 2025-03-23T00:00:00.000Z
Days left   : 30
DONE — Rule NFT Ready
```

---

## Slot Limit

| Status | Max Rule NFT |
|---|---|
| Tanpa subscription | 1 slot |
| Dengan subscription | 3 slot (MAX_SLOT) |

Error `RULE_SLOT_FULL` muncul kalau sudah mencapai limit. Subscribe atau `deactivateMyCombinedRule()` dulu jika perlu buat slot baru.

---

## Verifikasi Manual

```ts
// Cek status rule NFT
const tokenId = 1n;
const expiry = await ruleNFT.getFunction("ruleExpiry")(tokenId);
const owner = await ruleNFT.getFunction("ownerOf")(tokenId);
const tokenURI = await ruleNFT.getFunction("tokenURI")(tokenId);

console.log("Owner  :", owner);
console.log("Expiry :", new Date(Number(expiry) * 1000).toISOString());
console.log("URI    :", tokenURI);
```
