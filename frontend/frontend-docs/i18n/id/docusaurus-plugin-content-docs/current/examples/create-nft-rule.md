---
id: create-nft-rule
title: 'Contoh: Buat Rule NFT'
sidebar_label: Buat Rule NFT
---

# Contoh: Buat Rule NFT

Source: `examples/simple/rule.nft/create-rule-item.ts`

Script ini melakukan 3 hal: **subscribe (kalau belum) → createRule → activateRule**.

---

## Step 1 — Definisikan Rule

```ts
export const RULE_OBJECT = {
  id:      'min_amount',
  if:      { field: 'tx.amount', op: '>=', value: '100000000' },
  message: 'Minimum 100 USDC',
};
```

---

## Step 2 — Upload ke IPFS

```bash
bun run setup:upload
```

---

## Step 3 — Subscribe + Buat + Aktifkan

```bash
bun run setup:create-rule
```

```ts
// Cek subscription
const hasActive = await ruleNFT.getFunction("hasActiveSubscription")(receiverWallet.address);
if (!hasActive) {
  const price = await ruleNFT.getFunction("subscriptionPriceETH")();
  await (await ruleNFT.getFunction("subscribe").send({ value: price })).wait();
}

// createRule
const ruleHash = keccak256(toUtf8Bytes(canonicalize(RULE_OBJECT)));
const txCreate = await ruleNFT.getFunction("createRule").send(ruleHash, tokenURI);
const receipt  = await txCreate.wait();
// Extract ruleId dari event RuleCreated

// activateRule → mint NFT
await (await ruleNFT.getFunction("activateRule").send(ruleId)).wait();
const tokenId = await ruleNFT.getFunction("ruleTokenId")(ruleId);
```

---

## Batas Slot Rule

| Status | Maksimal Rule NFT |
|---|---|
| Tanpa langganan | 1 slot |
| Dengan langganan | 3 slot (`MAX_SLOT`) |

---

## Step 4 — Perpanjang Expiry Rule

```ts
const newExpiry = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
const price     = await ruleNFT.getFunction("subscriptionPriceETH")();
await (await ruleNFT.getFunction("extendRuleExpiry").send(tokenId, newExpiry, { value: price })).wait();
```

:::warning Expiry ≠ Langganan
Expiry Rule NFT dan expiry langganan adalah **hal yang terpisah**. Perpanjang langganan tidak otomatis memperpanjang Rule NFT — kamu harus panggil `extendRuleExpiry(tokenId, newExpiry)` untuk setiap token.
:::
