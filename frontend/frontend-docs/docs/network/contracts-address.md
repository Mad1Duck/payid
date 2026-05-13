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
| `RuleAuthority` | `0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae` |
| `RuleItemERC721` | `0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D` |
| `CombinedRuleStorage` | `0x0b27a79cb9C0B38eE06Ca3d94DAA68e0Ed17F953` |
| `PayIDVerifier` | `0x773330693cb7d5D233348E25809770A32483A940` |
| `PayWithPayID` | `0x52173b6ac069619c206b9A0e75609fC92860AB2A` |
| `AttestationVerifier` | `0xF85895D097B2C25946BB95C4d11E2F3c035F8f0C` |
| `MockUSDC` (local only) | `0x408F924BAEC71cC3968614Cb2c58E155A35e6890` |
| `MockIDRX` (local only) | `0x47c05BCCA7d57c87083EB4e586007530eE4539e9` |
| `MockEthUsdOracle` (local only) | `0xB468647B04bF657C9ee2de65252037d781eABafD` |
| `MockEAS` (local only) | `0x7bdd3b028C4796eF0EAf07d11394d0d9d8c24139` |
<!-- sync:31337:end -->

**Start local node:**

```bash
cd packages/contracts
npx hardhat node
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost
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
