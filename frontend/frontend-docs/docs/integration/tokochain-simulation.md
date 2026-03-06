---
id: tokochain-simulation
title: 'Case Study: TokoChain'
sidebar_label: 'Case Study: TokoChain'
---

# Case Study: TokoChain × PAY.ID

A real-world integration simulation — **TokoChain** (an SME payment app) integrating PAY.ID using `payid-react`.

**Situation:** TokoChain lets merchants accept crypto payments, but has no filtering — all transactions go through regardless of token type, amount, or timing. Merchants can't enforce "USDC only", minimum amounts, or business hours.

After integrating PAY.ID, each merchant has a **payment policy** enforced on-chain, configured entirely from the browser with no backend required for basic rules.

---

## Integrated Flow

```
MERCHANT (one-time setup in TokoChain dashboard):
  → Connect wallet → Subscribe to PAY.ID
  → Select rules: "USDC only, min Rp10k, 08:00–22:00"
  → TokoChain UI calls useCreateRule + useActivateRule + useRegisterCombinedRule
  → Generate QR via usePayIDQR → display on checkout screen

CUSTOMER (every payment):
  → Scan QR or enter merchant PAY.ID
  → usePayIDFlow evaluates rules in < 1 second (invisible)
  → Wallet popup: "Confirm payment"
  → Transfer success ✅
```

---

## Part 1: Merchant Dashboard

### Subscription Check & Subscribe Button

```tsx
// src/components/MerchantOnboarding.tsx
import {
  useSubscription,
  useSubscribe,
  usePayIDContext,
} from 'payid-react'
import { useAccount, useReadContract } from 'wagmi'

function SubscriptionPanel() {
  const { address }             = useAccount()
  const { contracts }           = usePayIDContext()
  const { data: sub }           = useSubscription(address)
  const { subscribe, isPending } = useSubscribe()

  // Fetch current ETH price from oracle
  const { data: price } = useReadContract({
    address:      contracts.ruleItemERC721,
    abi:          RuleItemERC721ABI,
    functionName: 'subscriptionPriceETH',
  })

  if (!sub) return null

  if (sub.isActive) {
    return (
      <div className="panel">
        <p>✅ Subscription active</p>
        <p>Rule slots: {sub.logicalRuleCount} / {sub.maxSlots}</p>
        <p>Expires: {new Date(Number(sub.expiry) * 1000).toLocaleDateString()}</p>
        {/* Warn when expiry is near */}
        {Number(sub.expiry) - Date.now() / 1000 < 7 * 86400 && (
          <p style={{ color: 'orange' }}>⚠️ Expires in less than 7 days — renew soon!</p>
        )}
      </div>
    )
  }

  return (
    <div className="panel">
      <p>❌ No active subscription (1 rule slot only)</p>
      <button
        onClick={() => price && subscribe(price as bigint)}
        disabled={isPending}
      >
        {isPending ? 'Subscribing...' : 'Subscribe (unlock 3 slots)'}
      </button>
    </div>
  )
}
```

### Merchant Rule Setup — Create + Activate + Register

