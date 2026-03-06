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

## 1. Install SDK

The core SDK package name is `payid`. Install it along with `ethers` as a peer dependency:

```bash
npm install payid ethers
# or
bun add payid ethers
```

For React apps, install the React integration package:

```bash
npm install payid-react wagmi viem @tanstack/react-query ethers
# or
bun add payid-react wagmi viem @tanstack/react-query ethers
```

:::info Package Names
The npm packages are `payid` (core SDK) and `payid-react` (React hooks). Not `@payid/sdk-core`.
:::

---

## 2. Initialize SDK

### Client Mode (browser / Node.js)

Use `payid/client` when your rules only check `tx.*` fields — no KYC, no rate limits needed.

```ts
import { createPayID } from "payid/client";

const payid = createPayID({ debugTrace: true }); // debugTrace optional

// Wait for WASM to be ready before calling evaluate/evaluateAndProve
await payid.ready();
```

### Server Mode (with trusted issuers for Context V2)

Use `payid/server` when rules need verified data from your backend (KYC, spend tracking, geoblocking).

```ts
import { createPayID } from "payid/server";

const payid = createPayID({
  trustedIssuers: new Set([ENV_ISSUER_ADDRESS, STATE_ISSUER_ADDRESS]),
});
```

:::warning
`new Set([])` means no trusted issuers — all attestations will be rejected. If you don't need trusted issuers, omit the property entirely or use client mode.
:::

---

## 3. Environment Variables

```env
# Network (use your target network RPC)
RPC_URL=https://your-rpc-url.com
CHAIN_ID=31337

# Wallets (use test wallets only — never put real money here)
SENDER_PRIVATE_KEY=0x...
SENDER_ADDRESS=0x...
RECIVER_PRIVATE_KEY=0x...
RECIVER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...
ISSUER_ADDRESS=0x...

# IPFS (get from pinata.cloud)
PINATA_JWT=eyJh...
PINATA_URL=https://api.pinata.cloud
PINATA_GATEWAY=https://gateway.pinata.cloud

# Contract addresses — fill after deploying or get from network docs
COMBINED_RULE_STORAGE=0x0000000000000000000000000000000000000000
RULE_ITEM_ERC721=0x0000000000000000000000000000000000000000
PAYID_VERIFIER=0x0000000000000000000000000000000000000000
PAY_WITH_PAYID=0x0000000000000000000000000000000000000000
MOCK_USDC=0x0000000000000000000000000000000000000000
```

---

## 4. Verify Installation

Run a quick sanity check with a local evaluation — no wallet or network needed:

```ts
import { createPayID } from "payid/client";

const payid = createPayID({});
await payid.ready();

const result = await payid.evaluate(
  {
    tx: {
      sender: "0x0000000000000000000000000000000000000001",
      receiver: "0x0000000000000000000000000000000000000002",
      asset: "USDC",
      amount: "150000000",
      chainId: 1,
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

## 5. Repository Structure

```
payid-master/
├── packages/
│   ├── sdk-core/          # Core SDK — published as "payid" on npm
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   ├── client/    # payid/client export
│   │   │   │   └── server/    # payid/server export
│   │   │   ├── sessionPolicy/ # payid/sessionPolicy export (QR, Channel A)
│   │   │   ├── context/       # payid/context export (buildContextV2)
│   │   │   └── rule/          # payid/rule export
│   ├── payid-react/       # React hooks — published as "payid-react"
│   │   └── src/
│   │       ├── PayIDProvider.tsx
│   │       └── hooks/
│   │           ├── usePayID.ts      # Read + write hooks
│   │           ├── usePayIDFlow.ts  # Full payment flow
│   │           ├── usePayIDQR.ts    # QR generator for merchants
│   │           ├── useRules.ts      # Rule NFT hooks
│   │           └── useCombinedRules.ts
│   ├── types/             # Shared TypeScript types — "payid-types"
│   ├── contracts/         # Solidity contracts + Hardhat setup
│   └── rule-engine/       # WASM rule engine — "payid-rule-engine"
```

---

## Troubleshooting

**`RULE_LICENSE_EXPIRED`**
The merchant's Rule NFT has expired. The merchant needs to call `extendRuleExpiry()` or create a new Rule NFT with an active subscription.

**`RULE_AUTHORITY_NOT_TRUSTED`**
The `ruleAuthority` address passed to `evaluateAndProve` is not whitelisted in `PayIDVerifier`. Use the official `CombinedRuleStorage` address from the [Contract Addresses →](../network/contracts-address) page, or ask the contract admin to whitelist your authority via `setTrustedAuthority()`.

**`RULE_SLOT_FULL`**
The merchant has hit the slot limit (1 without subscription, 3 with). They need to subscribe via `subscribe()` or deactivate an existing rule first.

**WASM not ready**
Always `await payid.ready()` before calling `evaluate()` or `evaluateAndProve()`. The WASM binary is loaded asynchronously at startup.

**`Cannot find module 'payid/client'`**
Make sure you installed `payid` (not `@payid/sdk-core`). The subpath exports are `payid/client`, `payid/server`, `payid/sessionPolicy`, `payid/context`, `payid/rule`.
