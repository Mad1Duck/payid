---
id: react-integration
title: React Integration
sidebar_label: React Integration
---

# React Integration

`payid-react` is the React package for PAY.ID, built on [wagmi](https://wagmi.sh). It provides 20+ hooks for payments, rule management, and QR codes — handling all contract calls, wallet signatures, and WASM initialization automatically.

---

## Install

```bash
npm install payid-react payid wagmi viem @tanstack/react-query ethers
# or
bun add payid-react payid wagmi viem @tanstack/react-query ethers
```

For QR image rendering (optional — `payload` string is always available):

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## Provider Setup

`payid-react` requires `WagmiProvider` and `QueryClientProvider` as parents. The `PayIDProvider` resolves contract addresses per chain automatically.

```tsx
// main.tsx
import { WagmiProvider, createConfig, http } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PayIDProvider } from 'payid-react'

const wagmiConfig = createConfig({
  chains: [hardhat],
  transports: { [hardhat.id]: http() },
})

const queryClient = new QueryClient()

export default function Root() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Optional: override contract addresses per chain */}
        <PayIDProvider
          contracts={{
            31337: {
              ruleAuthority:       '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
              ruleItemERC721:      '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f',
              combinedRuleStorage: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
              payIDVerifier:       '0x59b670e9fA9D0A427751Af201D676719a970857b',
              payWithPayID:        '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
            },
          }}
          ipfsGateway="https://gateway.pinata.cloud/ipfs/"
        >
          <App />
        </PayIDProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## Step-by-Step: Build a Complete Checkout Page

This walks you through adding PAY.ID to a React app from scratch.

### 1. Install & wrap your app

```bash
bun add payid-react payid wagmi viem @tanstack/react-query ethers
```

Wrap your app (see [Provider Setup →](../installation/setup#react-provider-setup)):

```tsx
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <PayIDProvider contracts={{ [chainId]: { ...contractAddresses } }}>
      <App />
    </PayIDProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### 2. Add wallet connect (any wagmi connector)

```tsx
import { useConnect, useAccount } from 'wagmi'
import { injected } from 'wagmi/connectors'

function ConnectButton() {
  const { connect } = useConnect()
  const { address, isConnected } = useAccount()

  if (isConnected) return <span>{address?.slice(0, 8)}...</span>
  return <button onClick={() => connect({ connector: injected() })}>Connect Wallet</button>
}
```

### 3. Add a payment button (payer side)

```tsx
import { usePayIDFlow } from 'payid-react'

function PayButton({ receiver }: { receiver: `0x${string}` }) {
  const { execute, status, isPending, isSuccess, error, txHash } = usePayIDFlow()

  return (
    <button
      onClick={() => execute({ receiver, asset: USDC_ADDRESS, amount: 50_000_000n, payId: 'pay.id/store' })}
      disabled={isPending || isSuccess}
    >
      {isSuccess ? `✅ Paid! TX: ${txHash?.slice(0, 10)}...` : isPending ? 'Processing...' : 'Pay 50 USDC'}
    </button>
  )
}
```

### 4. Check merchant subscription status

```tsx
import { useSubscription } from 'payid-react'
import { useAccount } from 'wagmi'

function SubscriptionBadge() {
  const { address } = useAccount()
  const { data: sub } = useSubscription(address)

  if (!sub?.isActive) return <span style={{ color: 'red' }}>⚠️ No active subscription</span>
  return <span style={{ color: 'green' }}>✅ Subscribed — {sub.logicalRuleCount}/{sub.maxSlots} slots used</span>
}
```

### 5. Set up merchant rules (one-time)

```tsx
import { useSubscribe, useCreateRule, useActivateRule, useRegisterCombinedRule } from 'payid-react'

// Follow the 4-step merchant setup from Quick Start →
// subscribe() → createRule() → activateRule() → registerCombinedRule()
```

That's all you need for a fully working checkout. The rest of this page covers every available hook in detail.

---

## Hooks Overview

### Payment Hooks (Payer side)

| Hook | Returns | Description |
|---|---|---|
| `usePayIDFlow()` | `{ execute, status, isPending, isSuccess, decision, txHash, error, reset }` | Complete payment flow — rules + proof + submit |
| `usePayNative()` | `{ pay, hash, isPending, isConfirming, isSuccess, error }` | Low-level native token payment (ETH, MATIC, A0GI, etc.) |
| `usePayERC20()` | `{ pay, hash, isPending, isConfirming, isSuccess, error }` | Low-level ERC20 payment |

### QR Hooks (Merchant side)

| Hook | Returns | Description |
|---|---|---|
| `usePayIDQR()` | `{ generate, payload, qrDataUrl, status, isPending, isReady, error, reset }` | Generate signed QR for customers to scan |

### Merchant Setup Hooks (Write — one-time setup)

| Hook | Action | Description |
|---|---|---|
| `useSubscribe()` | `subscribe(priceInWei)` | Subscribe to unlock rule slots |
| `useCreateRule()` | `createRule({ ruleHash, uri })` | Register a rule definition on-chain |
| `useActivateRule()` | `activateRule(ruleId)` | Mint the Rule NFT |
| `useCreateRuleVersion()` | `createRuleVersion({ parentRuleId, newHash, newUri })` | Create a new version of an existing rule |
| `useExtendRuleExpiry()` | `extendRuleExpiry({ tokenId, newExpiry, priceInWei })` | Extend Rule NFT expiry |
| `useRegisterCombinedRule()` | `registerCombinedRule({ ruleSetHash, ruleNFTs, tokenIds, version })` | Register as active payment policy |
| `useDeactivateCombinedRule()` | `deactivate()` | Deactivate your active policy |

### Read Hooks

| Hook | Data | Description |
|---|---|---|
| `useSubscription(address?)` | `SubscriptionInfo \| undefined` | Subscription status, slots, expiry |
| `useSubscriptionPrice()` | `bigint \| undefined` | Current subscription price from oracle |
| `useMyRules()` | `RuleDefinition[]` | Your Rule NFTs (connected wallet) |
| `useRules(options?)` | `RuleDefinition[]` | All rules with optional filters |
| `useRule(ruleId?)` | `RuleDefinition \| undefined` | Single rule by ID |
| `useRuleCount()` | `bigint` | Total number of rules created |
| `useRuleExpiry(tokenId?)` | `bigint` | Unix expiry timestamp for a Rule NFT |
| `useActiveCombinedRule(owner?)` | `CombinedRule \| undefined` | Active payment policy for any address |
| `useActiveCombinedRuleByDirection(owner?, direction)` | `CombinedRule \| undefined` | Active policy by direction (INBOUND/OUTBOUND) |
| `useAllCombinedRules(options?)` | `CombinedRule[]` | All registered combined rules |
| `useMyRuleSets()` | `RuleSet[]` | Your registered rule sets |
| `useOwnerRuleSets(owner?)` | `RuleSet[]` | Rule sets for any address |
| `useVerifyDecision(decision?, signature?)` | `boolean` | Verify a Decision Proof on-chain |
| `useNonceUsed(payer?, nonce?)` | `boolean` | Check if a nonce was already used |

---

## `usePayIDFlow` — Full Payment Flow (Payer)

The simplest way to pay. Handles every step: loading rules from chain + IPFS, evaluating, signing proof, ERC20 approval, and submitting the transaction.

```tsx
import { usePayIDFlow } from 'payid-react'
import { parseUnits, zeroAddress } from 'viem'

const USDC_ADDRESS = '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'

function CheckoutButton({ merchantAddress }: { merchantAddress: `0x${string}` }) {
  const { execute, reset, status, isPending, isSuccess, error, decision, denyReason, txHash } =
    usePayIDFlow()

  const handlePay = () => {
    execute({
      receiver:  merchantAddress,
      asset:     USDC_ADDRESS,
      amount:    parseUnits('50', 6),    // 50 USDC
      payId:     'pay.id/merchant',
      // Optional: pass custom context fields (merged into tx/env/state)
      context:   { state: { spentToday: '0', period: new Date().toISOString().slice(0, 10) } },
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
      {status === 'success' && <p>TX: {txHash}</p>}
      {error                && <p style={{ color: 'red' }}>{error}</p>}

      {(status === 'success' || status === 'error' || status === 'denied') && (
        <button onClick={reset}>Reset</button>
      )}
    </div>
  )
}
```

### Native Token Payment

Pass `zeroAddress` as the asset for the chain's native token (ETH on Ethereum, MATIC on Polygon, A0GI on 0G, etc.):

```tsx
execute({
  receiver: merchantAddress,
  asset:    zeroAddress,                 // address(0) = native token
  amount:   parseUnits('0.01', 18),      // 0.01 native token
  payId:    'pay.id/merchant',
})
```

### Flow Status Reference

| Status | What's happening |
|---|---|
| `idle` | Ready to start |
| `fetching-rule` | Reading merchant's active rule hash from chain |
| `evaluating` | Running rules through WASM engine |
| `proving` | Generating EIP-712 proof — wallet signature requested |
| `approving` | Waiting for ERC20 `approve` TX (auto-triggered if allowance is insufficient) |
| `awaiting-wallet` | Waiting for user to confirm payment TX |
| `confirming` | TX submitted, waiting for block confirmation |
| `success` | Payment confirmed on-chain ✅ |
| `denied` | Rules rejected this payment ❌ |
| `error` | Something went wrong — check `error` field |

### Loading States

`usePayIDFlow` includes `isPending` which is true during all active states (fetching-rule → evaluating → proving → approving → awaiting-wallet → confirming). Use this to disable buttons and show spinners:

```tsx
<button onClick={handlePay} disabled={isPending}>
  {isPending ? (
    <>
      <Loader2 className="animate-spin w-4 h-4" />
      Processing...
    </>
  ) : 'Pay 50 USDC'}
</button>
```

For skeleton loaders on initial data load, use the `isLoading` state from wagmi hooks like `useBalance`:

```tsx
const { data: balance, isLoading: balanceLoading } = useBalance({ address })

{balanceLoading ? <Skeleton className="h-10 w-40" /> : <div>{balance?.formatted}</div>}
```

### Multi-Chain Native Currency Support

`payid-react` automatically detects the chain's native currency symbol. Use `useChains` and `useChainId` from wagmi to get the current chain's native token:

```tsx
import { useChains, useChainId } from 'wagmi'

function TokenDisplay() {
  const chainId = useChainId()
  const chains = useChains()
  const currentChain = chains.find(c => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'
  const nativeName = currentChain?.nativeCurrency.name ?? 'Ethereum'

  return (
    <div>
      <span>{nativeName}</span>
      <span>{nativeSymbol}</span>
    </div>
  )
}
```

This works across all supported chains:
- Ethereum → ETH
- Polygon → MATIC
- 0G Newton → A0GI
- Lisk Sepolia → LISK
- etc.

---

## `usePayIDQR` — QR Code Generator (Merchant)

Merchants use this hook to generate a signed QR code that customers scan to pay. The QR encodes a `SessionPolicyV2` — the merchant's payment constraints signed with EIP-712.

```tsx
import { usePayIDQR } from 'payid-react'
import { parseUnits } from 'viem'

const USDC_ADDRESS = '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'

function MerchantQR() {
  const { generate, reset, status, isPending, isReady, payload, qrDataUrl, error } =
    usePayIDQR()

  const handleGenerate = () => {
    generate({
      payId:        'pay.id/my-shop',
      allowedAsset: USDC_ADDRESS,
      maxAmount:    parseUnits('100', 6),   // max 100 USDC per scan
      expiresAt:    Math.floor(Date.now() / 1000) + 3600,  // valid 1 hour
    })
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={isPending}>
        {isPending ? 'Generating...' : 'Generate QR'}
      </button>

      {/* qrDataUrl is available if 'qrcode' package is installed */}
      {qrDataUrl && <img src={qrDataUrl} alt="Scan to pay" width={256} />}

      {/* payload is always available — use with any QR library */}
      {payload && !qrDataUrl && (
        // Example with react-qr-code (npm install react-qr-code)
        <div style={{ background: 'white', padding: 16 }}>
          <p style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 12 }}>
            {payload}
          </p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isReady && <button onClick={reset}>New QR</button>}
    </div>
  )
}
```

**On the payer side**, after scanning:

```ts
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'

const policy = decodeSessionPolicyV2QR(scannedQRString)

// Pass to usePayIDFlow via sessionPolicyV2 context field
execute({
  receiver: policy.receiver as `0x${string}`,
  asset:    policy.allowedAsset as `0x${string}`,
  amount:   BigInt(policy.maxAmount),
  payId:    policy.payId,
})
```

### QR Status Reference

| Status | What's happening |
|---|---|
| `idle` | Ready |
| `signing` | Merchant wallet is signing the SessionPolicyV2 |
| `encoding` | Encoding policy to `payid-v2:...` string |
| `rendering` | Rendering QR image (only if `qrcode` is installed) |
| `ready` | QR is ready — `payload` and optionally `qrDataUrl` available |
| `error` | Failed — check `error` |

---

## Merchant Write Hooks

### `useSubscribe` — Subscribe to unlock 3 rule slots

```tsx
import { useSubscribe } from 'payid-react'
import { useReadContract } from 'wagmi'
import { usePayIDContext } from 'payid-react'

function SubscribeButton() {
  const { contracts } = usePayIDContext()
  const { subscribe, isPending, isSuccess } = useSubscribe()

  // Fetch current subscription price from oracle
  const { data: price } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721ABI,
    functionName: 'subscriptionPriceETH',
  })

  return (
    <button onClick={() => price && subscribe(price as bigint)} disabled={isPending}>
      {isPending ? 'Subscribing...' : isSuccess ? '✅ Subscribed' : 'Subscribe'}
    </button>
  )
}
```

### `useCreateRule` + `useActivateRule` — Mint a Rule NFT

```tsx
import { useCreateRule, useActivateRule, useRuleCount } from 'payid-react'
import { keccak256, toBytes } from 'viem'

function CreateRuleFlow() {
  const { createRule, isPending: isCreating, isSuccess: created } = useCreateRule()
  const { activateRule, isPending: isActivating } = useActivateRule()
  const { data: ruleCount } = useRuleCount()

  const ruleJson = JSON.stringify({
    id:      'usdc_only',
    if:      { field: 'tx.asset', op: 'in', value: ['USDC', 'USDT'] },
    message: 'Only stablecoins accepted',
  })

  const handleCreate = () => {
    createRule({
      ruleHash: keccak256(toBytes(ruleJson)),
      uri:      'ipfs://Qm...',   // upload to IPFS first
    })
  }

  const handleActivate = () => {
    if (ruleCount !== undefined) {
      activateRule(ruleCount as bigint)  // activates the latest rule
    }
  }

  return (
    <div>
      <button onClick={handleCreate}  disabled={isCreating}>  Create Rule  </button>
      <button onClick={handleActivate} disabled={isActivating}>Activate NFT</button>
    </div>
  )
}
```

### `useExtendRuleExpiry` — Renew before expiry

```tsx
import { useExtendRuleExpiry } from 'payid-react'

function RenewRule({ tokenId }: { tokenId: bigint }) {
  const { extendRuleExpiry, isPending } = useExtendRuleExpiry()

  const handleRenew = () => {
    extendRuleExpiry({
      tokenId,
      newExpiry:  BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),  // +30 days
      priceInWei: 100_000_000_000_000n,  // 0.0001 ETH fallback; use oracle price in production
    })
  }

  return (
    <button onClick={handleRenew} disabled={isPending}>
      {isPending ? 'Renewing...' : 'Renew 30 days'}
    </button>
  )
}
```

### `useRegisterCombinedRule` — Activate payment policy

```tsx
import { useRegisterCombinedRule } from 'payid-react'
import { keccak256, toBytes } from 'viem'

function RegisterPolicy({ tokenIds, ruleNFTAddress }: {
  tokenIds: bigint[]
  ruleNFTAddress: `0x${string}`
}) {
  const { registerCombinedRule, isPending } = useRegisterCombinedRule()

  const handleRegister = () => {
    const ruleSetHash = keccak256(toBytes('my-policy-v1'))  // deterministic hash of your rules

    registerCombinedRule({
      ruleSetHash,
      ruleNFTs:  Array(tokenIds.length).fill(ruleNFTAddress),
      tokenIds,
      version:   1n,
    })
  }

  return (
    <button onClick={handleRegister} disabled={isPending}>
      {isPending ? 'Registering...' : 'Activate Policy'}
    </button>
  )
}
```

---

## Read Hooks

### `useSubscription` — Check subscription status

```tsx
import { useSubscription } from 'payid-react'
import { useAccount } from 'wagmi'

function SubscriptionStatus() {
  const { address } = useAccount()
  const { data: sub } = useSubscription(address)

  if (!sub) return null

  return (
    <div>
      <p>Status: {sub.isActive ? '✅ Active' : '❌ Expired'}</p>
      <p>Slots: {sub.logicalRuleCount} / {sub.maxSlots}</p>
      <p>Expires: {new Date(Number(sub.expiry) * 1000).toLocaleDateString()}</p>
    </div>
  )
}
```

### `useSubscriptionPrice` — Get dynamic subscription price

Fetches the current subscription price from the Chainlink oracle. Use this instead of hardcoding prices.

```tsx
import { useSubscriptionPrice, useSubscribe } from 'payid-react'
import { parseEther } from 'viem'

function SubscribeButton() {
  const { data: subPrice } = useSubscriptionPrice()
  const { subscribe, isPending } = useSubscribe()

  // Use dynamic price with fallback
  const price = subPrice ? (subPrice as bigint) : parseEther('0.001')

  return (
    <button onClick={() => subscribe(price)} disabled={isPending}>
      {isPending ? 'Subscribing...' : `Subscribe (~${Number(price) / 1e18} ETH)`}
    </button>
  )
}
```

**Pricing logic:**

- The contract uses Chainlink ETH/USD oracle for dynamic pricing
- Formula: `(subscriptionUsdCents * 1e24) / (ethUsdPrice * 100)`
- Falls back to `0.0001 ether` if oracle is stale or unavailable
- Price is calculated on-chain, ensuring consistency across all clients

---

### `useMyRules` — Your Rule NFTs

```tsx
import { useMyRules } from 'payid-react'

function MyRules() {
  const { data: rules = [], isLoading } = useMyRules()

  if (isLoading) return <p>Loading...</p>

  return (
    <ul>
      {rules.map(rule => (
        <li key={rule.ruleId.toString()}>
          Rule #{rule.ruleId.toString()} —{' '}
          {rule.active ? `✅ Active (tokenId: ${rule.tokenId})` : '⏳ Not activated'}
        </li>
      ))}
    </ul>
  )
}
```

### `useActiveCombinedRule` — Merchant's active policy

```tsx
import { useActiveCombinedRule } from 'payid-react'

function MerchantPolicy({ merchantAddress }: { merchantAddress: `0x${string}` }) {
  const { data: policy } = useActiveCombinedRule(merchantAddress)

  if (!policy) return <p>No active policy — all payments allowed</p>

  return (
    <div>
      <p>Policy hash: {policy.hash.slice(0, 10)}...</p>
      <p>Version: {policy.version.toString()}</p>
      <p>Rules: {policy.ruleRefs.length}</p>
    </div>
  )
}
```

### `useRuleExpiry` — Check when a rule expires

```tsx
import { useRuleExpiry } from 'payid-react'

function RuleExpiryBadge({ tokenId }: { tokenId: bigint }) {
  const { data: expiry } = useRuleExpiry(tokenId)

  if (!expiry) return null

  const expiryDate = new Date(Number(expiry) * 1000)
  const daysLeft   = Math.floor((expiryDate.getTime() - Date.now()) / 86_400_000)

  return (
    <span style={{ color: daysLeft < 7 ? 'orange' : 'green' }}>
      Expires {expiryDate.toLocaleDateString()} ({daysLeft}d left)
    </span>
  )
}
```

### `usePayIDContext` — Access resolved addresses

```tsx
import { usePayIDContext } from 'payid-react'

function ContractInfo() {
  const { contracts, chainId, ipfsGateway } = usePayIDContext()

  return (
    <pre>{JSON.stringify({ chainId, ...contracts }, null, 2)}</pre>
  )
}
```

---

## Additional Write Hooks

### `useCreateRuleVersion` — Create a new version of an existing rule

```tsx
import { useCreateRuleVersion } from 'payid-react'
import { keccak256, toBytes } from 'viem'

function UpdateRule({ parentRuleId }: { parentRuleId: bigint }) {
  const { createRuleVersion, isPending, isSuccess } = useCreateRuleVersion()

  const updatedRule = { id: 'usdc_only_v2', if: { field: 'tx.asset', op: '==', value: USDC_ADDRESS } }

  return (
    <button
      onClick={() => createRuleVersion({
        parentRuleId,
        newHash: keccak256(toBytes(JSON.stringify(updatedRule))),
        newUri:  'ipfs://NEW_CID',
      })}
      disabled={isPending}
    >
      {isSuccess ? '✅ Updated' : isPending ? 'Updating...' : 'Update Rule'}
    </button>
  )
}
```

### `useDeactivateCombinedRule` — Remove your active payment policy

```tsx
import { useDeactivateCombinedRule } from 'payid-react'

function DeactivateButton() {
  const { deactivate, isPending, isSuccess } = useDeactivateCombinedRule()

  return (
    <button onClick={() => deactivate()} disabled={isPending}>
      {isSuccess ? '✅ Deactivated' : isPending ? 'Deactivating...' : 'Deactivate Policy'}
    </button>
  )
}
```

:::warning
Deactivating removes your active payment policy. All payments to you will pass without rule checking until you register a new combined rule.
:::

---

## Read Hooks (Detailed)

### `useRules` — All rules with filters

```tsx
import { useRules } from 'payid-react'
import { useAccount } from 'wagmi'

function AllRules() {
  const { address } = useAccount()
  const { data: myRules, isLoading } = useRules({
    onlyActive: true,   // filter to only active rules
    creator:    address, // filter to only rules created by this address
  })

  if (isLoading) return <p>Loading...</p>

  return (
    <ul>
      {myRules.map(rule => (
        <li key={rule.ruleId.toString()}>
          Rule #{rule.ruleId.toString()} — hash: {rule.ruleHash.slice(0, 10)}...
          {' | '}tokenId: {rule.tokenId.toString()}
          {' | '}expires: {new Date(Number(rule.expiry) * 1000).toLocaleDateString()}
        </li>
      ))}
    </ul>
  )
}
```

### `useAllCombinedRules` — All policies on chain

```tsx
import { useAllCombinedRules } from 'payid-react'

function AllPolicies() {
  const { data: policies, isLoading, refetch } = useAllCombinedRules({ onlyActive: true })

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {policies.map(p => (
        <div key={p.hash}>
          <strong>{p.owner.slice(0, 8)}...</strong>
          {' — '}v{p.version.toString()} — {p.ruleRefs.length} rule(s)
        </div>
      ))}
    </div>
  )
}
```

### `useVerifyDecision` — Check a proof on-chain

```tsx
import { useVerifyDecision, useNonceUsed } from 'payid-react'

function ProofStatus({ decision, signature, payer, nonce }: {
  decision: Decision
  signature: `0x${string}`
  payer: `0x${string}`
  nonce: `0x${string}`
}) {
  const { data: isValid }  = useVerifyDecision(decision, signature)
  const { data: nonceUsed } = useNonceUsed(payer, nonce)

  return (
    <div>
      <p>Proof valid: {isValid ? '✅' : '❌'}</p>
      <p>Nonce used: {nonceUsed ? '⚠️ Already used' : '✅ Fresh'}</p>
    </div>
  )
}
```

---

## TypeScript Types Reference

All types are exported from `payid-react`:

```ts
import type {
  PayIDContracts,
  PayIDContextValue,
  RuleDefinition,
  RuleSet,
  RuleRef,
  CombinedRule,
  SubscriptionInfo,
  PayIDFlowParams,
  PayIDFlowResult,
  PayIDFlowStatus,
  PayIDQRParams,
  PayIDQRResult,
  PayIDQRStatus,
} from 'payid-react'
import { RuleDirection } from 'payid-react'
```

### Key Types

```ts
// Contract addresses for one chain
interface PayIDContracts {
  ruleAuthority:       Address   // RuleAuthority contract
  ruleItemERC721:      Address   // Rule NFT contract
  combinedRuleStorage: Address   // CombinedRuleStorage contract
  payIDVerifier:       Address   // PayIDVerifier contract
  payWithPayID:        Address   // PayWithPayID contract
}

// Rule NFT data
interface RuleDefinition {
  ruleId:     bigint
  ruleHash:   Hash
  uri:        string    // ipfs://CID
  creator:    Address
  rootRuleId: bigint
  version:    number
  deprecated: boolean
  active:     boolean
  tokenId:    bigint    // 0 if not yet activated
  expiry:     bigint    // unix timestamp, 0 = no expiry
}

// Active payment policy on-chain
interface CombinedRule {
  hash:      Hash
  owner:     Address
  version:   bigint
  active:    boolean
  ruleRefs:  RuleRef[]     // array of { ruleNFT, tokenId }
  direction?: RuleDirection
}

// Subscription status
interface SubscriptionInfo {
  expiry:           bigint
  isActive:         boolean
  logicalRuleCount: number  // current active rule count
  maxSlots:         number  // 1 without sub, 3 with sub
}

// usePayIDFlow params
interface PayIDFlowParams {
  receiver:              Address
  asset:                 Address   // token address, zeroAddress for ETH
  amount:                bigint
  payId:                 string
  context?:              Record<string, unknown>  // extra context fields
  attestationUIDs?:      Hash[]
  ruleAuthorityAddress?: Address
}

// RuleDirection for directional rules
enum RuleDirection {
  INBOUND  = 0,  // payments coming IN to the owner
  OUTBOUND = 1,  // payments going OUT from the owner
}
```

---

## Tips

**No `ready()` needed in React.** WASM loads lazily inside `usePayIDFlow` and `usePayIDQR` — no manual initialization needed.

**Never cache a proof.** `usePayIDFlow` generates a fresh proof every time. Proofs expire after ~5 minutes (300 seconds by default).

**Check subscription before creating rules.** Use `useSubscription(address)` to verify the merchant has active slots before calling `useCreateRule`.

**Preview receiver's policy before paying.** Use `useActiveCombinedRule(receiver)` to show the merchant's rules to the payer before they click pay.

**Works with all wagmi connectors.** MetaMask, WalletConnect, Coinbase Wallet, Safe, and any other connector work automatically.

**ETH vs ERC20.** Pass `zeroAddress` (from viem) as `asset` for native ETH payments. Pass the token contract address for ERC20.
