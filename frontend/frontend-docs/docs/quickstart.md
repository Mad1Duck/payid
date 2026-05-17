---
id: quickstart
title: Quick Start
sidebar_label: '⚡ Quick Start'
sidebar_position: 2
slug: /quickstart
---

# Quick Start

PAY.ID has two integration paths. Choose the one that fits your use case:

| | Path A — React Frontend | Path B — Node.js Backend |
|---|---|---|
| **Package** | `payid-react` | `payid` |
| **Who signs proofs** | User's wallet (MetaMask, etc.) | Your server wallet |
| **Use case** | dApps, checkout pages, marketplaces | APIs, bots, ERC-4337 bundlers |
| **Complexity** | Simple — one hook | Moderate — handle context + signing |

:::info Two Roles in PAY.ID
**Receiver (Merchant)** — sets up payment rules once. **Payer (Customer)** — goes through the payment flow every time they pay.
:::

---

## Path A — React Quick Start

### Prerequisites

- React 18+ app (Next.js, Vite, CRA)
- A deployed PAY.ID network (see [Contract Addresses →](./network/contracts-address))

### Step 1 — Install Packages

```bash
npm install payid-react payid wagmi viem @tanstack/react-query ethers
# or
bun add payid-react payid wagmi viem @tanstack/react-query ethers
```

### Step 2 — Wrap Your App with Providers

This setup goes in your root file (`main.tsx`, `_app.tsx`, or `layout.tsx`):

```tsx
// main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PayIDProvider } from 'payid-react'
import App from './App'
import type { Chain } from 'viem'

// 0G Galileo Testnet (chain 16602)
const zeroGGalileo = {
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { decimals: 18, name: 'A0GI', symbol: 'A0GI' },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
    public: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Galileo Explorer', url: 'https://chainscan-galileo.0g.ai' },
  },
} as const satisfies Chain

const wagmiConfig = createConfig({
  chains: [zeroGGalileo],
  connectors: [injected(), metaMask()],
  transports: { [zeroGGalileo.id]: http() },
})

const queryClient = new QueryClient()

// ✅ 0G Galileo Testnet — Contract Addresses (Chain 16602)
// Explorer: https://chainscan-galileo.0g.ai
const CONTRACT_ADDRESSES = {
  [zeroGGalileo.id]: {
    ruleAuthority:       '0x3d2F9441c589a24A524c36892268f35C6467bFF6',
    ruleItemERC721:      '0xc22fE6CbeE7fA5A35DAf40B30D91d5D3bFfa2fD8',
    combinedRuleStorage: '0x486a6d305742B0b5847770BF421114161440E79b',
    payIDVerifier:       '0xE2FfE1037b996B8F66dE7cba0398A411850Ecd91',
    payWithPayID:        '0x04eEAF2dc4Ee22E7362a60dd652E1DF450697dbb',
    vindexRegistry:      '0x3F6ba46650f78AcAeebf906306987994555a8CCb',
    aiAgentRegistry:     '0x76E829f48BD5e3c5380f5c77Fe1a3EFBD9AC5a44',
    aiAgentRuleManager:  '0xd5eA6ABe9727061c18fa65Fcd75bd7dAc7E7e7f5',
    attestationVerifier: '0x524130A6974B3075eb6DB32afA89AE4315bf7b2d',
    agentPayID:          '0xC031901680128b1419E6D00Fd7e29c734cE2f311',
    mockAgentRegistry:   '0xFFA2c4bB8075dA83c45698B7489AdC9Cee2f8045',
    payWithPayIDBatch:   '0xC24618Bc5E3E46398FB2845DA71496505AD30e86',
    recurringPayments:   '0x60d010483B9B9f263923f73ebd7F7F7bA6c0E91b',
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <PayIDProvider contracts={CONTRACT_ADDRESSES}>
        <App />
      </PayIDProvider>
    </QueryClientProvider>
  </WagmiProvider>
)
```

### Step 3 — Add a Wallet Connect Button

