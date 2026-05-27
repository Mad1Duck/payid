---
id: advanced-usage
title: Advanced Usage
sidebar_label: Advanced Usage
sidebar_position: 4
slug: /advanced-usage
---

# Advanced Usage 🚀

Level up your PAY.ID game! These are the pro patterns for production-grade integrations.

New to PAY.ID? Start with [Simple Usage →](./simple-usage) first.

---

## 1️⃣ Complex Rule Patterns

### Nested Rules (VIP vs Normal Paths) 🎯

Create different payment paths for different user types:

```tsx
const VIP_RULE = {
  id: 'vip_or_normal',
  logic: 'OR' as const,
  rules: [
    {
      // VIP path: high amount + KYC3 + low risk
      id: 'vip_path',
      logic: 'AND' as const,
      rules: [
        { if: { field: 'tx.amount', op: '>=', value: '1000000000' } },  // >= 1000 USDC
        { if: { field: 'oracle.kycLevel', op: '==', value: '3' } },
        { if: { field: 'risk.score', op: '<=', value: '30' } },
      ],
    },
    {
      // Normal path: 5-500 USDC + ID + KYC1 + moderate risk
      id: 'normal_path',
      logic: 'AND' as const,
      rules: [
        { if: { field: 'tx.amount', op: 'between', value: ['5000000', '500000000'] } },  // 5-500 USDC
        { if: { field: 'oracle.country', op: '==', value: 'ID' } },
        { if: { field: 'oracle.kycLevel', op: '>=', value: '1' } },
        { if: { field: 'risk.score', op: '<=', value: '70' } },
      ],
    },
  ],
}
```

**What this does:** VIP users can send big amounts (1000+ USDC) if they have KYC3 and low risk. Normal users have smaller limits (5-500 USDC) with relaxed requirements. Smart, right?

---

### Time-Based Rules (Business Hours) ⏰

Only allow payments during work hours:

```tsx
const BUSINESS_HOURS_RULE = {
  id: 'business_hours',
  if: {
    field: 'env.timestamp',
    op: 'between',
    value: ['9:00', '17:00'],
    transform: 'hour',
  },
  message: 'Payments only allowed during business hours (9 AM - 5 PM)',
}
```

---

### Weekday-Only Rule 📅

No weekend payments:

```tsx
const WEEKDAY_RULE = {
  id: 'weekday_only',
  if: {
    field: 'env.timestamp',
    op: 'in',
    value: [1, 2, 3, 4, 5],  // Mon-Fri
    transform: 'day',
  },
  message: 'Payments only allowed on weekdays',
}
```

---

### Cross-Field Validation (Daily Limit) 💰

Track spending across all payments:

```tsx
const DAILY_LIMIT_RULE = {
  id: 'daily_limit',
  if: {
    field: 'tx.amount',
    op: '<=',
    value: '$state.dailyLimit',
  },
  message: 'Exceeds daily spending limit',
}
```

---

## 2️⃣ Attestation-Gated Payments (EAS) 🔐

Require EAS attestations before payment — perfect for KYC requirements:

```tsx
// Server-side with Context V2
import { buildContextV2 } from 'payid/context'

const contextV2 = await buildContextV2({
  baseContext: {
    tx: { sender: payer, receiver: merchant, asset: USDC, amount: '50000000', chainId: 1 },
  },
  oracle: {
    issuer: oracleSigner,
    data: {
      kycLevel: '2',
      attestationUID: '0xabc123...',  // EAS attestation UID
    },
  },
})

// Rule checks for attestation
const ATTESTATION_RULE = {
  id: 'kyc_attestation',
  if: { field: 'oracle.attestationUID', op: 'exists' },
  message: 'KYC attestation required',
}

// Payment requires attestationUIDs
await payid.evaluateAndProve({
  context: contextV2,
  authorityRule: ATTESTATION_RULE,
  attestationUIDs: ['0xabc123...'],
  // ... other params
})
```

On-chain verification happens automatically via `PayIDVerifier.requireAllowed()` — pretty cool, right?

---

## 3️⃣ Context V2 with Server-Signed Data 📝

### Complete Context V2 Structure

Here's the full Context V2 structure with all the bells and whistles:

