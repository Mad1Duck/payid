import { useReadContract, useChainId } from 'wagmi';
import { TOKEN_PRICE_ORACLES, CHAINLINK_ORACLE_ABI } from '@/constants/oracles';

/**
 * Hook to fetch token price from Chainlink oracle and calculate USD equivalent
 * 
 * @param tokenSymbol - Token symbol (e.g., 'USDC', 'USDT', 'ETH', 'DAI', 'WBTC', 'LINK', 'UNI')
 * @returns Token price data and USD equivalent calculation helper
 */
export function useTokenPrice(tokenSymbol: 'USDC' | 'USDT' | 'ETH' | 'DAI' | 'WBTC' | 'LINK' | 'UNI') {
  const chainId = useChainId();

  const { data: oracleData, isLoading, error } = useReadContract({
    address: TOKEN_PRICE_ORACLES[chainId]?.[`${tokenSymbol}/USD`],
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
    query: {
      enabled: !!TOKEN_PRICE_ORACLES[chainId]?.[`${tokenSymbol}/USD`],
    },
  });

  const priceInUsd = oracleData?.[1] as bigint | undefined; // 8 decimals
  const updatedAt = oracleData?.[3] as number | undefined;

  /**
   * Calculate USD equivalent from token amount
   * 
   * @param tokenAmount - Raw token amount in token units
   * @param tokenDecimals - Token decimals (e.g., 6 for USDC, 18 for ETH)
   * @returns USD equivalent (8 decimals)
   */
  const calculateUsdEquivalent = (tokenAmount: bigint, tokenDecimals: number): bigint => {
    if (!priceInUsd) return 0n;
    return (tokenAmount * priceInUsd) / (10n ** BigInt(tokenDecimals + 8));
  };

  /**
   * Format USD value for display
   * 
   * @param amountUsd - USD amount (8 decimals)
   * @returns Formatted string (e.g., "$35.00")
   */
  const formatUsd = (amountUsd: bigint): string => {
    const usdValue = Number(amountUsd) / 1e8;
    return `$${usdValue.toFixed(2)}`;
  };

  return {
    priceInUsd,
    updatedAt,
    isLoading,
    error,
    calculateUsdEquivalent,
    formatUsd,
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * function PaymentExample() {
 *   const { priceInUsd, calculateUsdEquivalent, formatUsd } = useTokenPrice('USDC')
 *   
 *   const tokenAmount = 35_000_000n // 35 USDC (6 decimals)
 *   const amountUsd = calculateUsdEquivalent(tokenAmount, 6)
 *   
 *   return (
 *     <div>
 *       <p>Token Amount: 35 USDC</p>
 *       <p>USD Equivalent: {formatUsd(amountUsd)}</p>
 *     </div>
 *   )
 * }
 * ```
 */
