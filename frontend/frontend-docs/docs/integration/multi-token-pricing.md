# Multi-Token Pricing

PAY.ID supports USD-equivalent pricing across multiple tokens, allowing rules to check payment values in USD regardless of the token used.

## Overview

Instead of checking raw token amounts (which vary by token decimals), you can now check the USD equivalent of any payment. This enables:

- **USD-based spending limits** - e.g., "Max $35 per payment" regardless of whether it's USDC, USDT, or ETH
- **Multi-token minimum thresholds** - e.g., "Minimum $10 payment" across all supported tokens
- **Cross-token daily limits** - e.g., "Daily limit of $1000 across all tokens"

## Supported Tokens

Currently supported via Chainlink Price Feeds:
- **USDC/USD** - Circle USD Coin
- **USDT/USD** - Tether USD
- **DAI/USD** - MakerDAO
- **WBTC/USD** - Wrapped Bitcoin
- **LINK/USD** - Chainlink
- **UNI/USD** - Uniswap
- **ETH/USD** - Native Ethereum

## How It Works (Hybrid Approach)

PAY.ID uses a **hybrid** off-chain + on-chain model for USD value rules:

1. **Off-chain**: SDK fetches Chainlink price → computes `oracle.txValueUsd` → WASM rule engine evaluates
2. **On-chain**: `PayWithPayID.payERC20WithOracleGuard` spot-checks the same math as defense-in-depth

### 1. Token Price Oracles

PAY.ID uses Chainlink Price Feeds to get real-time token prices in USD:

```typescript
import { TOKEN_PRICE_ORACLES } from '@/constants/oracles';

const usdcPriceOracle = TOKEN_PRICE_ORACLES[chainId]['USDC/USD'];
const usdtPriceOracle = TOKEN_PRICE_ORACLES[chainId]['USDT/USD'];
```

### 2. USD Equivalent Calculation

The USD equivalent is calculated using the formula:

```
txValueUsd = (tokenAmount × tokenPrice) / (10^tokenDecimals × 10^8)
```

Where:
- `tokenAmount`: Raw token amount in token units
- `tokenPrice`: Token price in USD (8 decimals, Chainlink standard)
- `tokenDecimals`: Token decimals (e.g., 6 for USDC, 18 for ETH)

SDK helper:

```typescript
import { computeTxValueUsd } from 'payid';

const txValueUsd = computeTxValueUsd(amount, decimals, priceInUsd); // 8-decimal USD
```

### 3. Context Extension

The computed value is injected into the `oracle` namespace before rule evaluation:

```typescript
interface OracleContext {
  txValueUsd: string;        // USD equivalent (8 decimals)
  txValueUsdFormatted: string; // e.g. "$45.00"
  tokenPrice: string;          // Raw oracle price
}
```

## Usage Examples

### Example 1: USD-Based Spending Limit

Create a rule that limits payments to $35 USD regardless of token:

```json
{
  "if": {
    "field": "oracle.txValueUsd",
    "op": "<=",
    "value": 3500000000
  },
  "message": "Payment exceeds $35 USD limit"
}
```

**What this means:**
- 35 USDC = $35 USD ✅
- 0.01 ETH (at $3500) = $35 USD ✅
- 35 USDT = $35 USD ✅
- 100 USDC = $100 USD ❌ (rejected)

### Example 2: Multi-Token Minimum Threshold

Require minimum $10 USD payment:

```json
{
  "if": {
    "field": "oracle.txValueUsd",
    "op": ">=",
    "value": 1000000000
  },
  "message": "Payment below $10 USD minimum"
}
```

### Example 3: Cross-Token $45 Minimum

The classic "send any token but min $45" rule:

```json
{
  "id": "cross_token_min_45",
  "if": {
    "field": "oracle.txValueUsd",
    "op": ">=",
    "value": 4500000000
  },
  "message": "Min $45 required. You sent ${oracle.txValueUsd|div:100000000} USD-worth of {tx.asset}"
}
```

## Frontend Integration (usePayIDFlow)

`usePayIDFlow` automatically injects `oracle.txValueUsd` when you pass `tokenPriceOracle` and `tokenDecimals`:

