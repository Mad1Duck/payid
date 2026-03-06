---
id: contracts-address
title: Network & Contract Addresses
sidebar_label: Contract Addresses
---

# Network & Contract Addresses

:::info Deploy Sendiri
Kontrak PAY.ID perlu di-deploy ke network target kamu. Pakai Hardhat Ignition module di `packages/contracts/ignition/modules/PayID.ts` untuk deploy, lalu isi address di bawah.
:::

---

## Localhost (Hardhat — Chain ID: 31337)

Ini adalah address dari fresh local `npx hardhat node` + `hardhat ignition deploy`. Sama di setiap clean local node.

| Kontrak | Address |
|---|---|
| `RuleAuthority` | `0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44` |
| `RuleItemERC721` | `0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f` |
| `CombinedRuleStorage` | `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE` |
| `PayIDVerifier` | `0x59b670e9fA9D0A427751Af201D676719a970857b` |
| `PayWithPayID` | `0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1` |
| `AttestationVerifier` | `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1` |
| `MockUSDC` (lokal saja) | `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d` |
| `MockEthUsdOracle` (lokal saja) | `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c` |

**Jalankan local node:**

```bash
cd packages/contracts
npx hardhat node
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost
```

---

## Network Lainnya

Kontrak belum di-deploy ke public testnet. Deploy menggunakan Ignition module, isi `.env` kamu, lalu konfigurasi `payid-react` dengan address kamu via `<PayIDProvider contracts={...}>`.

| Network | Chain ID | Status |
|---|---|---|
| Lisk Sepolia | 4202 | Belum di-deploy |
| Monad Testnet | 10143 | Belum di-deploy |
| Moonbase Alpha | 1287 | Belum di-deploy |
| Polygon Amoy | 80002 | Belum di-deploy |

---

## Deploy Kontrak

```bash
cd packages/contracts

# Lokal
npx hardhat ignition deploy ignition/modules/PayID.ts --network localhost

# Lisk Sepolia
npx hardhat ignition deploy ignition/modules/PayID.ts \
  --network liskSepolia \
  --parameters ignition/parameters/liskSepolia.json
```

Setelah deploy, salin address dari `ignition/deployments/<network>/deployed_addresses.json`.

---

## Konfigurasi payid-react

Pass address yang sudah di-deploy ke `<PayIDProvider>`:

```tsx
import { PayIDProvider } from 'payid-react'
import type { PayIDContracts } from 'payid-react'

const MY_CONTRACTS: PayIDContracts = {
  ruleAuthority:       '0x...', // RuleAuthority
  ruleItemERC721:      '0x...', // RuleItemERC721
  combinedRuleStorage: '0x...', // CombinedRuleStorage
  payIDVerifier:       '0x...', // PayIDVerifier
  payWithPayID:        '0x...', // PayWithPayID
}

export default function App() {
  return (
    <PayIDProvider contracts={{ [CHAIN_ID]: MY_CONTRACTS }}>
      <YourApp />
    </PayIDProvider>
  )
}
```

---

## Permission Model

### ✅ Permissionless

| Aksi | Kontrak |
|---|---|
| Subscribe | `RuleItemERC721.subscribe()` |
| Buat Rule NFT | `createRule()` + `activateRule()` |
| Perpanjang expiry | `extendRuleExpiry(tokenId, newExpiry)` |
| Daftarkan rule set | `CombinedRuleStorage.registerCombinedRule()` |
| Nonaktifkan rule set | `CombinedRuleStorage.deactivateMyCombinedRule()` |
| Baca rule aktif | `CombinedRuleStorage.getActiveRuleOf()` |
| Kirim payment ETH | `PayWithPayID.payETH()` |
| Kirim payment ERC20 | `PayWithPayID.payERC20()` |
| Verifikasi proof | `PayIDVerifier.verifyDecision()` |

### 🔐 Admin Only

| Aksi | Deskripsi |
|---|---|
| `PayIDVerifier.setTrustedAuthority(addr, bool)` | Whitelist atau hapus rule authority |
| `RuleItemERC721.pause()` | Emergency pause |
| `RuleItemERC721.setSubscriptionUsdCents(n)` | Ubah harga subscription |
| `MockEthUsdOracle.setPrice(n)` | Update oracle price (test only, owner-gated) |

---

## Subscription & Biaya

| | Detail |
|---|---|
| Biaya subscription | Dihitung dari oracle harga ETH/USD × `subscriptionUsdCents` |
| Fallback price | `0.0001 ETH` (kalau oracle stale > 1 jam atau revert) |
| Durasi subscription | 30 hari per pembayaran |
| Slot rule tanpa subscription | 1 |
| Slot rule dengan subscription | 3 (`MAX_SLOT`) |
| Expiry rule | Diset eksplisit via `extendRuleExpiry(tokenId, timestamp)` |