```ts
import { buildContextV2 } from 'payid/context'

const contextV2 = await buildContextV2({
  baseContext: {
    tx: { sender, receiver, asset, amount, chainId },
  },
  // Environment timestamp signed by server
  env: {
    issuer: envSigner,
    data: { timestamp: Math.floor(Date.now() / 1000) },
  },
  // State tracking (spending limits)
  state: {
    issuer: stateSigner,
    data: {
      spentToday: '150000000',  // 150 USDC spent today
      dailyLimit: '500000000',  // 500 USDC daily limit
      period: 'DAY',
    },
  },
  // External oracle data (KYC, country, etc.)
  oracle: {
    issuer: oracleSigner,
    data: {
      kycLevel: '2',
      country: 'ID',
      riskScore: '25',
    },
  },
  // Risk scoring
  risk: {
    issuer: riskSigner,
    data: {
      score: 25,
      category: 'LOW',
      modelHash: '0x123...',
    },
  },
})
```

### Trusted Issuers Setup 🔑

Tell PAY.ID which signers you trust:

```ts
const payid = createPayIDServer({
  signer: serverSigner,
  trustedIssuers: new Set([
    '0xEnvSignerAddress...',
    '0xStateSignerAddress...',
    '0xOracleSignerAddress...',
    '0xRiskSignerAddress...',
  ]),
})
```

---

## 4️⃣ Session Policies (QR Codes) 📱

### Generate Session Policy

Create a payment policy that customers can scan:

```tsx
import { createSessionPolicyV2, encodeSessionPolicyV2QR } from 'payid/sessionPolicy'

const policy = await createSessionPolicyV2({
  receiver: merchantAddress,
  ruleSetHash: activeRuleSetHash,
  ruleAuthority: COMBINED_RULE_STORAGE,
  allowedAsset: USDC_ADDRESS,
  maxAmount: parseUnits('100', 6),  // Max 100 USDC per scan
  expiresAt: Math.floor(Date.now() / 1000) + 3600,  // Valid 1 hour
  payId: 'pay.id/my-shop',
  chainId: 31337,
  verifyingContract: PAYID_VERIFIER,
  signer: merchantSigner,
})

const qrString = encodeSessionPolicyV2QR(policy)
// → "payid-v2:eyJ2ZXJzaW9uIjoicGF5aWQuc2Vzc2lvbi5wb2xpY3kudjIi..."
```

### Decode and Use Session Policy

When someone scans your QR, decode it and use the policy:

```ts
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'

const policy = decodeSessionPolicyV2QR(scannedQRString)

// Use with usePayIDFlow
execute({
  receiver: policy.receiver as `0x${string}`,
  asset: policy.allowedAsset as `0x${string}`,
  amount: BigInt(policy.maxAmount),
  payId: policy.payId,
  sessionPolicyV2: policy,  // Pass session policy
})
```

---

## 5️⃣ ERC-4337 Account Abstraction 🦊

### Build UserOperation from Proof

Use PAY.ID with smart contract wallets:

```ts
import { createPayIDServer } from 'payid/server'

const payid = createPayIDServer({ signer: bundlerSigner })

const { proof } = await payid.evaluateAndProve({ /* ... */ })

// Build ERC-4337 UserOperation
const userOp = await payid.buildUserOperation({
  targetContract: PAY_WITH_PAYID,
  proof,
  attestationUIDs: [],
  sender: smartAccountAddress,
  nonce: 0n,
})

// Send to bundler
await bundler.sendUserOperation(userOp)
```

---

## 6️⃣ Custom State Tracking 📊

### Track Spending Limits

Keep track of how much users spend on your server:

```tsx
// Server maintains state
const userState = {
  spentToday: 0n,
  dailyLimit: 500_000_000n,  // 500 USDC
  period: new Date().toISOString().slice(0, 10),  // YYYY-MM-DD
}

// On each payment
userState.spentToday += amount

// Sign and include in context
const stateContext = await signState(userState, stateSigner)

const contextV2 = await buildContextV2({
  baseContext: { tx: { /* ... */ } },
  state: { issuer: stateSigner, data: userState },
})
```

### Rule Enforces Limit

The rule checks the state and blocks overspending:

```tsx
const DAILY_LIMIT_RULE = {
  id: 'daily_limit',
  logic: 'AND' as const,
  rules: [
    { if: { field: 'state.spentToday', op: '<=', value: '$state.dailyLimit' } },
    { if: { field: 'state.period', op: '==', value: new Date().toISOString().slice(0, 10) } },
  ],
}
```

---

## 7️⃣ Risk Scoring Integration 🎯

### Risk-Based Payment Limits

Adjust payment limits based on user risk score:

