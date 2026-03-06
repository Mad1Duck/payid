---
id: tokochain-simulation
title: 'Case Study: TokoChain'
sidebar_label: 'Case Study: TokoChain'
---

# Case Study: TokoChain × PAY.ID

Simulasi integrasi nyata — **TokoChain** (aplikasi payment UKM) mengintegrasikan PAY.ID menggunakan `payid-react`.

**Situasi:** TokoChain memungkinkan merchant terima crypto, tapi tidak ada filter — semua transaksi lolos tanpa peduli jenis token, jumlah, atau waktu. Merchant tidak bisa enforce "USDC saja", minimum amount, atau jam operasional.

Setelah integrasi PAY.ID, setiap merchant punya **kebijakan payment** yang di-enforce on-chain, dikonfigurasi langsung dari browser tanpa backend untuk rules dasar.

---

## Flow Terintegrasi

```
MERCHANT (setup sekali di dashboard TokoChain):
  → Connect wallet → Subscribe ke PAY.ID
  → Pilih rules: "USDC saja, min Rp10k, 08:00–22:00"
  → UI TokoChain panggil useCreateRule + useActivateRule + useRegisterCombinedRule
  → Generate QR via usePayIDQR → tampilkan di layar kasir

PELANGGAN (setiap payment):
  → Scan QR atau masukkan PAY.ID merchant
  → usePayIDFlow evaluasi rules < 1 detik (tidak terlihat)
  → Popup wallet: "Konfirmasi pembayaran"
  → Transfer berhasil ✅
```

---

## Part 1: Dashboard Merchant

### Cek & Subscribe

```tsx
import { useSubscription, useSubscribe, usePayIDContext } from 'payid-react'
import { useAccount, useReadContract } from 'wagmi'

function SubscriptionPanel() {
  const { address }             = useAccount()
  const { contracts }           = usePayIDContext()
  const { data: sub }           = useSubscription(address)
  const { subscribe, isPending } = useSubscribe()

  const { data: price } = useReadContract({
    address: contracts.ruleItemERC721, abi: RuleItemERC721ABI, functionName: 'subscriptionPriceETH',
  })

  if (!sub) return null

  return sub.isActive ? (
    <div>
      <p>✅ Langganan aktif — {sub.logicalRuleCount}/{sub.maxSlots} slot terpakai</p>
      <p>Expired: {new Date(Number(sub.expiry) * 1000).toLocaleDateString('id-ID')}</p>
      {Number(sub.expiry) - Date.now() / 1000 < 7 * 86400 && (
        <p style={{ color: 'orange' }}>⚠️ Kurang dari 7 hari — segera perpanjang!</p>
      )}
    </div>
  ) : (
    <button onClick={() => price && subscribe(price as bigint)} disabled={isPending}>
      {isPending ? 'Berlangganan...' : 'Berlangganan (unlock 3 slot)'}
    </button>
  )
}
```

### Setup Rule Merchant

```tsx
import { useCreateRule, useActivateRule, useRegisterCombinedRule, usePayIDContext } from 'payid-react'
import { keccak256, toBytes } from 'viem'

const TOKO_RULES = [
  { id: 'usdc_only',    if: { field: 'tx.asset',   op: 'in',      value: ['USDC', 'USDT'] }, message: 'Hanya stablecoin' },
  { id: 'min_10k_idr',  if: { field: 'tx.amount',  op: '>=',      value: '650000'          }, message: 'Minimum Rp 10.000' },
  { id: 'jam_operasi',  if: { field: 'env.timestamp', op: 'between', value: [28800, 79200]  }, message: 'Hanya jam 08:00–22:00' },
]

function SetupRuleFlow() {
  const { contracts }                              = usePayIDContext()
  const { createRule, isPending: creating }         = useCreateRule()
  const { activateRule, isPending: activating }     = useActivateRule()
  const { registerCombinedRule, isPending: reg }    = useRegisterCombinedRule()

  const handleCreateAll = async () => {
    for (const rule of TOKO_RULES) {
      const uri      = await uploadToPinata(rule)         // upload ke IPFS dulu
      const ruleHash = keccak256(toBytes(JSON.stringify(rule)))
      createRule({ ruleHash, uri })
    }
  }

  const handleActivateAll = (startRuleId: bigint) => {
    for (let i = 0n; i < BigInt(TOKO_RULES.length); i++) {
      activateRule(startRuleId + i)
    }
  }

  const handleRegister = (tokenIds: bigint[]) => {
    const ruleSetHash = keccak256(toBytes(JSON.stringify({ version: '1', logic: 'AND', rules: TOKO_RULES })))
    registerCombinedRule({
      ruleSetHash,
      ruleNFTs: Array(tokenIds.length).fill(contracts.ruleItemERC721),
      tokenIds,
      version:  1n,
    })
  }

  return (
    <div>
      <button onClick={handleCreateAll}  disabled={creating}>  1. Buat Rules    </button>
      <button onClick={() => handleActivateAll(1n)} disabled={activating}>2. Aktifkan NFT  </button>
      <button onClick={() => handleRegister([1n, 2n, 3n])} disabled={reg}>3. Daftarkan Policy</button>
    </div>
  )
}
```

---

## Part 2: QR Kasir Merchant

