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

#### 1. V4 Dashboard Redesign (Inspired)

The entire V4 app UI has been redesigned with a clean, card-based layout inspired by modern fintech apps (concept). Changes span across 5 components:

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

- **VRAN IPFS upload** — Fixed `useIPFSUpload` calling a non-existent placeholder endpoint (`api.payid-vran.ipfs.nftstorage.link/upload`). Now uses **Pinata v3 API** (`uploads.pinata.cloud/v3/files`) with `VITE_PINATA_JWT` auth, consistent with the rest of the codebase.
- **Reputation page navigation** — Replaced `window.location.href` (full page reload) with `<Link>` from `@tanstack/react-router` for the **Report Address** and **Confirm Report** buttons on `ReputationPage.tsx`, enabling SPA navigation.
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

#### 8. AttestationVerifier Integration (Main Payment Flow)

- `AttestationVerifier` is now wired into `usePayIDFlow`
- Pre-flight on-chain verification: calls `verifyAttestationBatch(attestationUIDs, payer)` before submitting payment
- Attestation check is **fail-closed**: if `requiresAttestation` is true and verification fails, the payment is rejected
- `attestationUIDs` passed through to `payNative` / `payERC20` contract calls
- Admin page: `useAttestationVerifier` hook for verifier initialization and management (`/v4/app/admin`)

#### 9. Frontend Documentation

- `docs/integration/platform-payid-bridge.md` — New doc page for Platform × PAY.ID seamless composition
- `docs/integration/platform-adapters.md` — New doc page for Plug-and-Play Adapters
- `docs/integration/bank-qris-bridge.md` — New doc page for Bank/QRIS Bridge
- `docs/integration/vran-reputation.md` — New doc page for VRAN
- `docs/changelog.md` — This changelog page
- `docs/intro.md` — Updated with "What's New" section
- `docs/advanced-usage.md` — Added DAO Payroll, Batch Payment, Time-Lock Vesting, and Plug-and-Play Adapters sections

#### 10. Platform Adapters (Plug-and-Play SDK)

- `packages/payid-react/src/adapters/types.ts` — Adapter interfaces: `IReputationAdapter`, `IEscrowAdapter`
- `packages/payid-react/src/adapters/default.ts` — Default adapters wrapping `VindexRegistry` and `EscrowMilestone`
- `packages/payid-react/src/adapters/noop.ts` — No-op adapters return safe defaults instead of throwing
- `packages/payid-react/src/PayIDProvider.tsx` — New typed context:
  - `ReputationModule`: `{ adapter: IReputationAdapter, info: { label, source, active } }`
  - `EscrowModule`: `{ adapter: IEscrowAdapter, info: { label, source, active } }`
  - 3-tier resolution: injected → contract → noop
  - **No union types, no casting** — hooks use `reputation.adapter` directly
- `packages/payid-react/src/hooks/useReputation.ts` — Source-based routing:
  - `source === 'injected'` → call `adapter.getReputation()`
  - `source === 'contract'` → use wagmi `useReadContract`
  - `source === 'noop'` → return safe defaults
- Context exposes `features`: `{ reputation, escrow }` for conditional UI

#### 11. Platform × PAY.ID Bridge (Composite Adapters)

- `packages/payid-react/src/adapters/composite/platform-composite.ts` — Composite adapter implementations:
  - `CompositeReputationAdapter`: Blends platform reputation (60%) + PAY.ID VRAN (40%) into composite score
  - `PlatformEscrowAdapter`: Bridges any platform's escrow to `IEscrowAdapter` interface
  - `createCompositeIntegration()`: One-liner factory for full Platform × PAY.ID setup
- Fail-closed by default: if VRAN blacklists, composite score is blocked regardless of platform score
- Configurable weights: `platformWeight` + `vranWeight` for different trust models
- Escrow policy-gating: PAY.ID rules evaluate before platform milestone actions

#### 12. Adapter System Refinements (Async + React Query + Fallback + Middleware)