```tsx
const RISK_BASED_RULE = {
  id: 'risk_limits',
  logic: 'OR' as const,
  rules: [
    {
      // Low risk: up to 1000 USDC
      id: 'low_risk',
      logic: 'AND' as const,
      rules: [
        { if: { field: 'risk.score', op: '<=', value: '30' } },
        { if: { field: 'tx.amount', op: '<=', value: '1000000000' } },
      ],
    },
    {
      // Medium risk: up to 100 USDC
      id: 'medium_risk',
      logic: 'AND' as const,
      rules: [
        { if: { field: 'risk.score', op: 'between', value: ['31', '70'] } },
        { if: { field: 'tx.amount', op: '<=', value: '100000000' } },
      ],
    },
    {
      // High risk: up to 10 USDC
      id: 'high_risk',
      logic: 'AND' as const,
      rules: [
        { if: { field: 'risk.score', op: '>', value: '70' } },
        { if: { field: 'tx.amount', op: '<=', value: '10000000' } },
      ],
    },
  ],
}
```

---

## 8️⃣ Directional Rules (INBOUND/OUTBOUND) ↔️

Have different rules for receiving vs sending:

```tsx
import { useActiveCombinedRuleByDirection } from 'payid-react'

// Get INBOUND rule (receiving payments)
const inboundPolicy = useActiveCombinedRuleByDirection(merchantAddress, 0)

// Get OUTBOUND rule (sending payments)
const outboundPolicy = useActiveCombinedRuleByDirection(userAddress, 1)

// Register directional rule
await registerCombinedRule({
  ruleSetHash: keccak256(toBytes('inbound-policy')),
  ruleNFTs: [ruleNFTAddress],
  tokenIds: [1n],
  version: 1n,
  direction: 0,  // INBOUND
})
```

---

## 9️⃣ DAO Payroll & Batch Payments 📦

### PayWithPayIDBatch (Smart Contract)

The `PayWithPayIDBatch` contract lets you pay multiple recipients in a **single transaction**, saving gas and ensuring atomicity:

```solidity
function batchPayETH(
    PayIDVerifier.Decision[] calldata decisions,
    bytes[] calldata sigs,
    bytes32[][] calldata attestationUIDs
) external payable
```

```tsx
import { usePayWithPayIDBatch } from './hooks/usePayWithPayIDBatch'

function BatchPayButton({
  recipients,
  decisions,
  sigs,
  attestationUIDs,
}: {
  recipients: { address: `0x${string}`; amount: bigint }[]
  decisions: any[]
  sigs: `0x${string}`[]
  attestationUIDs: `0x${string}`[][]
}) {
  const { batchPayNative, isPending } = usePayWithPayIDBatch()

  const totalValue = recipients.reduce((sum, r) => sum + r.amount, 0n)

  const handleBatchPay = async () => {
    await batchPayNative(decisions, sigs, attestationUIDs, totalValue)
  }

  return (
    <button onClick={handleBatchPay} disabled={isPending}>
      {isPending ? 'Batch Paying...' : `Pay ${recipients.length} Recipients`}
    </button>
  )
}
```

### DAO Payroll UI

The frontend provides a full DAO Payroll page at `/v4/app/payroll`:

- **Contributor List** — Add recipients with address, amount, role, and schedule (one-time / weekly / monthly)
- **Treasury Status** — Live balance check with "insufficient funds" warning
- **Simulation** — Pre-flight validation of addresses and balance before submitting
- **Batch Execution** — One-time batch payment via `PayWithPayIDBatch`
- **Recurring Subscriptions** — Create `RecurringPayments` subscriptions for scheduled payroll

```tsx
import { useDAOPayroll } from '@/features/dao-payroll/hooks/useDAOPayroll'

function PayrollPage() {
  const {
    recipients,
    addRecipient,
    removeRecipient,
    simulate,
    createSubscriptions,
    executeBatchPayment,
    isCreating,
    isBatching,
    simulationResult,
    totalPayroll,
    isSufficient,
  } = useDAOPayroll()

  // Add a contributor
  addRecipient() // uses form state: newAddress, newAmount, newRole, newSchedule

  // Run simulation
  simulate()

  // Execute based on schedule type
  if (schedule === 'one-time') {
    await executeBatchPayment(decisions, sigs, attestationUIDs)
  } else {
    await createSubscriptions() // weekly / monthly via RecurringPayments
  }
}
```

---

## 🔟 Time-Lock Vesting ⏳

Create token vesting schedules with cliff and linear release. Perfect for team allocations, investor locks, and contributor grants.

### Smart Contract: TimeLockVesting

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
) external payable returns (uint256 scheduleId)

function release(uint256 scheduleId) external

function revoke(uint256 scheduleId) external
```

### Frontend Usage

```tsx
import { useTimeLockVesting } from '@/features/shared/hooks/useTimeLockVesting'

