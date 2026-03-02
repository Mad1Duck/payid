---
id: contracts-address
title: Jaringan & Alamat Contract
sidebar_label: Contract Addresses
---

# Jaringan & Alamat Contract

:::tip
Tidak perlu deploy ulang. PAY.ID bekerja seperti ENS — cukup connect ke contract resmi yang sudah live di Lisk Sepolia.
:::

---

## Alamat Contract — Lisk Sepolia (Chain ID: 4202)

| Contract | Address |
|---|---|
| `RuleItemERC721` | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` |
| `CombinedRuleStorage` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `PayIDVerifier` | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| `PayWithPayID` | `0x610178dA211FEF7D417bC0e6FeD39F05609AD788` |
| `AttestationVerifier` | `0x0165878A594ca255338adfa4d48449f69242Eb8F` |
| `MockUSDC` (testnet) | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |

**Explorer:** [Lisk Sepolia Blockscout](https://sepolia-blockscout.lisk.com)

---

## Subscription & Biaya

| | Detail |
|---|---|
| Harga | `0.0001 ETH / 30 hari` (testnet) |
| Slot tanpa subscription | 1 rule |
| Slot dengan subscription | 3 rules (MAX_SLOT) |
| Rule expiry | = `subscriptionExpiry[owner]` saat `activateRule()` |
