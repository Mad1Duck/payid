import { TOKEN_PRICE_ORACLES } from './oracles'

export interface TokenConfig {
  symbol: string
  address: `0x${string}`
  decimals: number
  /** Chainlink oracle feed key, e.g. 'USDC/USD'. undefined = no oracle for this token */
  oracleKey?: string
}

/**
 * Token configuration per chain.
 *
 * Native token is always address(0) and uses chain nativeCurrency.decimals.
 * ERC20 tokens listed here will have their oracle price auto-queried in
 * usePayIDFlow when tokenPriceOracle is provided.
 */
export const TOKEN_CONFIG: Record<number, TokenConfig[]> = {
  31337: [
    { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDC', address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', decimals: 6, oracleKey: 'USDC/USD' },
    { symbol: 'USDT', address: '0x0000000000000000000000000000000000000000', decimals: 6, oracleKey: 'USDT/USD' },
    { symbol: 'DAI', address: '0x0000000000000000000000000000000000000000', decimals: 18, oracleKey: 'DAI/USD' },
  ],
  16601: [
    { symbol: 'A0GI', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDC', address: '0x0000000000000000000000000000000000000000', decimals: 6, oracleKey: 'USDC/USD' },
    { symbol: 'USDT', address: '0x0000000000000000000000000000000000000000', decimals: 6, oracleKey: 'USDT/USD' },
    { symbol: 'DAI', address: '0x0000000000000000000000000000000000000000', decimals: 18, oracleKey: 'DAI/USD' },
  ],
  11155111: [
    { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6, oracleKey: 'USDC/USD' },
    { symbol: 'USDT', address: '0x0000000000000000000000000000000000000000', decimals: 6, oracleKey: 'USDT/USD' },
    { symbol: 'DAI', address: '0x0000000000000000000000000000000000000000', decimals: 18, oracleKey: 'DAI/USD' },
  ],
}

/**
 * Get token config by chainId and symbol.
 */
export function getTokenConfig(chainId: number, symbol: string): TokenConfig | undefined {
  const list = TOKEN_CONFIG[chainId] ?? []
  return list.find((t) => t.symbol === symbol)
}

/**
 * Get Chainlink oracle address for a token on a given chain.
 * Returns undefined if no oracle is configured.
 */
export function getTokenPriceOracle(chainId: number, symbol: string): `0x${string}` | undefined {
  const token = getTokenConfig(chainId, symbol)
  if (!token?.oracleKey) return undefined
  return TOKEN_PRICE_ORACLES[chainId]?.[token.oracleKey]
}
