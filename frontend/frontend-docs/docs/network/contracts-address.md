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
| `AIAgentRegistry` | `0x1eB5C49630E08e95Ba7f139BcF4B9BA171C9a8C7` |
| `AIAgentRuleManager` | `0x5A569Ad19272Afa97103fD4DbadF33B2FcbaA175` |
| `RuleAuthority` | `0x25A1DF485cFBb93117f12fc673D87D1cddEb845a` |
| `RuleItemERC721` | `0xD855cE0C298537ad5b5b96060Cf90e663696bbf6` |
| `CombinedRuleStorage` | `0xA9d0Fb5837f9c42c874e16da96094b14Af0e2784` |
| `PayIDVerifier` | `0xF9c0bF1CFAAB883ADb95fed4cfD60133BffaB18a` |
| `PayWithPayID` | `0xb830887eE23d3f9Ed8c27dbF7DcFe63037765475` |
| `AttestationVerifier` | `0x6e0a5725dD4071e46356bD974E13F35DbF9ef367` |
| `AgentPayID` | `0x696358bBb1a743052E0E87BeD78AAd9d18f0e1F4` |
| `VindexRegistry` | `0x22b1c5C2C9251622f7eFb76E356104E5aF0e996A` |
| `MockEAS` | `0xa31F4c0eF2935Af25370D9AE275169CCd9793DA3` |
| `MockAgentRegistry` | `0x1f53E116c31F171e59f45f0752AEc5d1F5aA3714` |
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
