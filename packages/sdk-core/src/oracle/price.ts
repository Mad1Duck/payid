/**
 * Compute USD equivalent of a token amount from a Chainlink-style price feed.
 *
 * @param amount      Raw token amount (in token's smallest unit, e.g. wei for ETH, micro-USDC)
 * @param decimals    Token decimals (e.g. 18 for ETH, 6 for USDC)
 * @param priceInUsd  Price from oracle in USD with 8 decimals (e.g. 350000000000 = $3500.00)
 * @returns USD value with 8 decimals
 *
 * @example
 *   computeTxValueUsd(1_000_000n, 6, 100000000n)  // 1 USDC @ $1.00 → 100000000n ($1.00)
 *   computeTxValueUsd(1000000000000000000n, 18, 350000000000n) // 1 ETH @ $3500 → 35000000000000000000n ($3500.00)
 */
export function computeTxValueUsd(
  amount: bigint,
  decimals: number,
  priceInUsd: bigint,
): bigint {
  if (amount === 0n || priceInUsd === 0n) return 0n;
  // (amount * price) / (10^decimals * 10^8)  →  result in 8-decimal USD
  const denominator = 10n ** BigInt(decimals + 8);
  return (amount * priceInUsd) / denominator;
}

/**
 * Format a USD value (8 decimals) to human-readable string.
 *
 * @param usdValue  USD amount with 8 decimals
 * @returns Formatted string like "$45.00"
 */
export function formatUsdValue(usdValue: bigint): string {
  const value = Number(usdValue) / 1e8;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Minimal Chainlink AggregatorV3 ABI for fetching price off-chain.
 */
export const CHAINLINK_AGGREGATOR_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const;