`payid-react` works with any wagmi-compatible wallet connector. Add one from [wagmi's supported connectors](https://wagmi.sh/react/api/connectors). Example with MetaMask:

```tsx
// WalletButton.tsx
import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export function WalletButton() {
  const { connect } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected) return (
    <div>
      <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  )

  return (
    <button onClick={() => connect({ connector: injected() })}>
      Connect Wallet
    </button>
  )
}
```

### Step 4 — Make a Payment (Payer)

Use the `usePayIDFlow` hook. It handles everything: loading rules, evaluating, signing proof, ERC20 approval, and submitting the transaction.

```tsx
// CheckoutButton.tsx
import { usePayIDFlow } from 'payid-react'

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

export function CheckoutButton({ merchantAddress }: { merchantAddress: `0x${string}` }) {
  const {
    execute, reset,
    status, isPending, isSuccess,
    error, decision, denyReason, txHash,
  } = usePayIDFlow()

  const handlePay = () => {
    execute({
      receiver: merchantAddress,
      asset:    USDC_ADDRESS,
      amount:   50_000_000n,        // 50 USDC (6 decimals)
      payId:    'pay.id/my-store',
    })
  }

  return (
    <div>
      <button onClick={handlePay} disabled={isPending}>
        {status === 'idle'            && 'Pay 50 USDC'}
        {status === 'fetching-rule'   && 'Loading rules...'}
        {status === 'evaluating'      && 'Checking rules...'}
        {status === 'proving'         && 'Sign proof in wallet...'}
        {status === 'approving'       && 'Approve USDC...'}
        {status === 'awaiting-wallet' && 'Confirm payment...'}
        {status === 'confirming'      && 'Confirming on chain...'}
        {status === 'success'         && '✅ Paid!'}
        {status === 'denied'          && '❌ Denied'}
        {status === 'error'           && 'Retry'}
      </button>

      {status === 'denied'  && <p>Reason: {denyReason}</p>}
      {status === 'success' && <p>TX: <a href={`https://etherscan.io/tx/${txHash}`}>{txHash?.slice(0, 10)}...</a></p>}
      {error                && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

### Step 5 — Create Your Merchant Rules (Receiver)

Before anyone can pay you, set up your payment policy using the merchant hooks:

```tsx
// MerchantSetup.tsx
import { useSubscribe, useCreateRule, useActivateRule, useRegisterCombinedRule } from 'payid-react'
import { keccak256, toBytes } from 'viem'

// Your payment rule — only accept USDC between 10–500
const MY_RULE = {
  id:      'store_policy',
  logic:   'AND' as const,
  rules: [
    { id: 'usdc_only', if: { field: 'tx.asset', op: '==', value: USDC_ADDRESS } },
    { id: 'min_10',    if: { field: 'tx.amount', op: '>=', value: '10000000' } },
    { id: 'max_500',   if: { field: 'tx.amount', op: '<=', value: '500000000' } },
  ],
}

export function MerchantSetup() {
  const { subscribe,       isPending: subscribing,  isSuccess: subscribed   } = useSubscribe()
  const { createRule,      isPending: creating,     isSuccess: created      } = useCreateRule()
  const { activateRule,    isPending: activating,   isSuccess: activated    } = useActivateRule()
  const { registerCombinedRule, isPending: registering, isSuccess: registered } = useRegisterCombinedRule()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Step 1: Subscribe to get a rule slot */}
      <button onClick={() => subscribe(100_000_000_000_000n)} disabled={subscribing}>
        {subscribed ? '✅ Subscribed' : subscribing ? 'Subscribing...' : '1. Subscribe (0.0001 ETH)'}
      </button>

      {/* Step 2: Create the rule definition on-chain */}
      <button
        onClick={() => createRule({
          ruleHash: keccak256(toBytes(JSON.stringify(MY_RULE))),
          uri:      'ipfs://YOUR_RULE_CID',  // upload to IPFS first
        })}
        disabled={creating || !subscribed}
      >
        {created ? '✅ Rule Created' : creating ? 'Creating...' : '2. Create Rule'}
      </button>

      {/* Step 3: Activate (mint the NFT) — use ruleId from Step 2 */}
      <button onClick={() => activateRule(1n)} disabled={activating || !created}>
        {activated ? '✅ Rule NFT Minted' : activating ? 'Activating...' : '3. Activate Rule NFT'}
      </button>

      {/* Step 4: Register as active payment policy */}
      <button
        onClick={() => registerCombinedRule({
          ruleSetHash: keccak256(toBytes('my-store-v1')),
          ruleNFTs:    ['0xRuleItemERC721Address'],
          tokenIds:    [1n],
          version:     1n,
        })}
        disabled={registering || !activated}
      >
        {registered ? '✅ Policy Active!' : registering ? 'Registering...' : '4. Activate Policy'}
      </button>
    </div>
  )
}
```

:::tip Store Rules on 0G Storage (Recommended) or IPFS
PAY.ID supports two storage backends for rule metadata:

**Option A — 0G Storage** (recommended on 0G Galileo Testnet):
```ts
import { uploadToZGStorage } from '@/lib/zgStorage'
// Upload returns a root hash — use as uri: `0g://<rootHash>`
const result = await uploadToZGStorage(JSON.stringify(MY_RULE), signer)
const uri = `0g://${result.rootHash}`
```

**Option B — IPFS via Pinata** (traditional):
```bash
# Upload rule JSON to Pinata at https://app.pinata.cloud
# Use the returned CID as: uri = 'ipfs://YOUR_CID'
```

See [0G Storage Guide →](./integration/0g-storage) or [Create Rule NFT →](./examples/create-nft-rule) for the full script.
:::

That's it for the React path! → **[Full React Integration →](./integration/react-integration)** for all 20+ hooks.

---

## Path B — Node.js Quick Start

For backend servers, bots, or scripts.

### Step 1 — Install

```bash
npm install payid ethers
# or
bun add payid ethers
```

### Step 2 — Initialize the SDK

```ts
// server.ts
import { createPayIDServer } from 'payid/server'
import { ethers } from 'ethers'

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const signer   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)

const payid = createPayIDServer({
  signer,
  // Storage config for fetching rules from 0G Storage
  zgStorageIndexer: 'https://indexer-storage-testnet-turbo.0g.ai',
})
```

### Step 3 — Evaluate and Generate Proof

```ts
import { ethers } from 'ethers'

// Load merchant's active rule set from chain + IPFS
// (see examples/client.md for full loading code)
const authorityRule = { version: '1', logic: 'AND', rules: ruleConfigs }

const { result, proof } = await payid.evaluateAndProve({
  context: {
    tx: {
      sender:   payerAddress,
      receiver: merchantAddress,
      asset:    usdcAddress,
      amount:   '50000000',       // 50 USDC (string)
      chainId:  1,
    },
    env: { timestamp: Math.floor(Date.now() / 1000) },
  },
  authorityRule,
  payId:             'pay.id/my-store',
  payer:             payerAddress,
  receiver:          merchantAddress,
  asset:             usdcAddress,
  amount:            50_000_000n,    // bigint
  verifyingContract: process.env.PAYID_VERIFIER!,
  ruleAuthority:     process.env.COMBINED_RULE_STORAGE!,
  chainId:           1,
  blockTimestamp:    Math.floor(Date.now() / 1000),
  ttlSeconds:        300,
})

if (result.decision === 'REJECT') {
  throw new Error(`Payment rejected: ${result.reason ?? result.code}`)
}

console.log('Proof ready. Send to client:', {
  payload:   proof!.payload,
  signature: proof!.signature,
})
```

### Step 4 — Submit Payment On-chain

On the client side (or backend if custodial), submit the proof to the contract:

```ts
import PayWithPayIDAbi from './abi/PayWithPayID.json'

const payContract = new ethers.Contract(
  process.env.PAY_WITH_PAYID!,
  PayWithPayIDAbi.abi,
  payerWallet
)

// ERC20 payment
const tx = await payContract.getFunction('payERC20').send(
  proof!.payload,
  proof!.signature,
  [],   // attestationUIDs (empty for client mode)
)
await tx.wait()

// Native token payment — pass value:
const tx = await payContract.getFunction('payNative').send(
  proof!.payload,
  proof!.signature,
  [],
  { value: 50_000_000n }
)
```

→ **[Full Server Guide →](./examples/server)** for Context V2, KYC, and rate limits.

---

## Summary of Flows

```
RECEIVER SETUP (done once):
  1. subscribe()               → get a rule slot (ETH fee, 30 days)
  2. createRule(hash, uri)     → register rule definition on-chain
  3. activateRule(ruleId)      → mint Rule NFT (proof of ownership)
  4. registerCombinedRule(...) → set as active payment policy

PAYER FLOW (every payment):
  1. getActiveRuleOf(receiver) → fetch receiver's active rule hash
  2. loadRulesFromIPFS(refs)   → get rule JSON configs
  3. evaluateAndProve(...)     → evaluate rules + generate signed proof
  4. approve(contract, amount) → ERC20 spending approval (if needed)
  5. payERC20(payload, sig,[]) → submit to blockchain
  // or payNative(payload, sig,[]) for native token (ETH, MATIC, A0GI, etc.)
```

---

## Next Steps

| Goal | Guide |
|---|---|
| All React hooks | [React Integration →](./integration/react-integration) |
| Understand Rules | [Rule Basics →](./rules/rule-basics) |
| KYC / rate limits on backend | [Server Mode →](./examples/server) |
| QR code payments | [React Integration → usePayIDQR →](./integration/react-integration#usepayidqr----qr-code-generator-merchant) |
| Deploy to testnet | [Contract Addresses →](./network/contracts-address) |
