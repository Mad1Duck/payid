---
id: react-integration
title: React Integration
sidebar_label: React Integration
---

# React Integration

PAY.ID provides a dedicated React package — `payid-react` — built on top of [wagmi](https://wagmi.sh). It handles all contract interactions, wallet connections, and multi-step payment state for you.

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

## Hooks Overview

| Hook | Side | Purpose |
|---|---|---|
| `usePayIDFlow` | Payer | Full payment flow — fetch rules, evaluate, prove, submit |
| `usePayIDQR` | Merchant | Generate signed QR code for customers to scan |
| `usePayETH` | Payer | Low-level: pay with ETH |
| `usePayERC20` | Payer | Low-level: pay with ERC20 |
| `useSubscribe` | Merchant | Subscribe to unlock rule slots |
| `useCreateRule` | Merchant | Create a new Rule NFT |
| `useActivateRule` | Merchant | Activate (mint) a Rule NFT |
| `useExtendRuleExpiry` | Merchant | Extend Rule NFT expiry |
| `useRegisterCombinedRule` | Merchant | Register combined rule policy |
| `useDeactivateCombinedRule` | Merchant | Deactivate active rule policy |
| `useSubscription` | Read | Check subscription status |
| `useMyRules` | Read | Fetch your Rule NFTs |
| `useRule` | Read | Fetch a single rule by ID |
| `useRules` | Read | Fetch all rules with filters |
| `useActiveCombinedRule` | Read | Get active policy for any address |
| `useActiveCombinedRuleByDirection` | Read | Get policy for INBOUND or OUTBOUND |
| `useAllCombinedRules` | Read | List all registered policies |
| `useMyRuleSets` | Read | Your registered rule sets |
| `useVerifyDecision` | Read | Verify a Decision Proof on-chain |
| `useNonceUsed` | Read | Check if a nonce was already used |

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

### ETH Payment

Pass `zeroAddress` as the asset for native ETH:

```tsx
execute({
  receiver: merchantAddress,
  asset:    zeroAddress,                 // address(0) = ETH
  amount:   parseUnits('0.01', 18),      // 0.01 ETH
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

## Tips

**Call `ready()` only in Node.js / tests.** In React, `usePayIDFlow` and `usePayIDQR` handle WASM initialization lazily — no manual `ready()` needed.

**Never cache a proof.** `usePayIDFlow` generates a fresh proof every time. Proofs expire after `ttlSeconds` (default 300 seconds).

**Check subscription before creating rules.** Use `useSubscription(address)` to verify the user has active slots before calling `useCreateRule`.

**Preview the receiver's policy.** Use `useActiveCombinedRule(receiver)` before payment to show what rules will be checked.

**Works with all wallet types.** `usePayIDFlow` and `usePayIDQR` use wagmi's `useConnectorClient` internally — compatible with MetaMask, WalletConnect, Coinbase Wallet, Safe, and any other wagmi connector.
