---
id: create-nft-rule
title: 'Contoh: Buat Rule NFT'
sidebar_label: Create Rule NFT
---

# Contoh: Buat Rule NFT

Source: `examples/simple/rule.nft/create-rule-item.ts`

Script ini melakukan 4 hal sekaligus: **subscribe → upload IPFS → createRule → activateRule**.

---

## Step 1 — Definisikan Rule

```ts
// examples/simple/rule.nft/currentRule.ts
export const RULE_OBJECT = {
  id: 'min_amount',
  if: { field: 'tx.amount', op: '>=', value: '100000000' },
  message: 'Minimum 100 USDC',
};
```

---

## Step 2 — Upload ke IPFS

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

## Batas Slot

| Status              | Max Rule NFT      |
| ------------------- | ----------------- |
| Tanpa subscription  | 1 slot            |
| Dengan subscription | 3 slot (MAX_SLOT) |

Error `RULE_SLOT_FULL` muncul saat limit tercapai. Subscribe atau hapus rule lama untuk free slot.