```tsx
// src/components/MerchantRuleSetup.tsx
import { useState } from 'react'
import { keccak256, toBytes } from 'viem'
import {
  useCreateRule,
  useActivateRule,
  useRegisterCombinedRule,
  useRuleCount,
  usePayIDContext,
} from 'payid-react'

const TOKO_RULES = [
  {
    id:      'usdc_only',
    if:      { field: 'tx.asset', op: 'in', value: ['USDC', 'USDT'] },
    message: 'Only stablecoins accepted',
  },
  {
    id:      'min_10k_idr',
    // 650000 μUSDC ≈ Rp 10.000 at ~$1 = Rp 15.000, USDC 6 decimals
    if:      { field: 'tx.amount', op: '>=', value: '650000' },
    message: 'Minimum Rp 10.000',
  },
  {
    id:      'business_hours',
    if:      { field: 'env.timestamp', op: 'between', value: [28800, 79200] }, // 08:00–22:00 UTC+7 as seconds since midnight
    message: 'Payments only accepted during business hours (08:00–22:00)',
  },
]

function MerchantRuleSetup() {
  const { contracts }                              = usePayIDContext()
  const { data: ruleCount }                        = useRuleCount()
  const { createRule, isPending: creating }         = useCreateRule()
  const { activateRule, isPending: activating }     = useActivateRule()
  const { registerCombinedRule, isPending: registering } = useRegisterCombinedRule()

  const [ipfsUris, setIpfsUris] = useState<string[]>([])
  const [tokenIds, setTokenIds] = useState<bigint[]>([])
  const [step, setStep]         = useState<'create' | 'activate' | 'register' | 'done'>('create')

  // Step 1: Upload each rule to IPFS (your backend/Pinata), then createRule on-chain
  const handleCreateRules = async () => {
    for (const rule of TOKO_RULES) {
      const ruleJson = JSON.stringify(rule)
      const ipfsUri  = await uploadToPinata(rule)          // your IPFS upload function
      const ruleHash = keccak256(toBytes(ruleJson))

      createRule({ ruleHash, uri: ipfsUri })
    }
    setStep('activate')
  }

  // Step 2: Activate each rule (mint NFT)
  const handleActivateRules = () => {
    const firstNewId = (ruleCount as bigint) - BigInt(TOKO_RULES.length) + 1n
    for (let i = 0n; i < BigInt(TOKO_RULES.length); i++) {
      activateRule(firstNewId + i)
    }
    setStep('register')
  }

  // Step 3: Register all tokenIds as one combined policy
  const handleRegisterPolicy = () => {
    const combinedJson = JSON.stringify({
      version: '1',
      logic:   'AND',
      rules:   TOKO_RULES,
    })
    const ruleSetHash = keccak256(toBytes(combinedJson))

    registerCombinedRule({
      ruleSetHash,
      ruleNFTs: Array(tokenIds.length).fill(contracts.ruleItemERC721),
      tokenIds,
      version:  1n,
    })
    setStep('done')
  }

  return (
    <div>
      {step === 'create'    && <button onClick={handleCreateRules}   disabled={creating}>   1. Create Rules  </button>}
      {step === 'activate'  && <button onClick={handleActivateRules} disabled={activating}> 2. Activate NFTs </button>}
      {step === 'register'  && <button onClick={handleRegisterPolicy} disabled={registering}>3. Register Policy</button>}
      {step === 'done'      && <p>✅ Policy active — customers can now pay!</p>}
    </div>
  )
}
```

---

## Part 2: Merchant Checkout QR

Merchants generate a QR code on their checkout screen. Customers scan it and pay directly — no login, no backend, no session cookies.

```tsx
// src/components/CheckoutQR.tsx
import { usePayIDQR } from 'payid-react'
import { parseUnits } from 'viem'
import QRCode from 'react-qr-code'   // npm install react-qr-code

const USDC_ADDRESS = '0x...'   // your deployed USDC

function CheckoutQR({ orderId, amountRupiah }: { orderId: string; amountRupiah: number }) {
  const { generate, reset, isReady, isPending, payload, qrDataUrl, error } = usePayIDQR()

  // Convert Rp to USDC (approximate, use real oracle in production)
  const amountUSDC = Math.round((amountRupiah / 15000) * 1_000_000)  // 6 decimals

  const handleGenerate = () => {
    generate({
      payId:        'pay.id/toko-budi',
      allowedAsset: USDC_ADDRESS,
      maxAmount:    BigInt(amountUSDC),
      expiresAt:    Math.floor(Date.now() / 1000) + 300,  // 5 minutes per order
    })
  }

  return (
    <div className="checkout-qr">
      <h2>Bayar Order #{orderId}</h2>
      <p>Total: Rp {amountRupiah.toLocaleString('id-ID')}</p>

      {!isReady && (
        <button onClick={handleGenerate} disabled={isPending}>
          {isPending ? 'Membuat QR...' : 'Generate QR Pembayaran'}
        </button>
      )}

      {/* Use PNG data URL if qrcode package is installed */}
      {qrDataUrl && (
        <img src={qrDataUrl} alt="Scan untuk bayar" width={256} />
      )}

      {/* Fallback: use react-qr-code with payload string */}
      {payload && !qrDataUrl && (
        <div style={{ background: 'white', padding: 16, display: 'inline-block' }}>
          <QRCode value={payload} size={256} />
        </div>
      )}

      {isReady && <button onClick={reset}>Buat QR Baru</button>}
      {error    && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

---

## Part 3: Customer Payment Page

The customer scans the QR and lands on the payment page. `usePayIDFlow` handles everything.

```tsx
// src/pages/PayPage.tsx
import { usePayIDFlow } from 'payid-react'
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'
import { useSearchParams } from 'react-router-dom'
import { zeroAddress } from 'viem'