- **P1 — Async Consistency**: All adapter methods now return `Promise<...>` uniformly. No more sync/async union types (`Promise<T> | T`). Updated `IReputationAdapter`, `IEscrowAdapter`, and all implementations (noop, default, composite, fallback, middleware).
- **P2 — React Query Integration**: Injected adapters now use `useQuery` from `@tanstack/react-query` instead of manual `useEffect` + `useState`. Benefits: caching by queryKey, deduping across components, background refetch, stale-while-revalidate.
- **P3 — Fallback Chain + Write Hook Routing**:
  - `FallbackReputationAdapter` / `FallbackEscrowAdapter`: Try primary adapter first; on failure, automatically fall back to secondary. Perfect for progressive adoption (e.g. 10% platform users + 90% VRAN).
  - `useSubmitReport` and `useConfirmReport` now route writes through the adapter system. Injected adapters with `submitReport`/`confirmReport` are called via `useMutation`; contract path still uses wagmi `useWriteContract`.
- **P4 — Adapter Middleware**: New `withMiddlewareReputation()` and `withMiddlewareEscrow()` wrappers. Add cross-cutting concerns to any adapter:
  - **Logging**: Every call logged with timing (ms)
  - **Retry**: Exponential backoff retry on transient failures
  - **Timeout**: Auto-abort calls hanging > 10s
  - **Customizable**: `log`, `retry`, `timeout`, `logger` options

#### 13. Escrow Hooks & Complete Adapter Routing

- **`useEscrow` hooks (new)**:
  - `useUserEscrows({ user? })` — Read escrows with `useQuery` (injected path) or contract iteration (contract path)
  - `useCreateEscrow()` — Create escrow, routes through `adapter.createEscrow()` or `useWriteContract`
  - `useSubmitMilestone()` — Submit deliverable evidence
  - `useReleaseMilestone()` — Release payment
  - `useDisputeEscrow()` — Raise dispute
  - `useResolveRefund()` — Resolve with refund
  - `useAutoRefund()` — Trigger auto-refund after deadline
  - All write hooks use `useMutation` for injected path, `useWriteContract` for contract path
- **`useReport` routed through adapter**: If injected adapter implements `getReport`, `useReport({ reportId })` calls `adapter.getReport()` via `useQuery`. Otherwise falls back to contract `reports(reportId)`.
- **`reportCount` added to `VranConfigResult`**: Optional field so adapters can expose total report count. All implementations updated (noop, default, composite).
- **Example app nav**: `AppLayout.tsx` now shows escrow nav item conditionally via `features.escrow`

#### 14. `useSuccessfulReports` Adapter Routing + Shared `TxHookResult`

- **`getSuccessfulReports` added to `IReputationAdapter`**: Optional adapter method for reading successful report counts. Implemented in default, composite, fallback, and middleware adapters.
- **`useSuccessfulReports` routed through adapter system**: Injected path uses `adapter.getSuccessfulReports()` via `useQuery`; contract path reads from `successfulReports(address)`. Return shape now includes `error` field.
- **`TxHookResult` extracted to shared types**: Single source of truth in `src/types/index.ts`. Removed duplicate definitions from `useReputation.ts`, `useEscrow.ts`, `usePayID.ts`, and `useAIAgentRules.ts`. Exported from package public API.

#### 15. Dead Code Cleanup + Consistency Fixes

