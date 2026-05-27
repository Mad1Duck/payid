---
id: platform-adapters
title: Plug-and-Play Adapters
sidebar_label: Platform Adapters
sidebar_position: 7
slug: /integration/platform-adapters
---

# 🔌 Platform Adapters

PAY.ID is designed to **coexist** with platforms that already have their own on-chain reputation or escrow systems. Instead of forcing you to replace existing infrastructure, you can **plug in** your own modules or **unplug** ours.

> **Use case**: You're building on a platform that already has its own `MilestoneManager` + `ReputationContract`. You want PAY.ID for payments and rule evaluation, but keep your platform's milestones and reputation. Platform Adapters make this seamless.

---

## What Are Adapters?

Adapters are thin wrappers that translate between PAY.ID's hook interface and your platform's on-chain contracts.

| Module | PAY.ID Default | You Can Override With |
|--------|---------------|----------------------|
| **Reputation** | `VindexRegistry` (VRAN) | `IReputationAdapter` |
| **Escrow** | `EscrowMilestone` | `IEscrowAdapter` |

PAY.ID core (rules, payments, decision proofs) is **always active**. Adapters only affect optional modules.

---

## Resolution Flow

When `<PayIDProvider>` mounts, it checks each module in this order:

```
1. INJECTED adapter  →  You passed a custom adapter
   └─ name === 'noop' ? DISABLED : ACTIVE

2. CONTRACT deployed →  PAY.ID contract address is non-zero
   └─ vindexRegistry → "VRAN" | escrowMilestone → "Escrow"

3. FALLBACK          →  Noop adapter
   └─ Feature DISABLED, label = "Disabled"
```

**Injected always wins.** If you pass `NoopReputationAdapter`, VRAN is hidden even if `vindexRegistry` is deployed.

---

## Quick Start

### 1. Disable PAY.ID Modules (Use Your Own)

```tsx
import {
  PayIDProvider,
  NoopReputationAdapter,
  NoopEscrowAdapter,
} from 'payid-react';

function YourApp() {
  return (
    <PayIDProvider
      contracts={YOUR_PAYID_CONTRACTS}
      reputationAdapter={NoopReputationAdapter}
      escrowAdapter={NoopEscrowAdapter}
    >
      <App />
    </PayIDProvider>
  );
}
```

**Result**: Reputation and Escrow UI disappears. PAY.ID payments + rules still work.

---

### 2. Bridge Your Platform to PAY.ID Hooks

```tsx
import type { IReputationAdapter, ReputationResult } from 'payid-react';

class YourPlatformReputationAdapter implements IReputationAdapter {
  readonly name = 'your-platform';
  readonly label = 'Your Platform';

  private trustThreshold = 700;

  async getReputation(target: `0x${string}`): Promise<ReputationResult> {
    const score = await platform.reputation.getScore(target);
    return {
      score,                          // 0–1000
      isBlacklisted: score < 100,
      isTrusted: score >= this.trustThreshold,
    };
  }

  async getConfig() {
    return {
      minStake: parseEther('0.01'),
      consensusThreshold: 3n,
      minReporterReputation: 700n,
      trustThreshold: this.trustThreshold,
    };
  }

  async canReport(address: `0x${string}`) {
    const score = await platform.reputation.getScore(address);
    return score >= 100;
  }
}

// Use it
<PayIDProvider reputationAdapter={new YourPlatformReputationAdapter()}>
  <App />
</PayIDProvider>
```

**Result**: `useReputation()`, `useCanReport()`, and `useVranConfig()` now read from your platform. VRAN UI shows **"Your Platform"** label instead of **"VRAN"**.

---

### 3. Build an Escrow Adapter

