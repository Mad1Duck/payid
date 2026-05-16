---
id: contracts-address
title: Network & Contract Addresses
sidebar_label: Contract Addresses
---

# Network & Contract Addresses

:::info Deploy Your Own
PAY.ID contracts need to be deployed to your target network. Use the Hardhat Ignition module in `packages/contracts/ignition/modules/PayID.ts` to deploy, then fill in the addresses below.
:::

---

## Localhost (Hardhat — Chain ID: 31337)

These are the addresses from a fresh local `npx hardhat node` + `hardhat ignition deploy` run. They match the default deployment order and will be the same on any clean local node.

<!-- sync:31337:start -->
| Contract | Address |
|---|---|
| `RuleAuthority` | `0xffa7CA1AEEEbBc30C874d32C7e22F052BbEa0429` |
| `RuleItemERC721` | `0x3aAde2dCD2Df6a8cAc689EE797591b2913658659` |
| `CombinedRuleStorage` | `0xc96304e3c037f81dA488ed9dEa1D8F2a48278a75` |
| `PayIDVerifier` | `0x276C216D241856199A83bf27b2286659e5b877D3` |
| `PayWithPayID` | `0x3347B4d90ebe72BeFb30444C9966B2B990aE9FcB` |
| `AttestationVerifier` | `0xc0F115A19107322cFBf1cDBC7ea011C19EbDB4F8` |
| `AgentPayID` | `0x1f10F3Ba7ACB61b2F50B9d6DdCf91a6f787C0E82` |
| `VindexRegistry` | `0xE3011A37A904aB90C8881a99BD1F6E21401f1522` |
| `MockEAS` (local only) | `0x07882Ae1ecB7429a84f1D53048d35c4bB2056877` |
| `MockAgentRegistry` (local only) | `0xD0141E899a65C95a556fE2B27e5982A6DE7fDD7A` |
<!-- sync:31337:end -->

**Start local node:**

```bash
cd packages/contracts
npx hardhat node
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost
```

---

## Chain 16601 (Chain ID: 16601)

<!-- sync:16601:start -->
| Contract | Address |
|---|---|
| `AIAgentRegistry` | `0x666432Ccb747B2220875cE185f487Ed53677faC9` |
| `AIAgentRuleManager` | `0x8f119cd256a0FfFeed643E830ADCD9767a1d517F` |
| `RuleAuthority` | `0x906B067e392e2c5f9E4f101f36C0b8CdA4885EBf` |
| `RuleItemERC721` | `0xD94A92749C0bb33c4e4bA7980c6dAD0e3eFfb720` |
| `CombinedRuleStorage` | `0xF6a8aD553b265405526030c2102fda2bDcdDC177` |
| `PayIDVerifier` | `0x15Ff10fCc8A1a50bFbE07847A22664801eA79E0f` |
| `PayWithPayID` | `0xAe9Ed85dE2670e3112590a2BB17b7283ddF44d9c` |
| `AttestationVerifier` | `0xeC1BB74f5799811c0c1Bff94Ef76Fb40abccbE4a` |
| `AgentPayID` | `0xe14058B1c3def306e2cb37535647A04De03Db092` |
| `VindexRegistry` | `0x4f42528B7bF8Da96516bECb22c1c6f53a8Ac7312` |
| `MockEAS` | `0x6732128F9cc0c4344b2d4DC6285BCd516b7E59E6` |
| `MockAgentRegistry` | `0x3E661784267F128e5f706De17Fac1Fc1c9d56f30` |
<!-- sync:16601:end -->

```bash
cd packages/contracts
bun run deploy:chain-16601
```
---

## Other Networks

Contracts have not been deployed to public testnets yet. Deploy using the Ignition module, fill in your `.env`, then configure `payid-react` with your addresses via `<PayIDProvider contracts={...}>`.

| Network | Chain ID | Status |
|---|---|---|
| Lisk Sepolia | 4202 | Not deployed |
| Monad Testnet | 10143 | Not deployed |
| Moonbase Alpha | 1287 | Not deployed |
| Polygon Amoy | 80002 | Not deployed |

---

## Deploying Contracts

```bash
cd packages/contracts

# Local
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost

# Lisk Sepolia
npx hardhat ignition deploy ignition/modules/PayID.ts \
  --network liskSepolia \
  --parameters ignition/parameters/liskSepolia.json

# Monad Testnet
npx hardhat ignition deploy ignition/modules/PayID.ts \
  --network monadTestnet \
  --parameters ignition/parameters/monadTestnet.json
```

After deploying, copy the addresses from `ignition/deployments/<network>/deployed_addresses.json`.

---

## Configuring payid-react with Your Addresses

Pass your deployed addresses to `<PayIDProvider>`:

```tsx
import { PayIDProvider } from 'payid-react'
import type { PayIDContracts } from 'payid-react'

// Your deployed addresses
const MY_CONTRACTS: PayIDContracts = {
  ruleAuthority:       '0x...', // RuleAuthority
  ruleItemERC721:      '0x...', // RuleItemERC721
  combinedRuleStorage: '0x...', // CombinedRuleStorage
  payIDVerifier:       '0x...', // PayIDVerifier
  payWithPayID:        '0x...', // PayWithPayID
}

export default function App() {
  return (
    <PayIDProvider contracts={{ [YOUR_CHAIN_ID]: MY_CONTRACTS }}>
      <YourApp />
    </PayIDProvider>
  )
}
```

---

## Permission Model

### ✅ Permissionless

| Action | Contract |
|---|---|
| Subscribe | `RuleItemERC721.subscribe()` |
| Create Rule NFT | `createRule()` + `activateRule()` |
| Extend Rule expiry | `extendRuleExpiry(tokenId, newExpiry)` |
| Register rule set | `CombinedRuleStorage.registerCombinedRule()` |
| Deactivate rule set | `CombinedRuleStorage.deactivateMyCombinedRule()` |
| Read active rules | `CombinedRuleStorage.getActiveRuleOf()` |
| Send ETH payment | `PayWithPayID.payETH()` |
| Send ERC20 payment | `PayWithPayID.payERC20()` |
| Verify proof | `PayIDVerifier.verifyDecision()` |

### 🔐 Admin Only

| Action | Description |
|---|---|
| `PayIDVerifier.setTrustedAuthority(addr, bool)` | Whitelist or remove a rule authority |
| `RuleItemERC721.pause()` | Emergency pause |
| `RuleItemERC721.setSubscriptionUsdCents(n)` | Change subscription price |
| `MockEthUsdOracle.setPrice(n)` | Update oracle price (test only, owner-gated) |

---

## Subscription & Fees

| | Detail |
|---|---|
| Subscription fee | Calculated from oracle ETH/USD price × `subscriptionUsdCents` |
| Fallback price | `0.0001 ETH` (if oracle is stale > 1 hour or reverts) |
| Subscription duration | 30 days per payment |
| Rule slots without subscription | 1 |
| Rule slots with subscription | 3 (`MAX_SLOT`) |
| Rule expiry | Set explicitly via `extendRuleExpiry(tokenId, timestamp)` |
