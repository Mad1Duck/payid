---
id: react-integration
title: React Integration
sidebar_label: React Integration
---

# React Integration

PAY.ID provides a dedicated React package — `payid-react` — with hooks and a provider that handle all the complex state management for you.

The full working example is in `example-product/src/pages/test/index.tsx`.

---

## Install

```bash
npm install payid-react wagmi viem @tanstack/react-query
# or
bun add payid-react wagmi viem @tanstack/react-query
```

---

## Setup: Wrap Your App with Providers

PAY.ID React works with wagmi. Wrap your app:

```tsx
// main.tsx
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import { PayIDProvider } from 'payid-react'
import { wagmiConfig, queryClient } from './config'

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PayIDProvider>
          <YourApp />
        </PayIDProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## The `usePayIDFlow` Hook — Simplest Way to Pay

`usePayIDFlow` handles the entire payment flow in one hook. It manages loading states, errors, and the multi-step process automatically.

```tsx
import { usePayIDFlow } from 'payid-react'

function PayButton({ receiver, amount }) {
  const { execute, status, isPending, error, decision, txHash } = usePayIDFlow()

  const handlePay = () => {
    execute({
      receiver: receiver,       // Receiver's wallet address
      asset: USDC_ADDRESS,     // Token address (or zero address for ETH)
      amount: BigInt(amount * 1_000_000), // Amount in token units
      payId: 'pay.id/merchant', // Optional PAY.ID identifier
    })
  }

  return (
    <div>
      <button onClick={handlePay} disabled={isPending}>
        {status === 'idle' && 'Pay Now'}
        {status === 'fetching-rule' && 'Loading rules...'}
        {status === 'evaluating' && 'Checking rules...'}
        {status === 'proving' && 'Generating proof...'}
        {status === 'approving' && 'Approving token...'}
        {status === 'awaiting-wallet' && 'Confirm in wallet...'}
        {status === 'confirming' && 'Confirming...'}
        {status === 'success' && '✅ Payment sent!'}
        {status === 'denied' && '❌ Payment denied'}
        {status === 'error' && 'Retry'}
      </button>

      {status === 'denied' && <p>Reason: {denyReason}</p>}
      {status === 'success' && <a href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`}>View TX →</a>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

### Flow Status Values

| Status | What's Happening |
|---|---|
| `idle` | Waiting to start |
| `fetching-rule` | Loading merchant's rules from chain + IPFS |
| `evaluating` | Running rules through WASM engine |
| `proving` | Generating EIP-712 proof (wallet signature requested) |
| `approving` | Waiting for ERC20 approve TX (auto-triggered if needed) |
| `awaiting-wallet` | Waiting for user to confirm payment in wallet |
| `confirming` | Transaction submitted, waiting for blockchain confirmation |
| `success` | Payment confirmed on-chain ✅ |
| `denied` | Rules rejected the payment ❌ |
| `error` | Something went wrong 🔴 |

---

## Other Useful Hooks

### `useSubscription(address?)` — Check Subscription Status

```tsx
import { useSubscription } from 'payid-react'

function SubscriptionStatus() {
  const { address } = useAccount()
  const { data: sub } = useSubscription(address)

  return (
    <div>
      <p>Status: {sub?.isActive ? 'Active ✅' : 'Inactive ❌'}</p>
      <p>Slots used: {sub?.logicalRuleCount} / {sub?.maxSlots}</p>
      <p>Expires: {sub?.expiry ? new Date(Number(sub.expiry) * 1000).toLocaleDateString() : 'N/A'}</p>
    </div>
  )
}
```

### `useMyRules()` — Fetch Your Rule NFTs

```tsx
import { useMyRules } from 'payid-react'

function MyRules() {
  const { data: rules = [], isLoading } = useMyRules()

  if (isLoading) return <div>Loading...</div>

  return (
    <ul>
      {rules.map(rule => (
        <li key={rule.ruleId.toString()}>
          Rule #{rule.ruleId.toString()} — 
          {rule.active ? '✅ Active' : '⏳ Not activated'}
        </li>
      ))}
    </ul>
  )
}
```

### `useActiveCombinedRule(address?)` — Read Merchant's Active Policy

```tsx
import { useActiveCombinedRule } from 'payid-react'

function MerchantPolicy({ merchantAddress }) {
  const { data: policy } = useActiveCombinedRule(merchantAddress)

  if (!policy) return <p>No active policy — all payments allowed</p>

  return (
    <div>
      <p>Policy version: {policy.version.toString()}</p>
      <p>Number of rules: {policy.ruleRefs.length}</p>
    </div>
  )
}
```

### `useRules({ creator })` — Filter Rules by Creator

```tsx
import { useRules } from 'payid-react'

function CreatorRules({ creator }) {
  const { data: rules = [] } = useRules({ creator })
  // Returns only rules created by this address
}
```

### `useAllCombinedRules()` — List All Registered Policies

```tsx
import { useAllCombinedRules } from 'payid-react'

function AllPolicies() {
  const { data: allRules = [] } = useAllCombinedRules()
  // Returns all CombinedRule objects on-chain
}
```

### `usePayIDContext()` — Access Contract Addresses

```tsx
import { usePayIDContext } from 'payid-react'

function MyComponent() {
  const { contracts } = usePayIDContext()
  // contracts.ruleItemERC721
  // contracts.combinedRuleStorage
  // contracts.payWithPayId
  // contracts.payIdVerifier
}
```

---

## Full Working Example

The complete implementation is in `example-product/src/pages/test/index.tsx`. It includes:

- **Rule NFTs tab** — view all rules, filter by mine/active, activate rules
- **Create Rule tab** — build and mint new Rule NFTs from the browser
- **Combine tab** — select rules and register a combined policy
- **Subscription tab** — subscribe, check status, extend subscription
- **Pay tab** — full payment flow using `usePayIDFlow`

### The Pay Tab (TransactTab)

Key parts of the Pay tab from `test/index.tsx`:

```tsx
function TransactTab({ myAddress }) {
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')

  const { execute, reset, status, isPending, error, decision, txHash } = usePayIDFlow()

  const handlePay = () => {
    execute({
      receiver: receiver as Address,
      asset: USDC_ADDRESS,
      amount: BigInt(Math.round(parseFloat(amount) * 1_000_000)),
      payId: `pay.id/${receiver.slice(2, 10).toLowerCase()}`,
    })
  }

  return (
    <div>
      <input placeholder="Receiver address 0x..." value={receiver} onChange={e => setReceiver(e.target.value)} />
      <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={handlePay} disabled={isPending || !receiver || !amount}>
        {status === 'idle' ? '→ Execute Payment' : status}
      </button>
    </div>
  )
}
```

### The Create Rule Tab

From `test/CreateRuleTab.tsx`, this lets you create Rule NFTs from the browser. It builds the rule JSON and calls:

```tsx
// From CreateRuleTab.tsx
const ruleHash = keccak256(toBytes(canonicalize(ruleObject)))

// 1. Subscribe (if not already)
await tx.send({ functionName: 'subscribe', value: subPrice })

// 2. Create rule on-chain
await tx.send({ functionName: 'createRule', args: [ruleHash, ipfsUri] })

// 3. Activate (mint NFT)
await tx.send({ functionName: 'activateRule', args: [ruleId] })
```

---

## Tips

**Initialize PayIDProvider once.** The `<PayIDProvider>` wraps your whole app and manages the SDK lifecycle.

**Never cache a proof.** `usePayIDFlow` generates a fresh proof every time. Never store and reuse proofs — they expire in 5 minutes.

**Check subscription before activating rules.** Use `useSubscription(address)` to verify the user's subscription status before letting them create rules.

**Preview the receiver's policy.** Use `useActiveCombinedRule(receiver)` before payment to show the user what rules will be checked.