function VestingManager() {
  const vesting = useTimeLockVesting()

  // Create a 6-month cliff, 12-month total vesting schedule
  const create = async () => {
    const now = Math.floor(Date.now() / 1000)
    const cliff = 180 * 24 * 60 * 60 // 180 days
    const duration = 365 * 24 * 60 * 60 // 365 days

    await vesting.createSchedule(
      beneficiaryAddress,
      '0x0000000000000000000000000000000000000000', // ETH
      parseUnits('1000', 18), // 1000 ETH
      BigInt(now),
      BigInt(cliff),
      BigInt(duration),
      true, // revocable
      revokerAddress,
      parseUnits('1000', 18) // send full amount to contract
    )
  }

  // Beneficiary releases vested tokens
  const release = async (scheduleId: bigint) => {
    await vesting.release(scheduleId)
  }

  // Revoker cancels remaining unvested tokens
  const revoke = async (scheduleId: bigint) => {
    await vesting.revoke(scheduleId)
  }
}
```

### Vesting Page UI

Route: `/v4/app/vesting`

- **Create Schedule** — Set beneficiary, amount, cliff (months), duration (months), revocable flag
- **My Schedules** — List of schedules where user is beneficiary or revoker
- **Progress Tracking** — Visual progress bar showing cliff / vesting / fully vested status
- **Release Button** — Available when vested > released
- **Revoke Button** — Available for revoker on revocable schedules

---

## 1️⃣1️⃣ Multi-Chain Deployment 🌐

### Configure Multiple Chains

Deploy across multiple networks:

```tsx
import { hardhat, polygon, base, mainnet } from 'wagmi/chains'

const wagmiConfig = createConfig({
  chains: [hardhat, polygon, base, mainnet],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [polygon.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
})

const CONTRACT_ADDRESSES = {
  [hardhat.id]: { /* localhost addresses */ },
  [polygon.id]: { /* polygon addresses */ },
  [base.id]: { /* base addresses */ },
  [mainnet.id]: { /* mainnet addresses */ },
}
```

### Chain-Specific Rules

Different chains, different rules:

```tsx
const chainId = useChainId()

// Different rules per chain
const RULES_BY_CHAIN = {
  1: ETHEREUM_RULES,      // Mainnet rules
  137: POLYGON_RULES,     // Polygon rules
  8453: BASE_RULES,       // Base rules
  31337: DEV_RULES,       // Localhost rules
}

const activeRules = RULES_BY_CHAIN[chainId] || DEFAULT_RULES
```

---

## 1️⃣2️⃣ Error Handling & Retry Logic 🔄

Don't let network errors ruin the experience — retry automatically:

```tsx
const { execute, status, error, reset } = usePayIDFlow()

const handlePayWithRetry = async () => {
  let retries = 3
  while (retries > 0) {
    try {
      await execute({ receiver, asset, amount, payId })
      break  // Success
    } catch (e) {
      retries--
      if (retries === 0) throw e
      await new Promise(r => setTimeout(r, 1000))  // Wait 1s
      reset()
    }
  }
}
```

---

## 1️⃣3️⃣ Subscription Management 💳

### Extend Rule Expiry

Keep your rules active by renewing:

```tsx
import { useExtendRuleExpiry } from 'payid-react'

function RenewRule({ tokenId }: { tokenId: bigint }) {
  const { extendRuleExpiry, isPending } = useExtendRuleExpiry()

  const handleRenew = () => {
    extendRuleExpiry({
      tokenId,
      newExpiry: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),  // +30 days
      priceInWei: 100_000_000_000_000n,  // 0.0001 ETH
    })
  }

  return <button onClick={handleRenew} disabled={isPending}>Renew 30 Days</button>
}
```

### Check Subscription Status

Show users their subscription info:

```tsx
import { useSubscription } from 'payid-react'

function SubscriptionBadge() {
  const { address } = useAccount()
  const { data: sub } = useSubscription(address)

  if (!sub?.isActive) {
    return <span style={{ color: 'red' }}>⚠️ Subscription Expired</span>
  }

  const daysLeft = Math.floor((Number(sub.expiry) - Date.now() / 1000) / 86400)

  return (
    <span>
      ✅ {sub.logicalRuleCount}/{sub.maxSlots} slots • {daysLeft} days left
    </span>
  )
}
```

---

## 1️⃣4️⃣ Custom IPFS Gateway 🌐

```tsx
<PayIDProvider
  contracts={CONTRACT_ADDRESSES}
  ipfsGateway="https://my-custom-ipfs-gateway.com/ipfs/"
>
  <App />
</PayIDProvider>
```

---

## 1️⃣5️⃣ Decision Proof Verification ✅

Verify a proof on-chain:

```tsx
import { useVerifyDecision } from 'payid-react'

