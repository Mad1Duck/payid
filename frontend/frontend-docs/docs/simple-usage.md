---
id: simple-usage
title: Simple Usage
sidebar_label: Simple Usage
sidebar_position: 3
slug: /simple-usage
---

# Simple Usage 🚀

Quick examples to get you going! No complicated stuff — just copy-paste and you're good to go.

For a full step-by-step walkthrough, check out [Quick Start →](./quickstart).

---

## 1️⃣ Make a Payment (React)

The easiest way to pay — just one hook and you're done!

```tsx
import { usePayIDFlow } from 'payid-react'
import { zeroAddress, parseUnits } from 'viem'

function PayButton({ receiver }: { receiver: `0x${string}` }) {
  const { execute, status, isPending, isSuccess, txHash } = usePayIDFlow()

  return (
    <button
      onClick={() => execute({
        receiver,
        asset: zeroAddress,  // Native token (ETH, MATIC, A0GI, etc.)
        amount: parseUnits('0.01', 18),
        payId: 'pay.id/merchant',
      })}
      disabled={isPending}
    >
      {isPending ? 'Processing...' : isSuccess ? 'Paid!' : 'Pay 0.01 Native'}
    </button>
  )
}
```

**Status states:** `idle` → `fetching-rule` → `evaluating` → `proving` → `awaiting-wallet` → `confirming` → `success` | `denied` | `error`

---

## 2️⃣ Pay with ERC20 Token (USDC, USDT, etc.)

Same flow, just change the asset address — easy peasy!

```tsx
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

<button
  onClick={() => execute({
    receiver,
    asset: USDC_ADDRESS,
    amount: parseUnits('50', 6),  // 50 USDC (6 decimals)
    payId: 'pay.id/merchant',
  })}
>
  Pay 50 USDC
</button>
```

---

## 3️⃣ Add a Loading Spinner 🔄

Users love knowing something is happening! Add a spinner while processing:

```tsx
import { Loader2 } from 'lucide-react'

<button onClick={handlePay} disabled={isPending}>
  {isPending ? (
    <>
      <Loader2 className="animate-spin w-4 h-4" />
      Processing...
    </>
  ) : 'Pay'}
</button>
```

---

## 4️⃣ Show the Right Currency Symbol per Chain 💱

PAY.ID works across many chains, and each has its own native token. Show the right symbol automatically:

```tsx
import { useChains, useChainId } from 'wagmi'

function TokenDisplay() {
  const chainId = useChainId()
  const chains = useChains()
  const currentChain = chains.find(c => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'

  return <span>Balance: {balance} {nativeSymbol}</span>
}
```

Supported chains:
- Ethereum → ETH
- Polygon → MATIC
- 0G Newton Testnet (Real) → A0GI (Chain 16600)
- 0G Newton Testnet (Fork) → A0GI (Chain 16601)
- 0G Galileo Testnet → A0GI (Chain 16602) ⭐ **Recommended**
- Lisk Sepolia → LISK
- Monad Testnet → MON
- Base Sepolia → ETH
- Sepolia → ETH
- Moonbase Alpha → DEV

---

## 5️⃣ Check if a Merchant Has an Active Subscription

See if a merchant is set up to receive payments:

```tsx
import { useSubscription } from 'payid-react'

function MerchantStatus({ address }: { address: `0x${string}` }) {
  const { data: sub } = useSubscription(address)

  if (!sub) return <p>No subscription</p>

  return (
    <div>
      <p>Status: {sub.isActive ? '✅ Active' : '❌ Expired'}</p>
      <p>Slots: {sub.logicalRuleCount} / {sub.maxSlots}</p>
    </div>
  )
}
```

---

## 6️⃣ Generate a QR Code (Merchant Side) 📱

Let customers scan a QR code to pay you:

```tsx
import { usePayIDQR } from 'payid-react'
import { parseUnits } from 'viem'

function MerchantQR() {
  const { generate, payload, isPending } = usePayIDQR()

  return (
    <div>
      <button onClick={() => generate({
        payId: 'pay.id/my-shop',
        allowedAsset: USDC_ADDRESS,
        maxAmount: parseUnits('100', 6),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      })} disabled={isPending}>
        Generate QR
      </button>

      {payload && <QRCode value={payload} size={256} />}
    </div>
  )
}
```