```tsx
import { usePayIDQR } from 'payid-react'
import { parseUnits } from 'viem'
import QRCode from 'react-qr-code'

function CheckoutQR({ orderId, nominalRupiah }: { orderId: string; nominalRupiah: number }) {
  const { generate, reset, isReady, isPending, payload, qrDataUrl, error } = usePayIDQR()

  const amountUSDC = Math.round((nominalRupiah / 15000) * 1_000_000)

  return (
    <div className="checkout-qr">
      <h2>Order #{orderId}</h2>
      <p>Total: Rp {nominalRupiah.toLocaleString('id-ID')}</p>

      {!isReady && (
        <button
          onClick={() => generate({
            payId:        'pay.id/toko-budi',
            allowedAsset: USDC_ADDRESS,
            maxAmount:    BigInt(amountUSDC),
            expiresAt:    Math.floor(Date.now() / 1000) + 300,
          })}
          disabled={isPending}
        >
          {isPending ? 'Membuat QR...' : 'Generate QR Bayar'}
        </button>
      )}

      {qrDataUrl && <img src={qrDataUrl} alt="Scan untuk bayar" width={256} />}

      {payload && !qrDataUrl && (
        <div style={{ background: 'white', padding: 16, display: 'inline-block' }}>
          <QRCode value={payload} size={256} />
        </div>
      )}

      {isReady && <button onClick={reset}>QR Baru</button>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

---

## Part 3: Halaman Pembayaran Pelanggan

```tsx
import { usePayIDFlow } from 'payid-react'
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'
import { useSearchParams } from 'react-router-dom'

function HalamanBayar() {
  const [params]  = useSearchParams()
  const qrPayload = params.get('q')
  const { execute, reset, status, isPending, isSuccess, error, denyReason, txHash } = usePayIDFlow()

  const handleBayar = () => {
    if (!qrPayload) return
    const policy = decodeSessionPolicyV2QR(qrPayload)
    execute({
      receiver: policy.receiver    as `0x${string}`,
      asset:    policy.allowedAsset as `0x${string}`,
      amount:   BigInt(policy.maxAmount),
      payId:    policy.payId,
    })
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Konfirmasi Pembayaran</h1>

      <button onClick={handleBayar} disabled={isPending || !qrPayload} style={{ width: '100%', padding: '1rem' }}>
        {status === 'idle'            && 'Bayar Sekarang'}
        {status === 'fetching-rule'   && '🔍 Memeriksa kebijakan...'}
        {status === 'evaluating'      && '⚙️ Evaluasi aturan...'}
        {status === 'proving'         && '✍️ Tanda tangani di wallet...'}
        {status === 'approving'       && '🔓 Setujui USDC...'}
        {status === 'awaiting-wallet' && '📲 Konfirmasi di wallet...'}
        {status === 'confirming'      && '⏳ Menunggu konfirmasi...'}
        {status === 'success'         && '✅ Pembayaran berhasil!'}
        {status === 'denied'          && '❌ Pembayaran ditolak'}
        {status === 'error'           && '🔄 Coba lagi'}
      </button>

      {status === 'denied' && <p style={{ color: 'red' }}>Alasan: {denyReason}</p>}
      {isSuccess && <p style={{ color: 'green' }}>TX: {txHash?.slice(0, 12)}...</p>}
      {error     && <p style={{ color: 'red' }}>{error}</p>}

      {(isSuccess || status === 'error' || status === 'denied') && (
        <button onClick={reset}>Kembali</button>
      )}
    </div>
  )
}
```

---

## Part 4: Monitoring Subscription (Backend Cron)

```ts
// scripts/cek-merchant.ts
import { ethers } from 'ethers'

const ruleNFT = new ethers.Contract(process.env.RULE_ITEM_ERC721!, RuleItemABI, provider)

async function cekSemuaMerchant(merchants: string[]) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  for (const address of merchants) {
    const expiry   = await ruleNFT.subscriptionExpiry(address)
    const daysLeft = expiry >= now ? Number((expiry - now) / 86400n) : 0
    if (expiry < now)       await kirimNotif(address, '⚠️ Subscription expired! Semua payment gagal.')
    else if (daysLeft <= 7) await kirimNotif(address, `⏰ Subscription berakhir ${daysLeft} hari lagi!`)
  }
}
```

:::warning Jangan Sampai Expired
Kalau subscription merchant expired, semua payment ke merchant tersebut akan **revert** dengan `RULE_LICENSE_EXPIRED`. Kirim notifikasi minimal 7 hari sebelum expired.
:::

---

## Integration Checklist

```
SETUP AWAL (developer TokoChain):
  □ Deploy kontrak (packages/contracts)
  □ Konfigurasi <PayIDProvider contracts={...}> di app
  □ Pasang monitoring cron job

ONBOARDING MERCHANT:
  □ Connect wallet
  □ Subscribe (useSubscribe)
  □ Upload rules ke IPFS
  □ Buat + aktifkan Rule NFTs (useCreateRule + useActivateRule)
  □ Daftarkan kebijakan (useRegisterCombinedRule)
  □ Generate QR kasir (usePayIDQR)

SETIAP PEMBAYARAN (pelanggan):
  □ Scan QR / buka link
  □ usePayIDFlow menangani segalanya:
      → Load rules dari chain + IPFS
      → Evaluasi rules
      → Sign proof (popup wallet)
      → Approve USDC kalau perlu (popup wallet)
      → Submit TX (popup wallet)

PEMELIHARAAN:
  □ Monitor expiry subscription harian
  □ Notifikasi 7 hari sebelum expired
  □ Perpanjang via useExtendRuleExpiry
```
