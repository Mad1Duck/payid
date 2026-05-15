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

## How It Works

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
amountUsd = (tokenAmount × tokenPrice) / (10^tokenDecimals × 10^8)
```

Where:
- `tokenAmount`: Raw token amount in token units
- `tokenPrice`: Token price in USD (8 decimals, Chainlink standard)
- `tokenDecimals`: Token decimals (e.g., 6 for USDC, 18 for ETH)

### 3. Context Extension

The transaction context now includes an optional `amountUsd` field:

```typescript
interface TxContext {
  sender: string;
  receiver: string;
  asset: string;
  amount: string;
  amountUsd?: string; // USD equivalent (calculated from token price oracle)
  chainId: number;
  memo?: string;
}
```

## Usage Examples

### Example 1: USD-Based Spending Limit

Create a rule that limits payments to $35 USD regardless of token:

```json
{
  "if": {
    "field": "tx.amountUsd",
    "op": "<=",
    "value": 35000000
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
    "field": "tx.amountUsd",
    "op": ">=",
    "value": 10000000
  },
  "message": "Payment below $10 USD minimum"
}
```

### Example 3: Cross-Token Daily Limit

Track daily spending in USD across all tokens:

```json
{
  "logic": "AND",
  "conditions": [
    {
      "field": "tx.amountUsd",
      "op": "<=",
      "value": "$state.dailyUsdLimit"
    },
    {
      "field": "state.dailyUsdLimit",
      "op": "exists"
    }
  ],
  "message": "Payment exceeds daily USD limit of {state.dailyUsdLimit|div:1000000} USD"
}
```

## SDK Integration

### Issuing Token Price Context

Use the `issueTokenPriceContext` function to calculate USD equivalent with attestation:

```typescript
import { issuer } from 'payid';

const { amountUsd, proof } = await issuer.issueTokenPriceContext(
  wallet,
  tokenPrice,      // Token price in USD (8 decimals)
  tokenAmount,     // Raw token amount
  tokenDecimals    // Token decimals (6 for USDC, 18 for ETH)
);

// Use in your context
const context = {
  tx: {
    sender: '0x...',
    receiver: '0x...',
    asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    amount: '35000000', // 35 USDC (6 decimals)
    amountUsd: amountUsd, // USD equivalent
    chainId: 1
  }
};
```

### Frontend Example

```typescript
import { useReadContract } from 'wagmi';
import { TOKEN_PRICE_ORACLES, CHAINLINK_ORACLE_ABI } from '@/constants/oracles';

function MultiTokenPayment() {
  const chainId = useChainId();
  
  // Get USDC price from Chainlink
  const { data: usdcPrice } = useReadContract({
    address: TOKEN_PRICE_ORACLES[chainId]?.['USDC/USD'],
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
  });
  
  const priceInUsd = usdcPrice?.[1]; // 8 decimals
  
  // Calculate USD equivalent
  const tokenAmount = 35_000_000n; // 35 USDC (6 decimals)
  const amountUsd = (tokenAmount * priceInUsd) / (10n ** 14n); // 6 + 8 decimals
  
  return (
    <div>
      <p>Token Amount: 35 USDC</p>
      <p>USD Equivalent: ${(Number(amountUsd) / 1e8).toFixed(2)}</p>
    </div>
  );
}
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

## Future Extensions

Planned support for:
- More major ERC20 tokens (AAVE, COMP, etc.)
- Non-EVM tokens (via cross-chain oracles)
- Custom token price feeds

## Notes

- USD values are stored with 8 decimals (Chainlink standard)
- Token prices are fetched from Chainlink oracles on-chain
- Fallback to mock addresses on localhost for development
- Oracle data includes staleness checks (max 1 hour old)