---

## 7️⃣ Get a Merchant's Active Policy

Check what rules a merchant has set up:

```tsx
import { useActiveCombinedRule } from 'payid-react'

function MerchantPolicy({ address }: { address: `0x${string}` }) {
  const { data: policy } = useActiveCombinedRule(address)

  if (!policy) return <p>No active policy — all payments allowed</p>

  return (
    <div>
      <p>Policy hash: {policy.hash.slice(0, 10)}...</p>
      <p>Version: {policy.version}</p>
      <p>Rules: {policy.ruleRefs.length}</p>
    </div>
  )
}
```

---

## 8️⃣ Server-Side Payment (Node.js) 🖥️

For backend scripts, bots, or servers:

```ts
import { createPayIDServer } from 'payid/server'
import { ethers } from 'ethers'

const payid = createPayIDServer({
  signer: new ethers.Wallet(process.env.PRIVATE_KEY!),
})

const { result, proof } = await payid.evaluateAndProve({
  context: {
    tx: {
      sender: payerAddress,
      receiver: merchantAddress,
      asset: usdcAddress,
      amount: '50000000',
      chainId: 1,
    },
    env: { timestamp: Math.floor(Date.now() / 1000) },
  },
  authorityRule: { version: '1', logic: 'AND', rules: ruleConfigs },
  payId: 'pay.id/merchant',
  payer: payerAddress,
  receiver: merchantAddress,
  asset: usdcAddress,
  amount: 50_000_000n,
  verifyingContract: process.env.PAYID_VERIFIER!,
  ruleAuthority: process.env.COMBINED_RULE_STORAGE!,
  chainId: 1,
  blockTimestamp: Math.floor(Date.now() / 1000),
  ttlSeconds: 300,
})

if (result.decision === 'REJECT') {
  throw new Error(`Rejected: ${result.reason}`)
}

// Submit proof to contract
await payContract.payERC20(proof.payload, proof.signature, [])
```

---

## 9️⃣ Simple Rule Example 📝

A basic rule to set a minimum payment amount:

```tsx
const MY_RULE = {
  id: 'min_amount',
  if: { field: 'tx.amount', op: '>=', value: '10000000' },  // >= 10 USDC
  message: 'Minimum payment is 10 USDC',
}
```

---

## 🔟 Handle Payment Errors Gracefully

Don't leave users hanging when things go wrong:

```tsx
const { execute, status, error, denyReason } = usePayIDFlow()

const handlePay = async () => {
  try {
    await execute({ receiver, asset, amount, payId })
  } catch (e) {
    console.error('Payment failed:', e)
  }
}

return (
  <div>
    <button onClick={handlePay}>Pay</button>

    {status === 'denied' && <p>Denied: {denyReason}</p>}
    {error && <p style={{ color: 'red' }}>{error}</p>}
  </div>
)
```

---

## Quick Reference 📋

| What you want | How to do it |
|---|---|
| **Native token payment** | `asset: zeroAddress` |
| **ERC20 payment** | `asset: '0x...'` |
| **Show loading spinner** | `{isPending && <Loader2 className="animate-spin" />}` |
| **Get native symbol** | `useChains().find(c => c.id === chainId)?.nativeCurrency.symbol` |
| **Check subscription** | `useSubscription(address)` |
| **Get active policy** | `useActiveCombinedRule(address)` |
| **Generate QR** | `usePayIDQR().generate(...)` |
| **Server signing** | `createPayIDServer({ signer })` |

---

## Next Steps 🎯

- **[Quick Start →](./quickstart)** — Full step-by-step setup guide
- **[React Integration →](./integration/react-integration)** — All 20+ React hooks
- **[Advanced Usage →](./advanced-usage)** — Complex rules, attestation, ERC-4337
- **[SDK Reference →](./api/sdk-reference)** — Complete API documentation

---

That's it! You're now ready to use PAY.ID in your app. 🎉