function VerifyProof({ decision, signature }: { decision: any, signature: string }) {
  const { data: isValid, isLoading } = useVerifyDecision(decision, signature)

  if (isLoading) return <p>Verifying...</p>

  return <p>{isValid ? '✅ Valid Proof' : '❌ Invalid Proof'}</p>
}
```

---

## 1️⃣6️⃣ Nonce Management 🔒

Check if a nonce was already used (prevents replay attacks):

```tsx
import { useNonceUsed } from 'payid-react'

function CheckNonce({ payer, nonce }: { payer: `0x${string}`, nonce: string }) {
  const { data: used } = useNonceUsed(payer, nonce)

  if (used) {
    return <p style={{ color: 'red' }}>⚠️ Nonce already used - possible replay attack</p>
  }

  return <p>✅ Nonce is fresh</p>
}
```

---

## 1️⃣6️⃣ Plug-and-Play Adapters 🔌

PAY.ID supports **custom reputation and escrow adapters**, allowing platforms with their own on-chain systems (e.g. **any platform's milestone manager + reputation contract**) to integrate seamlessly without duplicating features.

### How It Works

| Component | PAY.ID Default | Platform Override |
|-----------|---------------|-------------------|
| Reputation | `VindexRegistry` | `IReputationAdapter` |
| Escrow | `EscrowMilestone` | `IEscrowAdapter` |

When an adapter is injected, PAY.ID hooks automatically route to it. When omitted, hooks fall back to native contract calls. Pass a **noop adapter** to completely disable a feature.

### Inject Custom Adapters

```tsx
import {
  PayIDProvider,
  NoopReputationAdapter,   // disable PAY.ID reputation
  NoopEscrowAdapter,       // disable PAY.ID escrow
} from 'payid-react';

// Platform with its own reputation + escrow
function YourApp() {
  return (
    <PayIDProvider
      contracts={YOUR_PAYID_CONTRACTS}
      reputationAdapter={NoopReputationAdapter}  // hide VRAN UI
      escrowAdapter={NoopEscrowAdapter}          // hide Escrow UI
    >
      <App />
    </PayIDProvider>
  );
}
```

### Build Your Own Adapter

```tsx
import type { IReputationAdapter, ReputationResult } from 'payid-react';

class YourPlatformReputationAdapter implements IReputationAdapter {
  readonly name = 'your-platform';
  readonly label = 'Your Platform Reputation';

  async getReputation(target: `0x${string}`): Promise<ReputationResult> {
    // Call your platform's reputation contract
    const score = await platform.reputation.getScore(target);
    return { score, isBlacklisted: score < 100, isTrusted: score >= 700 };
  }

  async getConfig() {
    return { minStake: parseEther('0.01'), consensusThreshold: 3n, minReporterReputation: 700n };
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

### Feature Flags in UI

```tsx
import { usePayIDContext } from 'payid-react';

function AppLayout() {
  const { features } = usePayIDContext();

  return (
    <nav>
      {features.reputation && <Link to="/reputation">Reputation</Link>}
      {features.escrow && <Link to="/escrow">Escrow</Link>}
      {/* Always show core features */}
      <Link to="/send">Send</Link>
      <Link to="/receive">Receive</Link>
    </nav>
  );
}
```

**Key principle:** PAY.ID core (rules, payments, proofs) is always active. Optional modules (reputation, escrow) are **opt-in via adapter injection**.

---

## Advanced Patterns Summary 📚

| Pattern | Use Case |
|---|---|
| **Nested Rules** | VIP vs normal payment paths |
| **Time-Based Rules** | Business hours, weekday-only |
| **Attestation-Gated** | KYC-required payments |
| **Context V2** | Server-signed oracle data |
| **Session Policies** | QR code payments |
| **ERC-4337** | Account abstraction |
| **State Tracking** | Spending limits |
| **Risk Scoring** | Dynamic limits based on risk |
| **Directional Rules** | Separate INBOUND/OUTBOUND policies |
| **DAO Payroll** | Batch + recurring contributor payments |
| **Time-Lock Vesting** | Cliff + linear release schedules |
| **Plug-and-Play Adapters** | Integrate platform-specific reputation/escrow |
| **Multi-Chain** | Deploy across networks |
| **Retry Logic** | Handle transient failures |
| **Subscription** | Rule slot management |

---

## Next Steps 🎯

- **[Rule Basics →](./rules/rule-basics)** — Deep dive into rule engine
- **[SDK Reference →](./api/sdk-reference)** — Complete API documentation
- **[Examples →](./examples/)** — Full code examples
- **[Architecture →](../docs/architecture.md)** — System design deep dive

---

You're now a PAY.ID pro! 🎉