```tsx
import type { IEscrowAdapter, MilestoneDef, EscrowResult } from 'payid-react';

class YourPlatformEscrowAdapter implements IEscrowAdapter {
  readonly name = 'your-platform';
  readonly label = 'Your Platform Escrow';

  async createEscrow(
    freelancer: `0x${string}`,
    asset: `0x${string}`,
    milestones: MilestoneDef[],
    deadline: bigint,
  ): Promise<bigint> {
    return platform.milestoneManager.createEscrow({
      freelancer,
      amounts: milestones.map(m => m.amount),
      descriptions: milestones.map(m => m.description),
      deadline,
    });
  }

  async submitMilestone(escrowId: bigint, index: number, evidenceHash: string) {
    return platform.milestoneManager.submitDeliverable(escrowId, evidenceHash);
  }

  async releaseMilestone(escrowId: bigint, index: number) {
    return platform.milestoneManager.approveMilestone(escrowId, BigInt(index));
  }

  async getUserEscrows(user: `0x${string}`): Promise<EscrowResult[]> {
    const bounties = await platform.graph.getBountiesByUser(user);
    return bounties.map(b => ({
      id: b.id,
      client: b.poster,
      freelancer: b.taker,
      asset: b.token,
      total: b.amount,
      released: b.released,
      status: this.mapStatus(b.status),
      milestones: b.milestones,
      deadline: b.deadline,
    }));
  }

  private mapStatus(s: string): EscrowResult['status'] {
    switch (s) {
      case 'POSTED': return 'pending';
      case 'CLAIMED': return 'active';
      case 'DISPUTED': return 'disputed';
      case 'APPROVED': return 'completed';
      case 'CANCELLED': return 'refunded';
      default: return 'pending';
    }
  }
}
```

---

### 4. Phantom Example: Your Own Contracts + PAY.ID Hooks

Phantom has its own `PhantomReputation` and `PhantomMilestone` contracts. You bridge them into PAY.ID via two adapters, then use PAY.ID hooks everywhere.

#### Step 1: Write the Adapters

```tsx
// phantom-adapters.ts
import type {
  IReputationAdapter, IEscrowAdapter,
  ReputationResult, EscrowResult, MilestoneDef,
} from 'payid-react';
import type { Address, Hash, PublicClient, WalletClient } from 'viem';

// ─── Phantom Reputation Adapter ───────────────────────────────────────────

const PhantomReputationABI = [
  { type: 'function', name: 'getScore', inputs: [{ type: 'address' }], outputs: [{ type: 'uint16' }], stateMutability: 'view' },
  { type: 'function', name: 'isBlacklisted', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'canReport', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'minStake', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

export class PhantomReputationAdapter implements IReputationAdapter {
  readonly name = 'phantom';
  readonly label = 'Phantom VRAN';

  constructor(
    private client: PublicClient,
    private address: Address,
    private trustThreshold = 700,
  ) {}

  async getReputation(target: Address): Promise<ReputationResult> {
    const [score, blacklisted] = await Promise.all([
      this.client.readContract({
        address: this.address, abi: PhantomReputationABI, functionName: 'getScore', args: [target],
      }) as Promise<number>,
      this.client.readContract({
        address: this.address, abi: PhantomReputationABI, functionName: 'isBlacklisted', args: [target],
      }) as Promise<boolean>,
    ]);
    return { score, isBlacklisted: blacklisted, isTrusted: score >= this.trustThreshold && !blacklisted };
  }

  async getConfig() {
    const minStake = await this.client.readContract({
      address: this.address, abi: PhantomReputationABI, functionName: 'minStake',
    }) as bigint;
    return { minStake, consensusThreshold: 3n, minReporterReputation: 700n, trustThreshold: this.trustThreshold };
  }

  async canReport(address: Address) {
    return this.client.readContract({
      address: this.address, abi: PhantomReputationABI, functionName: 'canReport', args: [address],
    }) as Promise<boolean>;
  }

  // Phantom does not have report staking — optional methods stay undefined
  submitReport = undefined;
  confirmReport = undefined;
  getReport = undefined;
  getSuccessfulReports = undefined;
}

// ─── Phantom Milestone / Escrow Adapter ─────────────────────────────────

const PhantomMilestoneABI = [
  { type: 'function', name: 'createEscrow', inputs: [{ type: 'address' }, { type: 'address' }, { type: 'uint256[]' }, { type: 'string[]' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'payable' },
  { type: 'function', name: 'submitMilestone', inputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'releaseMilestone', inputs: [{ type: 'uint256' }, { type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'dispute', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'resolveRefund', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'escrows', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'nextEscrowId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'EscrowCreated', inputs: [{ name: 'escrowId', type: 'uint256', indexed: true }, { name: 'client', type: 'address', indexed: true }, { name: 'freelancer', type: 'address', indexed: true }, { name: 'total', type: 'uint256', indexed: false }], anonymous: false },
] as const;

export class PhantomEscrowAdapter implements IEscrowAdapter {
  readonly name = 'phantom';
  readonly label = 'Phantom Escrow';

  constructor(
    private client: PublicClient,
    private wallet: WalletClient,
    private address: Address,
  ) {}

  async createEscrow(freelancer: Address, asset: Address, milestones: MilestoneDef[], deadline: bigint, value?: bigint): Promise<bigint> {
    const hash = await this.wallet.writeContract({
      address: this.address,
      abi: PhantomMilestoneABI,
      functionName: 'createEscrow',
      args: [freelancer, asset, milestones.map(m => m.amount), milestones.map(m => m.description), deadline],
      value,
    });
    const receipt = await this.client.waitForTransactionReceipt({ hash });
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: PhantomMilestoneABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'EscrowCreated') return (decoded.args as any).escrowId as bigint;
      } catch { continue; }
    }
    throw new Error('[PhantomEscrowAdapter] EscrowCreated event not found');
  }

  async submitMilestone(escrowId: bigint, index: number, evidenceHash: string): Promise<Hash | null> {
    return this.wallet.writeContract({
      address: this.address, abi: PhantomMilestoneABI, functionName: 'submitMilestone',
      args: [escrowId, BigInt(index), evidenceHash as Hash],
    });
  }

  async releaseMilestone(escrowId: bigint, index: number): Promise<Hash | null> {
    return this.wallet.writeContract({
      address: this.address, abi: PhantomMilestoneABI, functionName: 'releaseMilestone',
      args: [escrowId, BigInt(index)],
    });
  }

  async dispute(escrowId: bigint): Promise<Hash | null> {
    return this.wallet.writeContract({ address: this.address, abi: PhantomMilestoneABI, functionName: 'dispute', args: [escrowId] });
  }

  async resolveRefund(escrowId: bigint): Promise<Hash | null> {
    return this.wallet.writeContract({ address: this.address, abi: PhantomMilestoneABI, functionName: 'resolveRefund', args: [escrowId] });
  }

  async autoRefund(escrowId: bigint): Promise<Hash | null> {
    return this.wallet.writeContract({ address: this.address, abi: PhantomMilestoneABI, functionName: 'autoRefund', args: [escrowId] });
  }

  async getUserEscrows(user: Address): Promise<EscrowResult[]> {
    const nextId = await this.client.readContract({
      address: this.address, abi: PhantomMilestoneABI, functionName: 'nextEscrowId',
    }) as bigint;

    const results: EscrowResult[] = [];
    const statusMap = ['pending', 'active', 'disputed', 'completed', 'refunded'] as const;

    for (let i = 0n; i < nextId; i++) {
      try {
        const e = await this.client.readContract({
          address: this.address, abi: PhantomMilestoneABI, functionName: 'escrows', args: [i],
        }) as readonly [Address, Address, Address, bigint, bigint, number, bigint, bigint];

        const client = e[0];
        const freelancer = e[1];
        if (client.toLowerCase() !== user.toLowerCase() && freelancer.toLowerCase() !== user.toLowerCase()) continue;

        results.push({ id: i, client, freelancer, asset: e[2], total: e[3], released: e[4], status: statusMap[e[5]] ?? 'pending', milestones: [], deadline: e[7] });
      } catch { continue; }
    }
    return results;
  }
}
```