- **`TxHookResult` deduplication completed**: Also removed from `useAIAgentRegistry.ts` (was missed in #14). All 4 write-hook files now import from shared `src/types/index.ts`.
- **`adapters/index.ts` barrel file removed**: No internal or external consumers existed; all imports use direct submodule paths (`./adapters/default`, `./adapters/noop`, etc.).
- **`useReport` return shape fixed**: Contract path now returns `error` (from `useReadContract`) instead of hardcoded `null`, matching the injected path and all other read hooks.
- **`DefaultReputationAdapter.getConfig` fixed**: Now reads `reportCount` from contract (`reportCount()`) instead of hardcoding `0`. ABI updated to include `reportCount` view function.

#### 16. Trust Threshold Hardcoding Fixed

- **`trustThreshold` added to `VranConfigResult`**: Optional field exposing the trust threshold used for `isTrusted` computation. Defaults to 700 if not tracked.
- **`DefaultReputationAdapter`**: Added `trustThreshold` constructor parameter (default 700). `getReputation()` uses `this.trustThreshold` instead of hardcoded 700. `getConfig()` returns the threshold.
- **`useContractReputation`**: Removed extra `isTrusted` contract call. Now computes `isTrusted = score >= DEFAULT_TRUST_THRESHOLD && !isBlacklisted` locally — one fewer contract call.
- **`useContractCanReport`**: Reads `minReporterReputation` from contract instead of hardcoding 100. Uses the live contract value for threshold comparison.
- **`useContractVranConfig` / `useInjectedVranConfig`**: Now return `trustThreshold` in their result shapes.
- **All adapters updated**: Noop, composite, fallback, and middleware adapters all pass through `trustThreshold`.

#### 17. `DefaultEscrowAdapter.createEscrow` Placeholder Fixed

- **`createEscrow` now returns real `escrowId`**: Parses `EscrowCreated` event from transaction receipt instead of returning hardcoded `0n`. Event ABI added to inline `EscrowMilestoneAbi`. Throws descriptive error if event not found.

#### 18. Documentation: Phantom Integration Example

- **`platform-adapters.md`**: Added complete end-to-end Section 4 — "Phantom Example: Your Own Contracts + PAY.ID Hooks". Covers:
  - PhantomReputationAdapter + PhantomEscrowAdapter implementations
  - `PayIDProvider` wiring with mixed contracts (Phantom reputation/escrow + PAY.ID payment)
  - UI examples: `ReputationPanel` (`useReputation`, `useCanReport`, `useVranConfig`) and `EscrowPanel` (`useUserEscrows`, `useCreateEscrow`, `useSubmitMilestone`, `useReleaseMilestone`)

#### 19. RPC Batching Optimization (Multicall)

- **`useContractReputation`**: Batched 2 separate `useReadContract` calls (`getReputation` + `isBlacklisted`) into single `useReadContracts` multicall — 1 RPC request instead of 2.
- **`useContractCanReport`**: Batched 2 separate `useReadContract` calls (`getReputation` + `minReporterReputation`) into single `useReadContracts` multicall.
- **`useContractVranConfig`**: Batched 4 separate `useReadContract` calls (`minStake` + `consensusThreshold` + `minReporterReputation` + `reportCount`) into single `useReadContracts` multicall — 1 RPC request instead of 4.
- **`useContractUserEscrows`**: Replaced N+1 loop of individual `readContract` calls with `publicClient.multicall` — all `escrows(i)` calls batched into 1 RPC request.
- **`DefaultEscrowAdapter.getUserEscrows`**: Same multicall optimization applied at adapter level.

**Impact**: For a typical page load (reputation + canReport + vranConfig + escrow list), RPC requests drop dari ~7+ menjadi ~3 (1 per batched group + 1 nextEscrowId + 1 for other unbatched calls).

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
  },
);
```

---

## SDK Enhancements (May 2026)

### 1. PayID Name Resolution API — Reverse Lookup

Resolve wallet addresses back to human-readable PayIDs.

```typescript
import { reverseResolvePayID, batchReverseResolve } from 'payid';

// Single lookup
const result = await reverseResolvePayID('0x1234567890123456789012345678901234567890', {
  registryUrl: 'https://registry.pay.id/v1',
});
console.log(result?.payId); // "alice.pay.id"

// Batch lookup (for contact lists / tx history)
const map = await batchReverseResolve(['0x1234...', '0xabcd...']);
```

### 2. Offline-First IndexedDB Cache

Rules, contacts, drafts, and history cached locally for offline use.

```typescript
import { contactCache, draftCache, ruleCache, getCacheStats } from 'payid';

// Cache a contact
await contactCache.set({
  payId: 'alice.pay.id',
  address: '0x1234...',
  name: 'Alice',
  addedAt: Date.now(),
});

