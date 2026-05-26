---
id: contracts-address
title: Network & Contract Addresses
sidebar_label: Contract Addresses
---

# Network & Contract Addresses

:::tip Recommended Testnet — 0G Galileo (Chain 16602)
Contracts are **already deployed and active** on 0G Galileo Testnet. Skip straight to the [0G Galileo section ↓](#0g-galileo-testnet-chain-id-16602) to start building without deploying anything.

Get testnet tokens: [faucet.0g.ai](https://faucet.0g.ai) · Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)
:::

:::info Deploying to Your Own Network
To deploy to a new network, use the Hardhat Ignition module at `packages/contracts/ignition/modules/PayID.ts`, then fill in the addresses below.
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

## Local Fork (Chain ID: 31338)

A local fork for development. All mock contracts (MockEAS, MockAgentRegistry, MockOracle) are available here. Use this when you want to test against a fork of a real network without spending real tokens.

<!-- sync:31338-fork:start -->
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
| `MockOracle` | `0xd038a2ee73b64f30d65802ad188f27921656f28f` |
<!-- sync:31338-fork:end -->

```bash
cd packages/contracts
bun run deploy:local-fork
bun run sync:local-fork
```

**RPC:** `http://100.73.196.95:8550` (configure `LOCAL_FORK_RPC_URL` in `.env` to override)

---

## 0G Newton Testnet — Real (Chain ID: 16600)

:::warning Not Deployed Yet
These are placeholder addresses. Deploy to this network first, then run `bun run sync:zerog-newton` to fill them in.
:::

| Contract | Address |
|---|---|
| `AIAgentRegistry` | `0x0000…0000` |
| `AIAgentRuleManager` | `0x0000…0000` |
| `RuleAuthority` | `0x0000…0000` |
| `RuleItemERC721` | `0x0000…0000` |
| `CombinedRuleStorage` | `0x0000…0000` |
| `PayIDVerifier` | `0x0000…0000` |
| `PayWithPayID` | `0x0000…0000` |
| `AttestationVerifier` | `0x0000…0000` |
| `AgentPayID` | `0x0000…0000` |
| `VindexRegistry` | `0x0000…0000` |

```bash
cd packages/contracts
bun run deploy:zerog-newton
bun run sync:zerog-newton
```

---

## 0G Galileo Testnet (Chain ID: 16602) {#0g-galileo-testnet-chain-id-16602}

:::tip ✅ Deployed & Active — Recommended Starting Point
All contracts are live. No deployment needed. Get free testnet tokens from the faucet and start building immediately.
:::

| Contract | Address |
|---|---|
| `AgentPayID` | `0xC031901680128b1419E6D00Fd7e29c734cE2f311` |
| `AIAgentRegistry` | `0x76E829f48BD5e3c5380f5c77Fe1a3EFBD9AC5a44` |
| `AIAgentRuleManager` | `0xd5eA6ABe9727061c18fa65Fcd75bd7dAc7E7e7f5` |
| `AttestationVerifier` | `0x524130A6974B3075eb6DB32afA89AE4315bf7b2d` |
| `CombinedRuleStorage` | `0x486a6d305742B0b5847770BF421114161440E79b` |
| `EscrowMilestone` | `0xA8C4f9a19B2F0a87f6BAaF4EdeB72E2C2fD60504` |
| `MockAgentRegistry` | `0xFFA2c4bB8075dA83c45698B7489AdC9Cee2f8045` |
| `MockEAS` | `0x170BdFe8495d3c9e331fF2d412Cb7E96303CC4A0` |
| `MockOracle` | `0x49fF785E85e5cA564E8bc1EE7EF5548E41500C12` |
| `PayIDVerifier` | `0xE2FfE1037b996B8F66dE7cba0398A411850Ecd91` |
| `PayWithPayID` | `0x04eEAF2dc4Ee22E7362a60dd652E1DF450697dbb` |
| `PayWithPayIDBatch` | `0xC24618Bc5E3E46398FB2845DA71496505AD30e86` |
| `RecurringPayments` | `0x60d010483B9B9f263923f73ebd7F7F7bA6c0E91b` |
| `RuleAuthority` | `0x3d2F9441c589a24A524c36892268f35C6467bFF6` |
| `RuleItemERC721` | `0xc22fE6CbeE7fA5A35DAf40B30D91d5D3bFfa2fD8` |
| `TimeLockVesting` | `0xa4CA030991ab75F852c017abe6Cc5322e98FCd02` |
| `VindexRegistry` | `0x3F6ba46650f78AcAeebf906306987994555a8CCb` |

**Network Info:**

| | |
|---|---|
| **RPC** | `https://evmrpc-testnet.0g.ai` |
| **Chain ID** | `16602` |
| **Currency** | `A0GI` |
| **Explorer** | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai) |
| **Faucet** | [faucet.0g.ai](https://faucet.0g.ai) |

```bash
# Re-deploy if needed (addresses above already up-to-date)
cd packages/contracts
bun run deploy:zerog-galileo
bun run sync:zerog-galileo
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

# Local Hardhat node (Chain 31337)
bun run deploy:local

# Local Fork (Chain 31338)
bun run deploy:local-fork

# 0G Newton Testnet (Chain 16600)
bun run deploy:zerog-newton

# 0G Galileo Testnet (Chain 16602) ← recommended
bun run deploy:zerog-galileo

# Other testnets
bun run deploy:lisk-sepolia
bun run deploy:monad
bun run deploy:polygon-amoy
```

After deploying, run the sync script to copy addresses into `payid-react` and the frontend:

```bash
bun run sync:local           # for 31337
bun run sync:local-fork      # for 31338
bun run sync:zerog-newton    # for 16600
bun run sync:zerog-galileo   # for 16602
```

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
  vindexRegistry:      '0x...', // VindexRegistry
  aiAgentRegistry:     '0x...', // AIAgentRegistry (optional)
  aiAgentRuleManager:  '0x...', // AIAgentRuleManager (optional)
  attestationVerifier: '0x...', // AttestationVerifier (optional)
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
