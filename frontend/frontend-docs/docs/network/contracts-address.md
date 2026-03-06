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

| Contract | Address |
|---|---|
| `RuleAuthority` | `0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44` |
| `RuleItemERC721` | `0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f` |
| `CombinedRuleStorage` | `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE` |
| `PayIDVerifier` | `0x59b670e9fA9D0A427751Af201D676719a970857b` |
| `PayWithPayID` | `0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1` |
| `AttestationVerifier` | `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1` |
| `MockUSDC` (local only) | `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d` |
| `MockEthUsdOracle` (local only) | `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c` |

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
