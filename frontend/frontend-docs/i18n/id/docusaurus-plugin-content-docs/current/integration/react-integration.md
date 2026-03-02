---
id: react-integration
title: Integrasi React
sidebar_label: Integrasi React
---

# Integrasi React

PAY.ID menyediakan paket React khusus — `payid-react` — dengan hooks dan provider yang menangani semua state management yang kompleks untukmu.

Contoh lengkap yang berjalan ada di `example-product/src/pages/test/index.tsx`.

---

## Install

```bash
npm install payid-react wagmi viem @tanstack/react-query
# atau
bun add payid-react wagmi viem @tanstack/react-query
```

---

## Setup: Bungkus App-mu dengan Providers

PAY.ID React bekerja dengan wagmi. Bungkus app-mu:

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
          <AppKamu />
        </PayIDProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## Hook `usePayIDFlow` — Cara Termudah untuk Bayar

`usePayIDFlow` menangani seluruh flow pembayaran dalam satu hook. Ia mengelola loading state, error, dan proses multi-langkah secara otomatis.

```tsx
import { usePayIDFlow } from 'payid-react'

function TombolBayar({ receiver, amount }) {
  const { execute, status, isPending, error, decision, txHash } = usePayIDFlow()

  const handleBayar = () => {
    execute({
      receiver: receiver,           // Alamat wallet receiver
      asset: USDC_ADDRESS,         // Alamat token (atau zero address untuk ETH)
      amount: BigInt(amount * 1_000_000), // Jumlah dalam unit token
      payId: 'pay.id/merchant',    // PAY.ID identifier (opsional)
    })
  }

  return (
    <div>
      <button onClick={handleBayar} disabled={isPending}>
        {status === 'idle' && 'Bayar Sekarang'}
        {status === 'fetching-rule' && 'Memuat rules...'}
        {status === 'evaluating' && 'Memeriksa rules...'}
        {status === 'proving' && 'Membuat proof...'}
        {status === 'approving' && 'Approve token...'}
        {status === 'awaiting-wallet' && 'Konfirmasi di wallet...'}
        {status === 'confirming' && 'Mengkonfirmasi...'}
        {status === 'success' && '✅ Pembayaran terkirim!'}
        {status === 'denied' && '❌ Pembayaran ditolak'}
        {status === 'error' && 'Coba lagi'}
      </button>

      {status === 'denied' && <p>Alasan: {denyReason}</p>}
      {status === 'success' && <a href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`}>Lihat TX →</a>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

### Nilai Status Flow

| Status | Yang Sedang Terjadi |
|---|---|
| `idle` | Menunggu untuk dimulai |
| `fetching-rule` | Memuat rules merchant dari chain + IPFS |
| `evaluating` | Menjalankan rules melalui WASM engine |
| `proving` | Membuat proof EIP-712 (meminta tanda tangan wallet) |
| `approving` | Menunggu TX approve ERC20 (otomatis dipicu jika diperlukan) |
| `awaiting-wallet` | Menunggu pengguna konfirmasi pembayaran di wallet |
| `confirming` | Transaksi dikirim, menunggu konfirmasi blockchain |
| `success` | Pembayaran dikonfirmasi on-chain ✅ |
| `denied` | Rules menolak pembayaran ❌ |
| `error` | Ada yang salah 🔴 |

---

## Hooks Berguna Lainnya

### `useSubscription(address?)` — Cek Status Subscription

```tsx
import { useSubscription } from 'payid-react'

function StatusSubscription() {
  const { address } = useAccount()
  const { data: sub } = useSubscription(address)

  return (
    <div>
      <p>Status: {sub?.isActive ? 'Aktif ✅' : 'Tidak Aktif ❌'}</p>
      <p>Slot terpakai: {sub?.logicalRuleCount} / {sub?.maxSlots}</p>
      <p>Expired: {sub?.expiry ? new Date(Number(sub.expiry) * 1000).toLocaleDateString() : 'N/A'}</p>
    </div>
  )
}
```

### `useMyRules()` — Ambil Rule NFT Milikmu

```tsx
import { useMyRules } from 'payid-react'

function Rules saya() {
  const { data: rules = [], isLoading } = useMyRules()

  if (isLoading) return <div>Memuat...</div>

  return (
    <ul>
      {rules.map(rule => (
        <li key={rule.ruleId.toString()}>
          Rule #{rule.ruleId.toString()} — 
          {rule.active ? '✅ Aktif' : '⏳ Belum diaktifkan'}
        </li>
      ))}
    </ul>
  )
}
```