#### Step 2: Wire Everything in `PayIDProvider`

```tsx
// App.tsx
import { PayIDProvider } from 'payid-react';
import { PhantomReputationAdapter, PhantomEscrowAdapter } from './phantom-adapters';
import { usePublicClient, useWalletClient } from 'wagmi';

function PhantomApp() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract addresses deployed by Phantom
  const PHANTOM_REPUTATION = '0x1234...PhantomReputation';
  const PHANTOM_MILESTONE = '0x5678...PhantomMilestone';

  // PAY.ID contracts — tetap pakai untuk payment & rules
  const PAYID_VERIFIER = '0xABCD...PayIDVerifier';
  const PAYWITH_PAYID = '0xEF01...PayWithPayID';

  return (
    <PayIDProvider
      contracts={{
        payIDVerifier: PAYID_VERIFIER,
        payWithPayID: PAYWITH_PAYID,
        // vindexRegistry & escrowMilestone tidak diisi — Phantom pakai adapter sendiri
      }}
      reputationAdapter={new PhantomReputationAdapter(publicClient, PHANTOM_REPUTATION)}
      escrowAdapter={new PhantomEscrowAdapter(publicClient, walletClient, PHANTOM_MILESTONE)}
    >
      <PhantomUI />
    </PayIDProvider>
  );
}
```

#### Step 3: Use PAY.ID Hooks — Data Dari Phantom Contracts

