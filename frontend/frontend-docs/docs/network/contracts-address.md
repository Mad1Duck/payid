---
id: contracts-address
title: Network & Contract Addresses
sidebar_label: Contract Addresses
---

# Network & Contract Addresses

:::tip
No deployment needed. PAY.ID works like ENS — just connect to the official contracts already live on Lisk Sepolia.
:::

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

**Explorer:** [Lisk Sepolia Blockscout](https://sepolia-blockscout.lisk.com)

---

## Ready-to-Use Config

```ts
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

### ✅ Permissionless

| Action | Contract |
|---|---|
| Subscribe | `RuleItemERC721.subscribe()` |
| Mint Rule NFT | `createRule()` + `activateRule()` |
| Register rule set | `CombinedRuleStorage.registerCombinedRule()` |
| Read active rules | `CombinedRuleStorage.activeRuleOf()` |
| Send payment | `PayWithPayID.payERC20()` |
| Verify proof | `PayIDVerifier.verifyDecision()` |

### 🔐 Admin Only

| Action | Description |
|---|---|
| `PayIDVerifier.setTrustedAuthority()` | Whitelist a new rule authority |
| `RuleItemERC721.pause()` | Pause the contract |
| `RuleItemERC721.setSubscriptionPrice()` | Change subscription price |

---

## Subscription & Fees

| | Detail |
|---|---|
| Price | `0.0001 ETH / 30 days` (testnet) |
| Slots without subscription | 1 rule |
| Slots with subscription | 3 rules (MAX_SLOT) |
| Rule expiry | = `subscriptionExpiry[owner]` at time of `activateRule()` |