```typescript
import { usePayIDFlow } from 'payid-react';

const { execute } = usePayIDFlow();

await execute({
  receiver: '0xReceiver...',
  asset: '0xUSDC...',
  amount: 50_000_000n, // 50 USDC (6 decimals)
  payId: 'pay.id/alice',
  tokenDecimals: 6,
  tokenPriceOracle: '0x...', // Chainlink USDC/USD feed
  minUsdValue: 45_00000000n, // optional: on-chain guard
});
```

### With Token Config Helper

```typescript
import { getTokenConfig, getTokenPriceOracle } from '@/constants/tokens';

const token = getTokenConfig(chainId, 'USDC');
const oracle = getTokenPriceOracle(chainId, 'USDC');

await execute({
  receiver: '0x...',
  asset: token.address,
  amount: parseUnits('50', token.decimals),
  payId: 'pay.id/alice',
  tokenDecimals: token.decimals,
  tokenPriceOracle: oracle,
  minUsdValue: 45_00000000n,
});
```

## On-Chain Oracle Guard

For defense-in-depth, `PayWithPayID` includes `payERC20WithOracleGuard`:

```solidity
function payERC20WithOracleGuard(
  Decision calldata d,
  bytes calldata sig,
  bytes32[] calldata attestationUIDs,
  address tokenPriceOracle,
  uint256 minUsdValue,   // 8 decimals
  uint8 tokenDecimals
) external;
```

If `tokenPriceOracle` is set and `minUsdValue > 0`, the contract:
1. Queries Chainlink `latestRoundData`
2. Computes `usdValue = (amount * price) / 10^(decimals + 8)`
3. Reverts with `BELOW_USD_MINIMUM` if under threshold

## SDK Helpers

```typescript
import { computeTxValueUsd, formatUsdValue } from 'payid';

const usdValue = computeTxValueUsd(
  1_000_000n,    // 1 USDC
  6,             // USDC decimals
  100_000_000n   // $1.00 price (8 decimals)
); // → 100_000_000n ($1.00)

formatUsdValue(usdValue); // "$1.00"
```

## Oracle Addresses

Oracle addresses are configured per chain in `@/constants/oracles.ts`:

```typescript
export const TOKEN_PRICE_ORACLES: Record<number, Record<string, `0x${string}`>> = {
  1: {
    'USDC/USD': '0x8fFfF9545Ff14a92c8329c339F71d3f3Ea8eD444', // Mainnet
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', // Mainnet
    'DAI/USD': '0xAed0c38402a5d19df6E4c03f4322c2963490d050', // Mainnet
    'WBTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // Mainnet
    'LINK/USD': '0x2c1d072e956AFFc0D435Cb7D389FaE8fC5B9cB2D', // Mainnet
    'UNI/USD': '0xD71eCFF9422D8057F9692e8DdA2B7549aCf96663', // Mainnet
  },
  11155111: {
    'USDC/USD': '0xA2F78d2358df4E29c589B9C1Ada1ddc062c1Ec4e', // Sepolia
    'USDT/USD': '0x20955D69f13E1e2c3c1f9BfF2Ad5C807485A4f0e', // Sepolia
    'DAI/USD': '0x14866185B1962A69b940F2c2953A6C3747525b43', // Sepolia
    'WBTC/USD': '0x7e87009ceF4D986fC2719BfF2adEA5565dfB9C56', // Sepolia
    'LINK/USD': '0xc59E36313BAa28Cf64E2863425DCc5b33Ae4C8f3', // Sepolia
    'UNI/USD': '0xD71eCFF9422D8057F9692e8DdA2B7549aCf96663', // Sepolia
  },
  31337: {
    'USDC/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'USDT/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'DAI/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'WBTC/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'LINK/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'UNI/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
  },
};
```

## Notes

- USD values are stored with **8 decimals** (Chainlink standard)
- Rule engine uses `oracle.txValueUsd` (not `tx.amountUsd`)
- `usePayIDFlow` auto-injects oracle context when `tokenPriceOracle` is provided
- On-chain guard (`payERC20WithOracleGuard`) requires contract redeployment
- Fallback to mock addresses on localhost for development