```tsx
// ReputationPanel.tsx
import { useReputation, useCanReport, useVranConfig } from 'payid-react';

export function ReputationPanel({ target }: { target: `0x${string}` }) {
  const { score, isBlacklisted, isTrusted, isLoading } = useReputation({ target });
  const { canReport } = useCanReport({ target });
  const { minStake, trustThreshold } = useVranConfig({});

  if (isLoading) return <Spinner />;
  return (
    <Card>
      <Score value={score} />
      <Badge color={isTrusted ? 'green' : 'gray'}>{isTrusted ? 'Trusted' : 'Not Trusted'}</Badge>
      {isBlacklisted && <Badge color="red">Blacklisted</Badge>}
      <Text>Can report: {canReport ? 'Yes' : 'No'}</Text>
      <Text>Min stake: {formatEther(minStake)}</Text>
      <Text>Trust threshold: {trustThreshold}</Text>
    </Card>
  );
}

// EscrowPanel.tsx
import { useUserEscrows, useCreateEscrow, useSubmitMilestone, useReleaseMilestone } from 'payid-react';
import type { MilestoneDef } from 'payid-react';

export function EscrowPanel() {
  const { escrows, isLoading } = useUserEscrows({});
  const { createEscrow, isPending, isSuccess } = useCreateEscrow({});

  const milestones: MilestoneDef[] = [
    { description: 'Design mockup', amount: parseEther('0.05') },
    { description: 'Implement frontend', amount: parseEther('0.1') },
  ];

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={() => createEscrow(
          '0xFreelancer...',
          '0x0000000000000000000000000000000000000000', // ETH
          milestones,
          BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          parseEther('0.15'),
        )}
      >
        {isPending ? 'Creating...' : isSuccess ? 'Created!' : 'Create Escrow'}
      </Button>

      {isLoading ? <Spinner /> : escrows.map(e => (
        <EscrowRow key={e.id} escrow={e} />
      ))}
    </div>
  );
}

function EscrowRow({ escrow }: { escrow: EscrowResult }) {
  const { submitMilestone } = useSubmitMilestone({});
  const { releaseMilestone } = useReleaseMilestone({});

  return (
    <Card>
      <Text>Escrow #{escrow.id.toString()}</Text>
      <Text>Client: {escrow.client}</Text>
      <Text>Freelancer: {escrow.freelancer}</Text>
      <Text>Total: {formatEther(escrow.total)}</Text>
      <Text>Status: {escrow.status}</Text>
      <Button onClick={() => submitMilestone(escrow.id, 0, 'QmEvidenceHash...')}>
        Submit Milestone 0
      </Button>
      <Button onClick={() => releaseMilestone(escrow.id, 0)}>
        Release Milestone 0
      </Button>
    </Card>
  );
}
```

**Result**: Semua hooks (`useReputation`, `useCanReport`, `useVranConfig`, `useUserEscrows`, `useCreateEscrow`, `useSubmitMilestone`, `useReleaseMilestone`) membaca dan menulis ke **contract Phantom**, bukan ke PAY.ID. Payment hooks (`usePayID`, `usePayWithPayID`) tetap ke contract PAY.ID.

---

### Feature Flags in UI

Always use `features` from `usePayIDContext()` to conditionally render nav items.

```tsx
import { usePayIDContext } from 'payid-react';

function AppLayout() {
  const { reputation, escrow, features } = usePayIDContext();

  return (
    <nav>
      {/* Core — always visible */}
      <Link to="/send">Send</Link>
      <Link to="/receive">Receive</Link>
      <Link to="/rules">Policy</Link>

      {/* Optional — conditional */}
      {features.reputation && (
        <Link to="/reputation">
          <Star /> {reputation.info.label}  {/* "VRAN" | "Your Platform" | "Disabled" */}
        </Link>
      )}

      {features.escrow && (
        <Link to="/escrow">
          <Lock /> {escrow.info.label}      {/* "Escrow" | "Your Platform Escrow" */}
        </Link>
      )}
    </nav>
  );
}
```

---

## Module Metadata

Each resolved module exposes metadata so your UI knows what's running:

```ts
interface ModuleInfo {
  label: string;                             // "VRAN", "Your Platform", "Disabled"
  source: 'injected' | 'contract' | 'noop';    // how it was resolved
  active: boolean;                             // is the feature enabled?
}

interface ReputationModule {
  adapter: IReputationAdapter;  // always present — noop as fallback
  info: ModuleInfo;
}

interface EscrowModule {
  adapter: IEscrowAdapter;        // always present — noop as fallback
  info: ModuleInfo;
}
```

