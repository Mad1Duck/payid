---
id: contracts-address
title: Network & Contract Addresses
sidebar_label: Contract Addresses
---

# Network & Contract Addresses

:::tip Deployed Testnets
Contracts are deployed on multiple testnets. Choose one that fits your needs:
- **Arbitrum Sepolia (421614)** — Uses real EAS and Chainlink ETH/USD oracle
- **0G Galileo (16602)** — Full contract deployment with all features

See the sections below for network details and contract addresses.
:::

:::info Deploying to Your Own Network
To deploy to a new network, use the Hardhat Ignition module at `packages/contracts/ignition/modules/PayID.ts`, then fill in the addresses below.
:::

---

## Arbitrum Sepolia (Chain ID: 421614)

:::tip ✅ Deployed & Active
All contracts are live on Arbitrum Sepolia. Uses real EAS and Chainlink ETH/USD oracle.
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
| **RPC** | `https://sepolia-rollup.arbitrum.io/rpc` |
| **Chain ID** | `421614` |
| **Currency** | `ETH` |
| **Explorer** | [sepolia.arbiscan.io](https://sepolia.arbiscan.io) |
| **Faucet** | [faucet.triangleplatform.com/arbitrum/sepolia](https://faucet.triangleplatform.com/arbitrum/sepolia) |
| **EAS** | `0xaEF4103A04090071165F78D45D83A0C0782c2B2` |
| **Chainlink ETH/USD** | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` |

---

## 0G Galileo Testnet (Chain ID: 16602)

:::tip ✅ Deployed & Active
All contracts are live on 0G Galileo Testnet.
:::

| Contract | Address |
|---|---|
| `AIAgentRegistry` | `0xf5cf5cb577118e1a0993e69eb373C47A242C01D3` |
| `AIAgentRuleManager` | `0x45024b9dB494C66f1B2E43F910664D6f4E261D6C` |
| `AgentPayID` | `0xa0c23E005f5D627dB73024385828c5682e63F364` |
| `AttestationVerifier` | `0x0a83AEbdEeb392328F133b056b63946a3212FB60` |
| `CombinedRuleStorage` | `0xF674A5738D4f70006a9d3C541A0CF149E284a182` |
| `EscrowMilestone` | `0xC3c33B616A77Ee8f63D5f65F6Ff8fc248F7b7A16` |
| `PayIDVerifier` | `0x8FeCc22437Ab5Bc53805B2ebe8b861A2F3177737` |
| `PayWithPayID` | `0x73c8B8f359AC2A16a8962e16842B8e7A1773024f` |
| `PayWithPayIDBatch` | `0x7031d36feeE7022cE7563b88bAc16698c73eAF02` |
| `RecurringPayments` | `0x432dBA247F2F61fEc5DEe1F84E3855d44e9925D6` |
| `RuleAuthority` | `0x44a50e4B7051C7155C28271bA9eacFd71ee571a8` |
| `RuleItemERC721` | `0xD3897D0ba0F219835b000992B21e56e8C44C7715` |
| `TimeLockVesting` | `0xEc74D41FaDe9E100804fdda8876cA8Aeb85a0902` |
| `VindexRegistry` | `0xa7448AEc914074e19C0bC2259E6e1FAe695aCb0f` |

**Network Info:**

| | |
|---|---|
| **RPC** | `https://evmrpc-testnet.0g.ai` |
| **Chain ID** | `16602` |
| **Currency** | `A0GI` |
| **Explorer** | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai) |
| **Faucet** | [faucet.0g.ai](https://faucet.0g.ai) |

---

## Other Networks

Contracts have not been deployed to these networks yet. To deploy to a new network, use the Hardhat Ignition module at `packages/contracts/ignition/modules/PayID.ts`, then configure `payid-react` with your addresses via `<PayIDProvider contracts={...}>`.

| Network | Chain ID | Status |
|---|---|---|
| Lisk Sepolia | 4202 | Not deployed |
| Monad Testnet | 10143 | Not deployed |
| Moonbase Alpha | 1287 | Not deployed |
| Polygon Amoy | 80002 | Not deployed |

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
