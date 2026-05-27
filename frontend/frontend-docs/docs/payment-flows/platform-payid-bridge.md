---
id: platform-payid-bridge
title: Platform × PAY.ID Bridge
sidebar_label: Platform Bridge
---

# 🔗 Platform × PAY.ID Bridge

> **Goal**: Make any platform's milestone escrow and PAY.ID's reputation system work as one unified experience.
>
> **Not** replacing your platform with PAY.ID. **Not** replacing PAY.ID with your platform.
>
> **But**: Blending both into a seamless composition.
>
> This pattern works for Platform, Upwork, Fiverr, or any custom bounty/marketplace system.

---

## The Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                    USER EXPERIENCE                          │
│                                                             │
│   Platform Bounty Card                                       │
│   ┌─────────────────────────────────────────┐              │
│   │  💰 5 ETH  |  3 Milestones              │              │
│   │                                           │              │
│   │  Client: 0xabc...  ⭐ 850 (Platform×VRAN) │              │
│   │  Freelancer: 0xdef...  ⭐ 720            │              │
│   │                                           │              │
│   │  [Claim]  [View Milestones]              │              │
│   └─────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Platform    │    │   PAY.ID     │    │   PAY.ID     │
   │   Escrow     │    │    VRAN      │    │   Rules      │
   │  (External)  │    │  Reputation  │    │   Engine     │
   └──────────────┘    └──────────────┘    └──────────────┘
```

**Your Platform** = Execution layer (escrow, milestones, disputes, payments)
**PAY.ID** = Policy layer (reputation checks, rule evaluation, decision proofs)

---

## What You Get

| Feature | Platform Alone | PAY.ID Alone | **Platform × PAY.ID** |
|---------|---------------|-------------|----------------------|
| Milestone escrow | ✅ | ✅ (simpler) | ✅ Platform's rich features |
| Multi-arbiter dispute | ✅ | ❌ (single) | ✅ Platform's system |
| Reputation scoring | ✅ (5D) | ✅ (VRAN) | ✅ **Blended 850** |
| Anti-scam blacklist | ❌ | ✅ | ✅ **Both checked** |
| Policy-driven payments | ❌ | ✅ | ✅ **Rules gate escrow** |
| Spending limits | ❌ | ✅ | ✅ **Before bounty creation** |
| Attestation gating | ❌ | ✅ | ✅ **KYC for high-value** |

---

## Setup (One-Liner)

```tsx
import {
  PayIDProvider,
  DefaultReputationAdapter,
  createCompositeIntegration,
} from 'payid-react';
import { createPlatformSdk } from 'your-platform-sdk'; // your platform's SDK

const platform = createPlatformSdk({ chainId: 31337 });

// Create PAY.ID VRAN adapter
const vranAdapter = new DefaultReputationAdapter(
  publicClient,
  walletClient,
  contracts.vindexRegistry,
);

// Create composite: Platform (60%) + VRAN (40%)
const { reputationAdapter, escrowAdapter } = createCompositeIntegration({
  platform,
  vranAdapter,
  platformWeight: 0.6,
  vranWeight: 0.4,
});

function App() {
  return (
    <PayIDProvider
      contracts={contracts}
      reputationAdapter={reputationAdapter}
      escrowAdapter={escrowAdapter}
    >
      <App />
    </PayIDProvider>
  );
}
```

---

## How the Blend Works

### Reputation Formula

```
Composite Score = PlatformScore × weight + VRANScore × (1 - weight)

Example:
  Platform: 900 (great freelancer)
  VRAN:    600 (new to PAY.ID network)
  Weight:  0.6

  Composite = 900 × 0.6 + 600 × 0.4 = 540 + 240 = 780
```

**Fail-closed**: If VRAN says `isBlacklisted: true`, composite score is irrelevant — user is blocked.

### What the Hook Returns

```tsx
const { data } = useReputation({ target: freelancerAddress });
// data.score        → 780 (composite)
// data.isTrusted    → true (≥ 700 threshold)
// data.isBlacklisted → false (both systems clear)
```

---

## Escrow Flow with Policy Layer

```
1. Client posts bounty
   ├─ Platform: createEscrow(freelancer, milestones, deadline)
   └─ PAY.ID: evaluate rule "can this client spend 5 ETH?"
      └─ Decision Proof generated, stored on bounty

2. Freelancer claims bounty
   ├─ Platform: claimBounty(bountyId)
   └─ PAY.ID: check freelancer reputation ≥ minReputation
      └─ If REJECT → claim blocked, reason shown

3. Freelancer submits milestone
   ├─ Platform: submitDeliverable(evidenceHash)
   └─ PAY.ID: attest deliverable hash on-chain (optional)

4. Client releases milestone
   ├─ Platform: approveMilestone(index)
   └─ PAY.ID: verify Decision Proof before signing release tx
      └─ Rule: "Only release if freelancer rep ≥ 700 AND milestone confirmed"