function PayPage() {
  const [params]  = useSearchParams()
  const qrPayload = params.get('q')  // QR payload from deep link or scan

  const {
    execute, reset, status,
    isPending, isSuccess,
    error, denyReason, txHash,
  } = usePayIDFlow()

  const handlePay = () => {
    if (!qrPayload) return

    // Decode the scanned QR string back to SessionPolicyV2
    const policy = decodeSessionPolicyV2QR(qrPayload)

    execute({
      receiver: policy.receiver   as `0x${string}`,
      asset:    policy.allowedAsset as `0x${string}`,
      amount:   BigInt(policy.maxAmount),
      payId:    policy.payId,
    })
  }

  return (
    <div className="pay-page">
      <h1>Konfirmasi Pembayaran</h1>

      <button
        onClick={handlePay}
        disabled={isPending || !qrPayload}
        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
      >
        {status === 'idle'            && 'Bayar Sekarang'}
        {status === 'fetching-rule'   && '🔍 Memeriksa kebijakan merchant...'}
        {status === 'evaluating'      && '⚙️  Evaluasi aturan...'}
        {status === 'proving'         && '✍️  Tanda tangani di wallet...'}
        {status === 'approving'       && '🔓 Setujui USDC...'}
        {status === 'awaiting-wallet' && '📲 Konfirmasi di wallet...'}
        {status === 'confirming'      && '⏳ Menunggu konfirmasi blockchain...'}
        {status === 'success'         && '✅ Pembayaran berhasil!'}
        {status === 'denied'          && '❌ Pembayaran ditolak'}
        {status === 'error'           && '🔄 Coba lagi'}
      </button>

      {status === 'denied' && (
        <div style={{ color: 'red', marginTop: 8 }}>
          <p>Alasan penolakan: {denyReason}</p>
        </div>
      )}

      {isSuccess && (
        <div style={{ color: 'green', marginTop: 8 }}>
          <p>Transaksi: <a href={`https://explorer.example.com/tx/${txHash}`} target="_blank">{txHash?.slice(0,12)}...</a></p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {(isSuccess || status === 'error' || status === 'denied') && (
        <button onClick={reset} style={{ marginTop: 8 }}>Kembali</button>
      )}
    </div>
  )
}
```

---

## Part 4: Subscription Monitoring (Backend Cron)

If you want to send renewal reminders, check subscription expiry server-side using `ethers`:

```ts
// scripts/check-subscriptions.ts
import { ethers } from 'ethers'
import RuleItemERC721ABI from './abis/RuleItemERC721.json'

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const ruleNFT  = new ethers.Contract(process.env.RULE_ITEM_ERC721!, RuleItemERC721ABI, provider)

async function checkMerchants(merchants: string[]) {
  const now = BigInt(Math.floor(Date.now() / 1000))

  for (const address of merchants) {
    const expiry   = await ruleNFT.subscriptionExpiry(address)
    const daysLeft = expiry >= now ? Number((expiry - now) / 86400n) : 0
    const isActive = expiry >= now

    if (!isActive) {
      await notify(address, '⚠️ Subscription PAY.ID kamu sudah expired! Semua pembayaran akan gagal.')
    } else if (daysLeft <= 7) {
      await notify(address, `⏰ Subscription PAY.ID berakhir dalam ${daysLeft} hari. Perpanjang sekarang!`)
    }
  }
}
```

:::warning Jangan Sampai Expired
Jika subscription merchant expired, semua pembayaran ke merchant tersebut akan **revert** dengan `RULE_LICENSE_EXPIRED`. Kirim notifikasi setidaknya 7 hari sebelum expiry.
:::

---

## Integration Checklist

```
INITIAL SETUP (TokoChain developer):
  □ Deploy contracts (packages/contracts)
  □ Configure <PayIDProvider contracts={...}> di app
  □ Pasang monitoring cron job

MERCHANT ONBOARDING:
  □ Connect wallet
  □ Subscribe (useSubscribe)
  □ Upload rules ke IPFS
  □ Create + activate Rule NFTs (useCreateRule + useActivateRule)
  □ Register policy (useRegisterCombinedRule)
  □ Generate QR checkout (usePayIDQR)

SETIAP PEMBAYARAN (customer):
  □ Scan QR / buka link
  □ usePayIDFlow handles everything:
      → Load rules dari chain + IPFS
      → Evaluate rules
      → Sign proof (wallet popup)
      → Approve USDC jika perlu (wallet popup)
      → Submit TX (wallet popup)

PEMELIHARAAN:
  □ Monitor subscription expiry harian
  □ Kirim notifikasi 7 hari sebelum expiry
  □ Perpanjang via useExtendRuleExpiry
```
