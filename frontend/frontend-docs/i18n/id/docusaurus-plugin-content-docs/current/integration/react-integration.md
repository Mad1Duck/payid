---
id: react-integration
title: Integrasi React
sidebar_label: Integrasi React
---

# Integrasi React

PAY.ID menyediakan paket React khusus — `payid-react` — yang dibangun di atas [wagmi](https://wagmi.sh). Menangani semua interaksi kontrak, koneksi wallet, dan state multi-step payment untukmu.

---

## Install

```bash
npm install payid-react payid wagmi viem @tanstack/react-query ethers
# atau
bun add payid-react payid wagmi viem @tanstack/react-query ethers
```

Untuk render QR image (opsional — `payload` string selalu tersedia):

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## Setup Provider

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
        >
          <App />
        </PayIDProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## Ringkasan Hooks

| Hook | Sisi | Fungsi |
|---|---|---|
| `usePayIDFlow` | Payer | Full payment flow — fetch rules, evaluasi, prove, submit |
| `usePayIDQR` | Merchant | Generate QR code bertanda tangan |
| `usePayETH` | Payer | Low-level: bayar dengan ETH |
| `usePayERC20` | Payer | Low-level: bayar dengan ERC20 |
| `useSubscribe` | Merchant | Subscribe untuk unlock slot rule |
| `useCreateRule` | Merchant | Buat Rule NFT baru |
| `useActivateRule` | Merchant | Aktifkan (mint) Rule NFT |
| `useExtendRuleExpiry` | Merchant | Perpanjang expiry Rule NFT |
| `useRegisterCombinedRule` | Merchant | Daftarkan kebijakan combined rule |
| `useDeactivateCombinedRule` | Merchant | Nonaktifkan kebijakan aktif |
| `useSubscription` | Read | Cek status subscription |
| `useMyRules` | Read | Ambil Rule NFT milikmu |
| `useActiveCombinedRule` | Read | Baca kebijakan aktif alamat manapun |
| `useAllCombinedRules` | Read | List semua kebijakan terdaftar |

---

## `usePayIDFlow` — Full Payment Flow (Payer)

Cara paling mudah untuk bayar. Menangani semua langkah: load rules dari chain + IPFS, evaluasi, sign proof, ERC20 approval, dan submit transaksi.

```tsx
import { usePayIDFlow } from 'payid-react'
import { parseUnits, zeroAddress } from 'viem'

const USDC_ADDRESS = '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'

function CheckoutButton({ merchantAddress }: { merchantAddress: `0x${string}` }) {
  const { execute, reset, status, isPending, isSuccess, error, denyReason, txHash } =
    usePayIDFlow()

  return (
    <div>
      <button
        onClick={() => execute({
          receiver: merchantAddress,
          asset:    USDC_ADDRESS,
          amount:   parseUnits('50', 6),
          payId:    'pay.id/merchant',
        })}
        disabled={isPending}
      >
        {status === 'idle'            && 'Bayar 50 USDC'}
        {status === 'fetching-rule'   && 'Memuat rules...'}
        {status === 'evaluating'      && 'Mengecek rules...'}
        {status === 'proving'         && 'Tanda tangani proof di wallet...'}
        {status === 'approving'       && 'Setujui USDC...'}
        {status === 'awaiting-wallet' && 'Konfirmasi payment...'}
        {status === 'confirming'      && 'Konfirmasi di chain...'}
        {status === 'success'         && '✅ Berhasil!'}
        {status === 'denied'          && '❌ Ditolak'}
        {status === 'error'           && 'Coba lagi'}
      </button>

      {status === 'denied'  && <p>Alasan: {denyReason}</p>}
      {status === 'success' && <p>TX: {txHash}</p>}
      {error                && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

### Payment ETH

Pass `zeroAddress` sebagai asset untuk ETH native:

```tsx
execute({ receiver: merchantAddress, asset: zeroAddress, amount: parseUnits('0.01', 18), payId: 'pay.id/merchant' })
```

---

## `usePayIDQR` — QR Code Generator (Merchant)

Merchant pakai hook ini untuk generate QR code bertanda tangan yang discan pelanggan.

```tsx
import { usePayIDQR } from 'payid-react'
import { parseUnits } from 'viem'

function MerchantQR() {
  const { generate, reset, isPending, isReady, payload, qrDataUrl, error } = usePayIDQR()

  return (
    <div>
      <button
        onClick={() => generate({
          payId:        'pay.id/toko-ku',
          allowedAsset: USDC_ADDRESS,
          maxAmount:    parseUnits('100', 6),
          expiresAt:    Math.floor(Date.now() / 1000) + 3600,
        })}
        disabled={isPending}
      >
        {isPending ? 'Membuat QR...' : 'Generate QR'}
      </button>

      {/* PNG data URL kalau package 'qrcode' terinstall */}
      {qrDataUrl && <img src={qrDataUrl} alt="Scan untuk bayar" width={256} />}

      {/* Fallback: pakai library QR apapun dengan payload string */}
      {payload && !qrDataUrl && <p style={{ wordBreak: 'break-all', fontSize: 11 }}>{payload}</p>}

      {error   && <p style={{ color: 'red' }}>{error}</p>}
      {isReady && <button onClick={reset}>QR Baru</button>}
    </div>
  )
}
```

**Di sisi payer** setelah scan:

```ts
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'

const policy = decodeSessionPolicyV2QR(scannedQRString)
execute({
  receiver: policy.receiver   as `0x${string}`,
  asset:    policy.allowedAsset as `0x${string}`,
  amount:   BigInt(policy.maxAmount),
  payId:    policy.payId,
})
```

---

## Write Hooks Merchant

### `useSubscribe` — Subscribe untuk unlock 3 slot rule

```tsx
const { subscribe, isPending } = useSubscribe()
// Ambil harga dari oracle dulu via useReadContract, lalu:
subscribe(price as bigint)
```

### `useCreateRule` + `useActivateRule`

```tsx
const { createRule }   = useCreateRule()
const { activateRule } = useActivateRule()

createRule({ ruleHash: keccak256(toBytes(ruleJson)), uri: 'ipfs://Qm...' })
activateRule(ruleId)  // ruleId dari RuleCreated event
```

### `useExtendRuleExpiry` — Perpanjang sebelum expired

```tsx
const { extendRuleExpiry } = useExtendRuleExpiry()

extendRuleExpiry({
  tokenId,
  newExpiry:  BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
  priceInWei: 100_000_000_000_000n,
})
```

### `useRegisterCombinedRule` — Aktifkan kebijakan payment

```tsx
const { registerCombinedRule } = useRegisterCombinedRule()

registerCombinedRule({
  ruleSetHash: keccak256(toBytes('my-policy-v1')),
  ruleNFTs:    Array(tokenIds.length).fill(contracts.ruleItemERC721),
  tokenIds,
  version:     1n,
})
```

---

## Read Hooks

### `useSubscription` — Status langganan

```tsx
const { data: sub } = useSubscription(address)
// sub.isActive, sub.logicalRuleCount, sub.maxSlots, sub.expiry
```

### `useMyRules` — Rule NFT milikmu

```tsx
const { data: rules = [] } = useMyRules()
// rules[].ruleId, rules[].active, rules[].tokenId
```

### `useActiveCombinedRule` — Kebijakan aktif merchant

```tsx
const { data: policy } = useActiveCombinedRule(merchantAddress)
// policy.hash, policy.version, policy.ruleRefs
```

---

## Tips

**Jangan cache proof.** `usePayIDFlow` generate fresh proof setiap kali. Proof kedaluwarsa dalam `ttlSeconds` detik (default 300).

**Cek subscription sebelum buat rule.** Pakai `useSubscription(address)` untuk verifikasi user punya slot aktif.

**Kompatibel dengan semua wallet.** `usePayIDFlow` dan `usePayIDQR` pakai `useConnectorClient` dari wagmi — kompatibel dengan MetaMask, WalletConnect, Coinbase Wallet, Safe, dan connector wagmi lainnya.