// Create offline draft (syncs when online)
await draftCache.set({
  toPayId: 'bob.pay.id',
  amount: '100',
  asset: 'USDC',
  status: 'draft',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Check cache stats
const stats = await getCacheStats();
console.log(`${stats.contacts} contacts, ${stats.drafts} drafts`);
```

### 3. SDK CLI Tool

Deploy rules and verify proofs from the command line.

```bash
# Deploy a rule JSON to IPFS + register on-chain
npx payid deploy-rule ./my-rule.json \
  --authority 0xRuleAuthority \
  --chain 31337 \
  --key $PRIVATE_KEY \
  --rpc http://127.0.0.1:8545 \
  --output result.json

# Verify a Decision Proof by txHash
npx payid verify-proof 0xabc123... \
  --verifier 0xPayIDVerifier \
  --rpc http://127.0.0.1:8545 \
  --signer 0xExpectedSigner
```

---

## Frontend & Smart Contract Features (May 2026)

### 1. Multi-Currency Display

Toggle between USD / IDR / ETH in real-time on the Send Flow amount input.

```tsx
import { useMultiCurrency } from './hooks/useMultiCurrency';

const { displayCurrency, convert, format, toggle } = useMultiCurrency();
// ≈ Rp 525.000.000 shown below amount input
```

### 2. Transaction Simulation Preview

Client-side simulation before signing: checks balance, fees, and rules.

```tsx
import TransactionSimulation from './components/v4/TransactionSimulation';

<TransactionSimulation
  amount="0.05"
  asset="ETH"
  currentBalance="1.25"
  onComplete={(result) => console.log(result.decision)}
/>;
```

### 3. Policy Marketplace UI

Browse and subscribe to rule templates: Freelancer Safe Pay, Parental Control, Business Hours, DAO Payroll, etc.

Route: `/v4/app/marketplace`

### 4. VRAN Reputation Badge

Dashboard shows reputation score with color-coded badges:

- Green (800+): Trusted
- Yellow (500-799): Neutral
- Red (`<500`): Low reputation
- Blacklisted: Warning banner before sending

### 5. Push Notifications

Web Push API integration with Service Worker for payment alerts.

```tsx
const { subscribe, state, sendLocalNotification } = usePushNotifications();
```

### 6. Advanced Tools (Batch, Recurring, Escrow, Vesting)

Interactive UI for all new smart contract extensions.

Route: `/v4/app/tools`

Tabs:

- **Batch Pay** — Multi-recipient ETH/ERC20 payroll
- **Recurring** — Subscription creation with max amount & period
- **Escrow** — Milestone-based freelancer escrow
- **Vesting** — Time-locked token vesting with cliff

---

## Smart Contract Extensions (May 2026)

### 1. Batch Payment (`PayWithPayIDBatch.sol`)

Execute multiple ETH or ERC20 payments in a single transaction.

```solidity
function batchPayETH(
    PayIDVerifier.Decision[] calldata decisions,
    bytes[] calldata sigs,
    bytes32[][] calldata attestationUIDs
) external payable
```

### 2. Recurring Payments (`RecurringPayments.sol`)

Subscription billing with pre-approved max amounts per period.

```solidity
function createSubscription(
    address receiver,
    address asset,
    uint256 maxAmount,
    uint256 period
) external returns (uint256 subId)

function charge(uint256 subId, Decision, sig, attestationUIDs) external
```

### 3. Escrow with Milestones (`EscrowMilestone.sol`)

Freelancer escrow with VRAN arbiter confirmation for each milestone.

```solidity
function createEscrow(
    address freelancer,
    address asset,
    uint256[] calldata amounts,
    string[] calldata descriptions,
    uint256 deadline
) external payable

function releaseMilestone(uint256 escrowId, uint256 index) external onlyArbiter
```

### 4. Time-Locked Vesting (`TimeLockVesting.sol`)

Token vesting with cliff and linear release. Integrates with rule engine `env.timestamp`.

```solidity
function createSchedule(
    address beneficiary,
    address asset,
    uint256 totalAmount,
    uint256 startTime,
    uint256 cliff,
    uint256 duration,
    bool revocable,
    address revoker
) external payable

function release(uint256 scheduleId) external
```

---

## Off-Chain Keeper / Cron (May 2026)

Schedules need an off-chain trigger because blockchains do not run cron natively.

Script: `packages/contracts/scripts/keeper.ts`

### What it does

- **Recurring** — scans subscriptions; calls `charge()` when `nextChargeTime <= now`
- **Vesting** — scans schedules; calls `release()` when `releasable > 0`
- **Escrow** — scans escrows; calls `autoRefund()` when `deadline <= now`

### Run locally

```bash
cd packages/contracts
PRIVATE_KEY=0x... RPC_URL=http://127.0.0.1:8545 \
  bun run keeper --chainId 31337
```

### Options

- `--dry-run` — scan only, no transactions
- `--once` — single pass, then exit
- default — loops every 60 seconds

### Production deployment

For production, deploy this script as:

- **Gelato Relay / Web3 Functions**
- **Chainlink Automation (upkeep)**
- **AWS Lambda + EventBridge (cron)**
- **Self-hosted Bun service with systemd / PM2**