5. Dispute raised
   ├─ Platform: multi-arbiter voting (3 arbiters)
   └─ PAY.ID: arbiters' reputation checked before vote counted
```

---

## UI: Unified Bounty Card

```tsx
import { useReputation } from 'payid-react';
import { useBounty } from 'platform-hooks';

function BountyCard({ bountyId }: { bountyId: bigint }) {
  const { bounty } = useBounty(bountyId);
  const { data: posterRep } = useReputation({ target: bounty.poster });

  // Composite score shows both sources
  const scoreLabel = posterRep
    ? `${posterRep.score} · ${posterRep.isTrusted ? 'Trusted' : 'Neutral'}`
    : 'Loading...';

  return (
    <Card>
      <Header>
        <Amount>{formatEther(bounty.amount)} ETH</Amount>
        <StatusBadge status={bounty.status} />
      </Header>

      <Row>
        <Avatar address={bounty.poster} />
        <span>{shortAddr(bounty.poster)}</span>
        <ReputationBadge score={posterRep?.score} source="Platform×VRAN" />
      </Row>

      <Milestones milestones={bounty.milestones} />

      <Actions>
        {posterRep?.isTrusted && (
          <Button onClick={claim}>Claim Bounty</Button>
        )}
        {!posterRep?.isTrusted && (
          <Tooltip>Client reputation too low to claim</Tooltip>
        )}
      </Actions>
    </Card>
  );
}
```

---

## Custom Weight Configuration

Different use cases need different weights:

| Use Case | Platform Weight | VRAN Weight | Why |
|----------|---------------|-------------|-----|
| Freelancer marketplace | 0.6 | 0.4 | Platform's completion rate matters most |
| High-value enterprise | 0.3 | 0.7 | Anti-scam is critical |
| Community DAO | 0.5 | 0.5 | Balanced trust |
| Anonymous gigs | 0.0 | 1.0 | Only VRAN (no Platform history) |

```tsx
const { reputationAdapter } = createCompositeIntegration({
  platform,
  vranAdapter,
  platformWeight: 0.3,  // enterprise: prioritize anti-scam
  vranWeight: 0.7,
});
```

---

## Decision Matrix

| Your Situation | What to Do |
|---|---|
| Only Platform, no PAY.ID | `escrowAdapter={PlatformEscrowAdapter}`, `reputationAdapter={NoopReputationAdapter}` |
| Only PAY.ID, no Platform | Don't use this bridge — use default adapters |
| Both, but trust Platform more | `platformWeight: 0.7, vranWeight: 0.3` |
| Both, but PAY.ID anti-scam critical | `platformWeight: 0.3, vranWeight: 0.7` |
| Want to hide PAY.ID features | `reputationAdapter={NoopReputationAdapter}` |

---

## Under the Hood

```ts
// PlatformCompositeReputationAdapter.getReputation()
async function getReputation(target) {
  const [platformScore, vranResult] = await Promise.all([
    platform.reputation.getScore(target),           // 0–1000
    vranAdapter.getReputation(target),             // { score, isBlacklisted }
  ]);

  // Blend
  const composite = Math.min(1000,
    platformScore * platformWeight + vranResult.score * vranWeight
  );

  // Fail-closed: either blacklisted = both blacklisted
  return {
    score: composite,
    isBlacklisted: vranResult.isBlacklisted,
    isTrusted: composite >= threshold && !vranResult.isBlacklisted,
  };
}
```

---

## Read Hooks: React Query Integration

All injected adapters use `@tanstack/react-query` under the hood:

```ts
// useReputation({ target }) internally:
const { data, isLoading, error } = useQuery({
  queryKey: ['payid', 'reputation', 'injected', adapter.name, account],
  queryFn: () => adapter.getReputation(account),
  enabled: !!account,
  staleTime: 30_000, // 30s cache
});
```

**Benefits you get for free:**
- **Caching** — Re-mount component? Data served from cache, no re-fetch
- **Deduping** — 2 components with same queryKey = 1 network call
- **Background refetch** — Window focus triggers silent refresh
- **Error retry** — Automatic retry with exponential backoff

---

## Write Hooks: Adapter-Routed

`useSubmitReport` and `useConfirmReport` now route through the adapter system:

| Source Path | Behavior |
|-------------|----------|
| **Injected** adapter | Calls `adapter.submitReport()` via `useMutation` |
| **Contract** path | Uses wagmi `useWriteContract` as before |

```tsx
function ScamReportButton({ target }: { target: Address }) {
  const { submitReport, isPending, isSuccess } = useSubmitReport({});

  return (
    <Button
      onClick={() => submitReport(target, evidenceHash, parseEther('0.01'))}
      loading={isPending}
    >
      {isSuccess ? 'Reported!' : 'Submit Report'}
    </Button>
  );
}
```

**Result**: Works identically whether you're using PAY.ID VRAN, a custom platform adapter, or a composite blend.

---

## Read Hooks: `useReport` Routed Through Adapter

`useReport({ reportId })` now checks the adapter first:

| Source Path | Behavior |
|-------------|----------|
| **Injected** adapter (has `getReport`) | `adapter.getReport(reportId)` via `useQuery` |
| **Contract** path | wagmi `useReadContract` → `reports(reportId)` |

```tsx
function ReportLookup() {
  const { report, isLoading } = useReport({ reportId: 42n });

  return isLoading
    ? <Spinner />
    : report
      ? <ReportCard report={report} />
      : <p>Report not found</p>;
}
```

**Custom platforms** that store reports off-chain or in a different format can implement `getReport` on their adapter — `useReport` will automatically use it.

---

## Read Hooks: `useSuccessfulReports` Routed Through Adapter

`useSuccessfulReports({ target? })` now routes through the adapter system:

| Source Path | Behavior |
|-------------|----------|
| **Injected** adapter (has `getSuccessfulReports`) | `adapter.getSuccessfulReports(address)` via `useQuery` |
| **Contract** path | wagmi `useReadContract` → `successfulReports(address)` |

```tsx
function ReporterStats({ address }: { address: Address }) {
  const { count, isLoading } = useSuccessfulReports({ target: address });

  return isLoading
    ? <Spinner />
    : <Badge>{count} successful reports</Badge>;
}
```

**Custom platforms** that track successful reports off-chain or in a different schema can implement `getSuccessfulReports` on their adapter.

---

## Escrow Hooks: Full Source-Based Routing

PAY.ID now provides escrow hooks with the same 3-tier resolution as reputation hooks:

```tsx
import {
  useUserEscrows,
  useCreateEscrow,
  useSubmitMilestone,
  useReleaseMilestone,
} from 'payid-react';

