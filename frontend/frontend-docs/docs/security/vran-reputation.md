---
id: vran-reputation
title: VRAN — Reputation & Anti-Scam
sidebar_label: VRAN Reputation
---

# 🛡️ VRAN (Vindex Reputation & Anti-Scam Network)

VRAN is a decentralized trust layer that adds a **reputation dimension** to PAY.ID payments. It lets you check if a merchant or payer is trustworthy before completing a transaction.

---

## How It Works

| Component | Role |
|-----------|------|
| **VindexRegistry** | On-chain contract storing reputation scores and blacklist |
| **SentinelApp** | Community reporting interface (off-chain) |
| **ReputationEngine** | AI-driven pattern analysis (off-chain) |
| **EAS Bridge** | Attestation integration for verified identities |

```
User ──▶ Check Reputation ──▶ VindexRegistry ──▶ Score / Blacklist?
                                          │
                                          ▼
                                   Report (stake + evidence)
```

---

## Reputation Score

- **Range:** 0 – 1000
- **Default:** 500 (neutral)
- **Auto-blacklist:** When score drops below 100

```typescript
const { score, isBlacklisted, isTrusted } = useReputation({
  registryAddress: '0xVindexRegistry...',
  target: merchantAddress,
});

// isTrusted = !isBlacklisted && score >= 700
```

---

## React Hooks

### `useReputation`

```typescript
import { useReputation } from 'payid-react';

function MerchantCard({ address }: { address: string }) {
  const { data, isLoading } = useReputation({
    registryAddress: '0x...',
    target: address as `0x${string}`,
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <p>Score: {data?.score ?? 500}/1000</p>
      {data?.isBlacklisted && <Badge color="red">Blacklisted</Badge>}
      {data?.isTrusted && <Badge color="green">Trusted</Badge>}
    </div>
  );
}
```

### `useCanReport`

```typescript
import { useCanReport } from 'payid-react';

function ReportButton() {
  const { canReport } = useCanReport({ registryAddress: '0x...' });
  return (
    <button disabled={!canReport}>
      Report Scam
    </button>
  );
}
```

---

## Smart Contract: VindexRegistry

### Key Functions

```solidity
// View reputation (default 500)
function getReputation(address account) external view returns (uint16);

// Check blacklist
function isBlacklisted(address account) external view returns (bool);

// Check if trusted (not blacklisted + score >= threshold)
function isTrusted(address account, uint16 threshold) external view returns (bool);

// Submit staked report with evidence hash
function submitReport(address target, string calldata evidenceHash) external payable;

// Confirm a report (requires minReporterReputation)
function confirmReport(uint256 reportId) external;

// Admin / Engine resolve
function resolveReport(uint256 reportId, bool valid) external;

// Slash false reporter
function slashReporter(uint256 reportId) external;
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minStake` | 0.001 ETH | Minimum stake to submit a report |
| `consensusThreshold` | 3 | Unique high-reputation confirmations needed |
| `minReporterReputation` | 700 | Minimum reputation to count as a valid confirmer |

---

## ScamReportPage UI

The frontend provides a 3-step reporting wizard at `/v4/app/reputation/report`:

1. **Upload Evidence** — Drag or click to select a file (PDF, image, or text). Uploaded to **Pinata IPFS v3** (`uploads.pinata.cloud/v3/files`).
2. **Target Address** — Enter the 0x address being reported.
3. **Stake & Submit** — Enter ETH stake (must be ≥ `minStake`), review summary, and submit on-chain.

### IPFS Upload Configuration

Set your Pinata JWT in `.env`:

```bash
VITE_PINATA_JWT=your_pinata_jwt_here
```

Get your JWT at [https://app.pinata.cloud/developers/api-keys](https://app.pinata.cloud/developers/api-keys).

Without a valid JWT, the upload step will show an error: `VITE_PINATA_JWT not configured`.

### Navigation

The **Report Address** and **Confirm Report** buttons on the Reputation page use `<Link>` from `@tanstack/react-router` for SPA navigation (no full page reload).

## Reporting Flow

1. **Reporter** submits report with `msg.value >= minStake` + evidence hash (IPFS/Arweave CID)
2. **Sentinels** (users with rep ≥ 700) confirm the report
3. When confirmations reach `consensusThreshold`, report auto-resolves as **valid**
4. **Target** loses reputation (penalty up to 200 points)
5. If target rep < 100 → auto-blacklisted

---

## Events

```solidity
event ReputationUpdated(address indexed account, uint16 oldScore, uint16 newScore, string reason);
event Blacklisted(address indexed account, uint256 reportId, string evidenceHash);
event Unblacklisted(address indexed account, string reason);
event ReportSubmitted(uint256 indexed reportId, address indexed target, address indexed reporter, string evidenceHash, uint256 stake);
event ReportResolved(uint256 indexed reportId, bool valid, uint16 reputationDelta);
```

---

## Integration with PAY.ID Payments

Gate payments by reputation before evaluation:

```typescript
import { useReputation } from 'payid-react';
import { usePayIDFlow } from 'payid-react';

function SafePayButton({ merchant }: { merchant: string }) {
  const { isBlacklisted } = useReputation({
    registryAddress: '0x...',
    target: merchant as `0x${string}`,
  });

  const { execute } = usePayIDFlow();

  if (isBlacklisted) {
    return <button disabled>🚫 Merchant Blacklisted</button>;
  }

  return <button onClick={() => execute({ ... })}>Pay</button>;
}
```

---

## Security Model

- **Fail-closed:** No reputation data = not trusted
- **Staked reporting:** False reports cost money (stake can be slashed)
- **Consensus:** Single reporter cannot blacklist someone; requires multiple high-reputation confirmations
- **Engine override:** AI/off-chain analysis can resolve reports manually