**Key insight**: `adapter` is always typed correctly — no union types, no casting. Hooks check `info.source` to decide which path to take.

Use `info` to show debugging info in settings:

```tsx
<SettingsPage>
  <Row label="Reputation">
    <Badge color={reputation.info.active ? 'green' : 'gray'}>
      {reputation.info.label} ({reputation.info.source})
    </Badge>
  </Row>
</SettingsPage>
```

---

## Decision Matrix

| Your Situation | Adapter Strategy |
|----------------|-----------------|
| No reputation system, want VRAN | **Default** — don't pass any adapter |
| Using your platform / custom reputation | **Inject custom** `IReputationAdapter` |
| Want to hide reputation tab entirely | **Noop** `NoopReputationAdapter` |
| VindexRegistry deployed but prefer your own | **Inject custom** — it overrides the contract |
| Platform milestones, no PAY.ID escrow | **Noop** `NoopEscrowAdapter` |

---

## SDK Exports

```tsx
import {
  // Types
  IReputationAdapter,
  IEscrowAdapter,
  ReputationResult,
  VranConfigResult,
  ReportResult,
  MilestoneDef,
  EscrowResult,
  TxHookResult,
  ModuleInfo,
  ReputationModule,
  EscrowModule,

  // Defaults
  DefaultReputationAdapter,
  DefaultEscrowAdapter,

  // No-ops (disable features)
  NoopReputationAdapter,
  NoopEscrowAdapter,

  // Composite (Platform × VRAN blend)
  CompositeReputationAdapter,
  PlatformEscrowAdapter,
  createCompositeIntegration,

  // Fallback chain
  FallbackReputationAdapter,
  FallbackEscrowAdapter,
  createFallbackReputation,
  createFallbackEscrow,

  // Middleware (logging, retry, timeout)
  withMiddlewareReputation,
  withMiddlewareEscrow,

  // Escrow Hooks
  useUserEscrows,
  useCreateEscrow,
  useSubmitMilestone,
  useReleaseMilestone,
  useDisputeEscrow,
  useResolveRefund,
  useAutoRefund,
} from 'payid-react';
```

---

## Escrow Hooks (Source-Based Routing)

Escrow hooks use the same 3-tier resolution as reputation hooks: **injected** → **contract** → **noop**.

```tsx
import { useUserEscrows, useCreateEscrow, useReleaseMilestone } from 'payid-react';

function EscrowPage() {
  const { escrows, isLoading } = useUserEscrows();
  const { createEscrow, isPending } = useCreateEscrow();
  const { releaseMilestone } = useReleaseMilestone();

  return (
    <div>
      {isLoading ? 'Loading...' : escrows.map(e => (
        <EscrowCard
          key={String(e.id)}
          escrow={e}
          onRelease={(index) => releaseMilestone(e.id, index)}
        />
      ))}
      <button
        onClick={() => createEscrow(freelancer, asset, milestones, deadline, value)}
        disabled={isPending}
      >
        Create Escrow
      </button>
    </div>
  );
}
```

| Hook | Injected Path | Contract Path |
|------|---------------|---------------|
| `useUserEscrows({ user? })` | `adapter.getUserEscrows()` via `useQuery` | Iterate contract `escrows` mapping via `useQuery` + `usePublicClient` |
| `useCreateEscrow()` | `adapter.createEscrow()` via `useMutation` | wagmi `useWriteContract` → `createEscrow` |
| `useSubmitMilestone()` | `adapter.submitMilestone()` via `useMutation` | wagmi `useWriteContract` → `submitMilestone` |
| `useReleaseMilestone()` | `adapter.releaseMilestone()` via `useMutation` | wagmi `useWriteContract` → `releaseMilestone` |
| `useDisputeEscrow()` | `adapter.dispute()` via `useMutation` | wagmi `useWriteContract` → `dispute` |
| `useResolveRefund()` | `adapter.resolveRefund()` via `useMutation` | wagmi `useWriteContract` → `resolveRefund` |
| `useAutoRefund()` | `adapter.autoRefund()` via `useMutation` | wagmi `useWriteContract` → `autoRefund` |

---

## Next Steps

- **[React Integration →](./react-integration)** — How to set up `PayIDProvider` in your app
- **[VRAN Reputation →](./vran-reputation)** — Using PAY.ID's built-in reputation system
- **[SDK Reference →](../api/sdk-reference)** — Complete API documentation