function EscrowDashboard() {
  const { escrows, isLoading } = useUserEscrows();
  const { createEscrow, isPending } = useCreateEscrow();
  const { releaseMilestone } = useReleaseMilestone();

  return (
    <div>
      {isLoading ? 'Loading...' : escrows.map(e => (
        <EscrowCard
          key={String(e.id)}
          escrow={e}
          onRelease={(idx) => releaseMilestone(e.id, idx)}
        />
      ))}
      <button
        onClick={() => createEscrow(freelancer, asset, milestones, deadline)}
        disabled={isPending}
      >
        Create Escrow
      </button>
    </div>
  );
}
```

| Hook | Description |
|------|-------------|
| `useUserEscrows({ user? })` | Read escrows for a user (as client or freelancer) |
| `useCreateEscrow()` | Create escrow with milestones |
| `useSubmitMilestone()` | Submit deliverable evidence (freelancer) |
| `useReleaseMilestone()` | Release payment for a milestone (client/arbiter) |
| `useDisputeEscrow()` | Raise a dispute |
| `useResolveRefund()` | Resolve with full refund |
| `useAutoRefund()` | Trigger auto-refund after deadline |

---

## Advanced: Fallback Chain

Not all users have platform reputation yet. Use `FallbackReputationAdapter` to try platform first, then fall back to VRAN:

```tsx
import {
  createCompositeIntegration,
  createFallbackReputation,
  DefaultReputationAdapter,
} from 'payid-react';

const vranAdapter = new DefaultReputationAdapter(publicClient, walletClient, vindexAddr);

const { reputationAdapter: platformAdapter } = createCompositeIntegration({
  platform,
  vranAdapter,
});

// Progressive adoption: platform first, VRAN fallback
const fallbackAdapter = createFallbackReputation(platformAdapter, vranAdapter);

<PayIDProvider reputationAdapter={fallbackAdapter}>
  <App />
</PayIDProvider>
```

**Result**: Users with platform history get blended scores. New users without platform history seamlessly fall back to pure VRAN.

---

## Advanced: Middleware (Logging, Retry, Timeout)

Debug production issues by wrapping adapters with middleware:

```tsx
import { withMiddlewareReputation, withMiddlewareEscrow } from 'payid-react';

const reputationAdapter = withMiddlewareReputation(fallbackAdapter, {
  log: true,        // console.log every call with timing
  retry: 3,         // retry up to 3 times on failure
  timeout: 5000,    // abort after 5 seconds
});

const escrowAdapter = withMiddlewareEscrow(platformEscrowAdapter, {
  log: process.env.NODE_ENV === 'development',
  retry: 2,
});
```

**Example log output:**
```
[middleware] getReputation(0xabc…) → platform-composite
[middleware] getReputation(0xabc…) ← platform-composite (124ms)
[middleware] getReputation(0xdef…) → platform-composite
[middleware] getReputation(0xdef…) failed (attempt 1/4), retrying in 1000ms…
```

---

## Next Steps

- **[Platform Adapters →](./platform-adapters)** — How plug-and-play adapters work
- **[VRAN Reputation →](./vran-reputation)** — PAY.ID's native reputation system
- **[React Integration →](./react-integration)** — Full dApp setup guide
