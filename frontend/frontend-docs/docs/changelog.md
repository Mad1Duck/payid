---
id: changelog
title: Changelog
sidebar_label: Changelog
sidebar_position: 99
---

# Changelog

All notable changes to the PAY.ID ecosystem across packages, contracts, and frontend.

---

## May 2026

### ✨ New Features

#### 1. V4 Dashboard Redesign (PIVY-Inspired)

The entire V4 app UI has been redesigned with a clean, card-based layout inspired by modern fintech apps (PIVY concept). Changes span across 5 components:

- **Dashboard (`frontend/example-product/src/components/v4/Dashboard.tsx`)**
  - Stealth Balance Card — gradient green (`#00D084`) with prominent USD display, QR button
  - Token List — ETH, USDC, PDT with individual balance items
  - Demo Token Banner — green info card: "We've sent you this to experience how seamless PAY.ID withdrawals are"
  - Your Personal Link — PayID card with avatar, copy/QR/share actions
  - Quick Actions — Send, Receive, History with rounded-2xl icon buttons
  - Activity Feed — tab filters (All / Incoming / Outgoing), Export CSV button, avatar per transaction

- **ReceivePage (`frontend/example-product/src/components/v4/ReceivePage.tsx`)**
  - QR Card — gradient green with centered QR code
  - PayID Card — copyable link with avatar and action buttons
  - Wallet Address — expandable section with ChevronRight

- **HistoryPage (`frontend/example-product/src/components/v4/HistoryPage.tsx`)**
  - Summary Cards — gradient red (Sent) & green (Received) with rounded-[20px]
  - Search Bar — input with Search icon
  - Tab Filters — All / Incoming / Outgoing
  - Transaction List — Avatar + detail + status badge + amount

- **SettingsPage (`frontend/example-product/src/components/v4/SettingsPage.tsx`)**
  - Profile Card — gradient green with avatar besar dan PayID
  - Theme Toggle — modern switch
  - Settings List — color-coded icons (blue, yellow, green, purple)
  - Disconnect — red card with warning style

- **AppLayout (`frontend/example-product/src/components/v4/AppLayout.tsx`)**
  - Logo — "pay.id" dengan BETA badge
  - Nav Items — rounded-xl active state, clean spacing
  - Bottom CTA — "PAY.ID is currently in beta" dengan avatar stack
  - Links — Docs, X (Twitter)

#### 2. VRAN — Vindex Reputation & Anti-Scam Network

A new decentralized trust layer for PAY.ID and other Web3 protocols.

- **`packages/contracts/contracts/VindexRegistry.sol`**
  - Reputation scores (0–1000, default 500)
  - Staked reporting with evidence hash (IPFS/Arweave CID)
  - Web of Trust consensus — reports valid after ≥3 high-reputation (≥700) confirmations
  - Auto-blacklist when reputation drops below 100
  - Slash false reporters — stake returned to victim, reputation penalty
  - Role-based access: `DEFAULT_ADMIN_ROLE`, `ENGINE_ROLE`, `SENTINEL_ROLE`

- **`packages/payid-react/src/hooks/useReputation.ts`**
  - `useReputation({ registryAddress, target })` → `{ score, isBlacklisted, isTrusted }`
  - `useCanReport({ registryAddress })` → check if wallet can submit report
  - `useVranConfig({ registryAddress })` → read `minStake` and `consensusThreshold`

#### 3. QRIS / Bank Bridge Extension v1.1

The fiat integration spec has been expanded from a brief memo to a full implementation guide.

- Extended Context Schema — `FiatContext` with `rail`, `psp`, `mcc`, `terminalId`, `currency`
- 6 new rule examples — min amount, PSP allowlist, currency restriction, MCC blocklist, QRIS-only, combined policy
- PSP Adapter Pattern — `FiatAdapter` class reference implementation
- Bank Verification Endpoint — `verifyPaymentProof()` reference code
- Failure Semantics table — fail-closed for all edge cases
- Regulatory Alignment — AML/KYC complementarity, data privacy, licensing
- 5-Phase Roadmap — QRIS MVP → Multi-PSP → VRAN → SWIFT/SEPA → CBDC

#### 4. 0G Resolver Hardening

The 0G storage resolver is now configurable via SDK instead of relying solely on a global variable.

- `ResolverOptions` type — `{ zgIndexerUrl?: string }`
- `resolveRule(source, options?)` accepts optional `ResolverOptions`
- URL priority: `options.zgIndexerUrl` → `globalThis.PAYID_ZGS_INDEXER_URL` → default `https://indexer-testnet.0g.ai`
- `PayIDClient` and `PayIDServer` constructors accept `resolverOptions`
- Factory functions updated: `createPayIDClient({ resolverOptions })`, `createPayIDServer({ resolverOptions })`
- `ResolverOptions` exported from `payid` package index

