---
id: setup
title: Installation & Setup
sidebar_label: Setup
---

# Installation & Setup

## Requirements

| Tool | Version |
|---|---|
| Node.js | `≥ 18` |
| Bun | `≥ 1.0` (recommended) |
| TypeScript | `≥ 5.0` |

---

## Install Packages

Choose based on what you're building:

### React / Frontend

```bash
npm install payid-react payid wagmi viem @tanstack/react-query ethers
# or
bun add payid-react payid wagmi viem @tanstack/react-query ethers
```

### Node.js / Backend (no React)

```bash
npm install payid ethers
# or
bun add payid ethers
```

### Optional: QR image rendering in React

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

Without `qrcode`, the `payload` string is still available for rendering with any other QR library.

:::info Package Names
npm packages are `payid` (core SDK) and `payid-react` (React hooks). Not `@payid/sdk-core` or `@payid/react`.
:::

---

## React Provider Setup

`payid-react` requires three nested providers. Add this once to your app root:

```tsx
// main.tsx (or _app.tsx / layout.tsx)
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, hardhat } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PayIDProvider } from 'payid-react'

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
})

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PayIDProvider
          contracts={{
            // Override contract addresses per chainId
            // Get addresses from: docs/network/contracts-address
            [mainnet.id]: {
              ruleAuthority:       '0x...',
              ruleItemERC721:      '0x...',
              combinedRuleStorage: '0x...',
              payIDVerifier:       '0x...',
              payWithPayID:        '0x...',
            },
          }}
          ipfsGateway="https://gateway.pinata.cloud/ipfs/"
        >
          {children}
        </PayIDProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### `PayIDProvider` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `contracts` | `Record<chainId, PayIDContracts>` | Built-in defaults | Override contract addresses per chain |
| `ipfsGateway` | `string` | `https://gateway.pinata.cloud/ipfs/` | IPFS gateway for rule fetching |

---

## Node.js / Backend Setup

### Client Mode — Browser / Node.js (no server wallet)

Rules only check basic transaction fields (`tx.*`). The payer signs with their own wallet.

```ts
import { createPayIDClient } from 'payid/client'

const payid = createPayIDClient({ debugTrace: false })

// Wait for WASM engine to load — REQUIRED in Node.js before calling evaluate/evaluateAndProve
await payid.ready()
```

:::note
In React, WASM loads lazily inside the hooks. You do **not** need to call `ready()` manually when using `usePayIDFlow` or `usePayIDQR`.
:::

### Server Mode — Backend / Bundler (server wallet)

Rules can access server-signed context: KYC, rate limits, geoblocking. The server wallet signs proofs.

```ts
import { createPayIDServer } from 'payid/server'
import { ethers } from 'ethers'

const payid = createPayIDServer({
  signer: new ethers.Wallet(process.env.PRIVATE_KEY!, provider),

  // Optional: trusted issuer addresses for Context V2 attestation verification
  // trustedIssuers: new Set([process.env.ISSUER_ADDRESS!]),
})

// No ready() call needed — PayIDServer is always ready
```

:::warning Server mode only
`createPayIDServer` binds a private key at construction. Never use this in a browser. Never commit private keys to source control.
:::

### Verify Installation

Test locally with no wallet or network:

```ts
import { createPayIDClient } from 'payid/client'

const payid = createPayIDClient({})
await payid.ready()

const result = await payid.evaluate(
  {
    tx: {
      sender:   '0x0000000000000000000000000000000000000001',
      receiver: '0x0000000000000000000000000000000000000002',
      asset:    'USDC',
      amount:   '150000000',
      chainId:  1,
    },
  },
  {
    version: '1',
    logic:   'AND',
    rules: [
      { id: 'min_100', if: { field: 'tx.amount', op: '>=', value: '100000000' } },
    ],
  }
)

console.log(result.decision) // "ALLOW"
```

---

## Subpath Exports

The `payid` package has several subpath exports:

| Import | Contents |
|---|---|
| `payid` or `payid/client` | `createPayIDClient`, `PayIDClient` |
| `payid/server` | `createPayIDServer`, `PayIDServer` |
| `payid/sessionPolicy` | `createSessionPolicyV2`, `encodeSessionPolicyV2QR`, `decodeSessionPolicyV2QR` |
| `payid/context` | `buildContextV2` |
| `payid/rule` | `hashRuleSet`, `canonicalize`, `combineRules` |

---

## Environment Variables

For scripts and backend servers:

```env
# Network
RPC_URL=https://your-rpc-url.com
CHAIN_ID=1

# Server wallet (backend only — never expose to browser)
PRIVATE_KEY=0x...

# Issuer wallets for Context V2 (server mode only)
ISSUER_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...

# IPFS (get free API key from pinata.cloud)
PINATA_JWT=eyJh...
PINATA_GATEWAY=https://gateway.pinata.cloud

# Contract addresses (from Contract Addresses page)
COMBINED_RULE_STORAGE=0x...
RULE_ITEM_ERC721=0x...
PAYID_VERIFIER=0x...
PAY_WITH_PAYID=0x...
```

---

## TypeScript Configuration

Minimum `tsconfig.json` for the SDK:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

For React with `payid-react`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM"],
    "module": "Preserve",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  }
}
```

---

## Troubleshooting

**`Cannot find module 'payid/client'`**
Ensure `payid` is installed (not `@payid/sdk-core`). Check your `moduleResolution` — use `"bundler"` or `"node16"`.

**`RULE_LICENSE_EXPIRED`**
The merchant's Rule NFT has expired. They must call `extendRuleExpiry()` or create a new Rule NFT.

**`RULE_AUTHORITY_NOT_TRUSTED`**
The `ruleAuthority` address isn't whitelisted in `PayIDVerifier`. Use the official `CombinedRuleStorage` address from [Contract Addresses →](../network/contracts-address).

**`RULE_SLOT_FULL`**
Merchant hit the slot limit (1 without subscription, 3 with). Subscribe first via `subscribe()`.

**WASM not ready**
In Node.js, always call `await payid.ready()` before `evaluate()` or `evaluateAndProve()`. In React, this is handled automatically by the hooks.

**`new Set([])` rejects all attestations**
In server mode, if `trustedIssuers: new Set([])`, all Context V2 attestations are rejected. Either omit `trustedIssuers` or add the issuer addresses you trust.
