---
id: contracts-address
title: Network & Contract Addresses
sidebar_label: Contract Addresses
---

# Network & Contract Addresses

:::tip Tidak Perlu Deploy Apapun
PAY.ID bekerja seperti ENS — cukup connect ke contract resmi yang sudah live di Lisk Sepolia. Tidak perlu deploy contract baru.
:::

---

## Model Infrastruktur

PAY.ID adalah **shared infrastructure**. Semua developer connect ke set contract yang sama:

```
App kamu ──────►  RuleItemERC721
App lain ──────►  CombinedRuleStorage ──► PayIDVerifier (trust anchor)
App lain ──────►  PayWithPayID
```

| | ENS | PAY.ID |
|---|---|---|
| Register | Siapa saja register nama | Siapa saja mint Rule NFT |
| Resolve | Siapa saja resolve nama | Siapa saja baca active rules |
| Trust anchor | ENS Registry resmi | `PayIDVerifier` resmi |
| Deploy sendiri? | ❌ Tidak perlu | ❌ Tidak perlu |

---

## Contract Addresses — Lisk Sepolia (Chain ID: 4202)

| Contract | Address |
|---|---|
| `RuleItemERC721` | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` |
| `CombinedRuleStorage` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `PayIDVerifier` | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| `PayWithPayID` | `0x610178dA211FEF7D417bC0e6FeD39F05609AD788` |
| `AttestationVerifier` | `0x0165878A594ca255338adfa4d48449f69242Eb8F` |
| `MockUSDC` (testnet) | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| `MockEthUsdOracle` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

**Explorer:** [Lisk Sepolia Blockscout](https://sepolia-blockscout.lisk.com)

---

## Config Siap Pakai

```ts
// src/config/payid.ts
export const PAYID_CONTRACTS = {
  CHAIN_ID: 4202,
  RPC_URL: "https://rpc.sepolia-api.lisk.com",

  RULE_ITEM_ERC721:      "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  COMBINED_RULE_STORAGE: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  PAYID_VERIFIER:        "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  PAY_WITH_PAYID:        "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  USDC:                  "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
} as const;
```

---

## Permission Model

### ✅ Permissionless — Siapa Saja Bisa

| Aksi | Contract |
|---|---|
| Subscribe | `RuleItemERC721.subscribe()` |
| Mint Rule NFT | `RuleItemERC721.createRule()` + `activateRule()` |
| Register rule set | `CombinedRuleStorage.registerCombinedRule()` |
| Baca active rules | `CombinedRuleStorage.activeRuleOf()` |
| Kirim payment | `PayWithPayID.payERC20()` |
| Verifikasi proof | `PayIDVerifier.verifyDecision()` |

### 🔐 Admin Only — Dikelola PAY.ID

| Aksi | Keterangan |
|---|---|
| `PayIDVerifier.setTrustedAuthority()` | Whitelist rule authority baru |
| `RuleItemERC721.pause()` | Pause contract |
| `RuleItemERC721.setSubscriptionPrice()` | Ubah harga subscription |

:::note Kenapa ada admin?
`PayIDVerifier` hanya menerima `ruleAuthority` yang di-whitelist. Ini mencegah fake rule authority. `CombinedRuleStorage` resmi sudah di-whitelist sejak deployment — kamu langsung bisa pakai.
:::

---

## Subscription & Biaya

| | Detail |
|---|---|
| Harga | `0.0001 ETH / 30 hari` (testnet) |
| Slot tanpa subscription | 1 rule |
| Slot dengan subscription | 3 rules (MAX_SLOT) |
| Rule expiry | = `subscriptionExpiry[owner]` saat `activateRule()` |

Kalau subscription habis → `ruleExpiry[tokenId]` expired → semua payment ke receiver: **REVERT** dengan `RULE_LICENSE_EXPIRED`.