### `useActiveCombinedRule(address?)` — Baca Policy Aktif Merchant

```tsx
import { useActiveCombinedRule } from 'payid-react'

function PolicyMerchant({ merchantAddress }) {
  const { data: policy } = useActiveCombinedRule(merchantAddress)

  if (!policy) return <p>Tidak ada policy aktif — semua pembayaran diizinkan</p>

  return (
    <div>
      <p>Versi policy: {policy.version.toString()}</p>
      <p>Jumlah rules: {policy.ruleRefs.length}</p>
    </div>
  )
}
```

### `useRules({ creator })` — Filter Rules Berdasarkan Pembuat

```tsx
import { useRules } from 'payid-react'

function RulesPembuat({ creator }) {
  const { data: rules = [] } = useRules({ creator })
  // Kembalikan hanya rules yang dibuat oleh alamat ini
}
```

### `useAllCombinedRules()` — Daftar Semua Policy Terdaftar

```tsx
import { useAllCombinedRules } from 'payid-react'

function SemuaPolicy() {
  const { data: allRules = [] } = useAllCombinedRules()
  // Kembalikan semua objek CombinedRule on-chain
}
```

### `usePayIDContext()` — Akses Alamat Kontrak

```tsx
import { usePayIDContext } from 'payid-react'

function KomponentSaya() {
  const { contracts } = usePayIDContext()
  // contracts.ruleItemERC721
  // contracts.combinedRuleStorage
  // contracts.payWithPayId
  // contracts.payIdVerifier
}
```

---

## Contoh Lengkap yang Berjalan

Implementasi lengkap ada di `example-product/src/pages/test/index.tsx`. Isinya:

- **Tab Rule NFTs** — lihat semua rules, filter berdasarkan milikku/aktif, aktifkan rules
- **Tab Create Rule** — buat dan mint Rule NFT baru dari browser
- **Tab Combine** — pilih rules dan daftarkan combined policy
- **Tab Subscription** — subscribe, cek status, perpanjang subscription
- **Tab Pay** — flow pembayaran lengkap menggunakan `usePayIDFlow`

### Tab Pay (TransactTab)

Bagian kunci dari tab Pay di `test/index.tsx`:

```tsx
function TransactTab({ myAddress }) {
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')

  const { execute, reset, status, isPending, error, decision, txHash } = usePayIDFlow()

  const handleBayar = () => {
    execute({
      receiver: receiver as Address,
      asset: USDC_ADDRESS,
      amount: BigInt(Math.round(parseFloat(amount) * 1_000_000)),
      payId: `pay.id/${receiver.slice(2, 10).toLowerCase()}`,
    })
  }

  return (
    <div>
      <input placeholder="Alamat receiver 0x..." value={receiver} onChange={e => setReceiver(e.target.value)} />
      <input type="number" placeholder="Jumlah" value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={handleBayar} disabled={isPending || !receiver || !amount}>
        {status === 'idle' ? '→ Kirim Pembayaran' : status}
      </button>
    </div>
  )
}
```

### Tab Create Rule

Dari `test/CreateRuleTab.tsx`, ini memungkinkan kamu membuat Rule NFT dari browser. Ia membangun rule JSON dan memanggil:

```tsx
// Dari CreateRuleTab.tsx
const ruleHash = keccak256(toBytes(canonicalize(ruleObject)))

// 1. Subscribe (kalau belum)
await tx.send({ functionName: 'subscribe', value: subPrice })

// 2. Buat rule on-chain
await tx.send({ functionName: 'createRule', args: [ruleHash, ipfsUri] })

// 3. Aktifkan (mint NFT)
await tx.send({ functionName: 'activateRule', args: [ruleId] })
```

---

## Tips

**Inisialisasi PayIDProvider sekali.** `<PayIDProvider>` membungkus seluruh app dan mengelola lifecycle SDK.

**Jangan pernah cache proof.** `usePayIDFlow` menghasilkan proof baru setiap kali. Jangan simpan dan gunakan kembali proof — mereka expired dalam 5 menit.

**Cek subscription sebelum aktifkan rules.** Gunakan `useSubscription(address)` untuk verifikasi status subscription pengguna sebelum biarkan mereka membuat rules.

**Preview policy receiver.** Gunakan `useActiveCombinedRule(receiver)` sebelum pembayaran untuk menampilkan kepada pengguna rules apa yang akan dicek.
