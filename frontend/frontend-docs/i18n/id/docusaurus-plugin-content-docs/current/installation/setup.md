---
id: setup
title: Instalasi & Setup
sidebar_label: Setup
---

# Instalasi & Setup

## Requirements

| Tool | Version |
|---|---|
| Node.js | `≥ 18` |
| Bun | `≥ 1.0` (direkomendasikan) |
| TypeScript | `≥ 5.0` |

---

## 1. Install SDK

Nama paket npm-nya adalah `payid`. Install bersama `ethers` sebagai peer dependency:

```bash
npm install payid ethers
# atau
bun add payid ethers
```

Untuk React app, install paket integrasi React:

```bash
npm install payid-react wagmi viem @tanstack/react-query ethers
# atau
bun add payid-react wagmi viem @tanstack/react-query ethers
```

:::info Nama Paket
Paket npm-nya adalah `payid` (core SDK) dan `payid-react` (React hooks). Bukan `@payid/sdk-core`.
:::

---

## 2. Inisialisasi SDK

### Client Mode (browser / Node.js)

Pakai `payid/client` kalau rules kamu hanya cek field `tx.*` — tidak perlu KYC atau rate limit.

```ts
import { createPayID } from "payid/client";

const payid = createPayID({ debugTrace: true }); // debugTrace opsional
await payid.ready();  // tunggu WASM selesai loading
```

### Server Mode (dengan trusted issuers untuk Context V2)

Pakai `payid/server` kalau rules butuh data terverifikasi dari backend kamu (KYC, spend tracking, geoblocking).

```ts
import { createPayID } from "payid/server";

const payid = createPayID({
  trustedIssuers: new Set([ENV_ISSUER_ADDRESS, STATE_ISSUER_ADDRESS]),
});
```

:::warning
`new Set([])` berarti tidak ada trusted issuer — semua attestation akan ditolak. Kalau tidak butuh trusted issuer, hilangkan propertinya atau pakai client mode.
:::

---

## 3. Environment Variables

```env
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337

SENDER_PRIVATE_KEY=0x...
RECIVER_PRIVATE_KEY=0x...
ISSUER_PRIVATE_KEY=0x...

PINATA_JWT=your_jwt_here
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

# Isi setelah deploy atau lihat halaman network docs
COMBINED_RULE_STORAGE=0x0000000000000000000000000000000000000000
RULE_ITEM_ERC721=0x0000000000000000000000000000000000000000
PAYID_VERIFIER=0x0000000000000000000000000000000000000000
PAY_WITH_PAYID=0x0000000000000000000000000000000000000000
MOCK_USDC=0x0000000000000000000000000000000000000000
```

---

## 4. Verifikasi Instalasi

Jalankan quick check dengan evaluasi lokal — tidak perlu wallet atau network:

```ts
import { createPayID } from "payid/client";

const payid = createPayID({});
await payid.ready();

const result = await payid.evaluate(
  {
    tx: {
      sender:   "0x0000000000000000000000000000000000000001",
      receiver: "0x0000000000000000000000000000000000000002",
      asset:    "USDC",
      amount:   "150000000",
      chainId:  1,
    },
  },
  {
    version: "1",
    logic: "AND",
    rules: [
      { id: "min_amount", if: { field: "tx.amount", op: ">=", value: "100000000" } },
    ],
  }
);

console.log(result.decision); // "ALLOW"
```

---

## 5. Struktur Repository

```
payid-master/
├── packages/
│   ├── sdk-core/          # Core SDK — dipublish sebagai "payid" di npm
│   │   └── src/
│   │       ├── core/
│   │       │   ├── client/      # export payid/client
│   │       │   └── server/      # export payid/server
│   │       ├── sessionPolicy/   # export payid/sessionPolicy (QR, Channel A)
│   │       ├── context/         # export payid/context (buildContextV2)
│   │       └── rule/            # export payid/rule
│   ├── payid-react/       # React hooks — dipublish sebagai "payid-react"
│   │   └── src/
│   │       ├── PayIDProvider.tsx
│   │       └── hooks/
│   │           ├── usePayID.ts        # Read + write hooks
│   │           ├── usePayIDFlow.ts    # Full payment flow
│   │           ├── usePayIDQR.ts      # QR generator untuk merchant
│   │           ├── useRules.ts        # Rule NFT hooks
│   │           └── useCombinedRules.ts
│   ├── types/             # Shared TypeScript types — "payid-types"
│   ├── contracts/         # Kontrak Solidity + setup Hardhat
│   └── rule-engine/       # WASM rule engine — "payid-rule-engine"
```

---

## Troubleshooting

**`RULE_LICENSE_EXPIRED`**
Rule NFT merchant sudah expired. Merchant perlu panggil `extendRuleExpiry()` atau buat Rule NFT baru.

**`RULE_AUTHORITY_NOT_TRUSTED`**
Alamat `ruleAuthority` yang dipass ke `evaluateAndProve` tidak di-whitelist di `PayIDVerifier`. Pakai alamat `CombinedRuleStorage` resmi dari halaman [Contract Addresses →](../network/contracts-address), atau minta admin kontrak whitelist authority kamu via `setTrustedAuthority()`.

**`RULE_SLOT_FULL`**
Merchant sudah mencapai batas slot (1 tanpa langganan, 3 dengan langganan). Perlu subscribe via `subscribe()` atau nonaktifkan rule yang ada.

**WASM belum siap**
Selalu `await payid.ready()` sebelum memanggil `evaluate()` atau `evaluateAndProve()`. WASM binary dimuat secara asinkron.

**`Cannot find module 'payid/client'`**
Pastikan kamu install `payid` (bukan `@payid/sdk-core`). Subpath exports yang tersedia: `payid/client`, `payid/server`, `payid/sessionPolicy`, `payid/context`, `payid/rule`.