---

### 🐛 Bug Fixes

- **Tailwind CSS lint warnings** — Converted bracket opacity syntax (`bg-white/[0.03]`) to new Tailwind v4 syntax (`bg-white/3`) across all V4 components
- **LandingPageV4 TypeScript error** — Fixed `ease` type in `fadeUp()` transition (array → `'easeOut' as const`)
- **v3/AppLayout warning** — Fixed `md:ml-[200px]` → `md:ml-50`
- **cursor-pointer** — Added to all clickable items (buttons, cards, tabs) across V4 components

---

### 📁 Files Changed

```
frontend/example-product/src/components/v4/Dashboard.tsx
frontend/example-product/src/components/v4/ReceivePage.tsx
frontend/example-product/src/components/v4/HistoryPage.tsx
frontend/example-product/src/components/v4/SettingsPage.tsx
frontend/example-product/src/components/v4/AppLayout.tsx
frontend/example-product/src/components/v4/SendFlow.tsx
frontend/example-product/src/components/v4/LandingPageV4.tsx
frontend/example-product/src/components/v4/theme.tsx
frontend/example-product/src/components/v3/AppLayout.tsx
packages/contracts/contracts/VindexRegistry.sol                    [NEW]
packages/payid-react/src/hooks/useReputation.ts                   [NEW]
docs/bank-qris-extension.md                                        [UPDATED]
docs/reputation_system_draft.md                                   [EXISTS]
packages/sdk-core/src/resolver/resolver.ts
packages/sdk-core/src/resolver/types.ts
packages/sdk-core/src/core/client/client.ts
packages/sdk-core/src/core/server/server.ts
packages/sdk-core/src/factory.ts
packages/sdk-core/src/index.ts
```

### Additional May 2026 Updates

#### 5. FiatAdapter SDK Implementation
- `packages/sdk-core/src/adapters/fiatAdapter.ts` — Reference implementation for QRIS/PSP integration
- Exports: `FiatAdapter`, `QRISPayload`, `FiatEvaluationResult`
- Methods: `evaluatePayment()`, `buildContext()`

#### 6. VRAN Hook Context Integration
- `useReputation({ target })` — now reads `vindexRegistry` from `PayIDContext` automatically
- `useCanReport()` — checks if connected wallet can submit staked reports
- `useVranConfig()` — reads `minStake` and `consensusThreshold`
- All hooks exported from `payid-react`

#### 7. V4 Dashboard Reputation Card
- `frontend/example-product/src/components/v4/Dashboard.tsx`
- Displays live reputation score with color-coded badge (Trusted / Neutral / Blacklisted)
- Shows between Quick Actions and Activity Feed

#### 8. Frontend Documentation
- `docs/integration/bank-qris-bridge.md` — New doc page for Bank/QRIS Bridge
- `docs/integration/vran-reputation.md` — New doc page for VRAN
- `docs/changelog.md` — This changelog page
- `docs/intro.md` — Updated with "What's New" section

---

## Usage Examples

### Using Custom 0G Indexer

```typescript
import { createPayIDClient } from 'payid';

const client = createPayIDClient({
  resolverOptions: {
    zgIndexerUrl: 'https://my-custom-indexer.0g.ai',
  },
});
```

### Checking Reputation Before Payment (with Context)

```typescript
import { useReputation } from 'payid-react';

function PayButton({ merchantAddress }: { merchantAddress: string }) {
  // Automatically reads vindexRegistry from <PayIDProvider>
  const { isBlacklisted, isTrusted, score } = useReputation({
    target: merchantAddress as `0x${string}`,
  });

  if (isBlacklisted) return <button disabled>🚫 Merchant Blacklisted</button>;
  if (!isTrusted) return <button disabled>⚠️ Low Reputation ({score})</button>;

  return <button>Pay Now</button>;
}
```

### Fiat Adapter for QRIS

```typescript
import { FiatAdapter } from 'payid';

const adapter = new FiatAdapter();

const { allowed, proof, reason } = await adapter.evaluatePayment(
  {
    amount: '150000',
    currency: 'IDR',
    merchantId: 'MID123',
    pspCode: 'BANK_ABC',
  },
  'https://rules.example.com/merchant-rules.json',
  walletSigner,
  {
    verifyingContract: '0x...',
    ruleAuthority: '0x...',
    chainId: 31337,
  }
);
```
