// ── Price formatting utilities ──

export function formatPrice(priceWei: bigint): string {
  const price = Number(priceWei) / 1e18
  if (price < 0.0001) return price.toFixed(8)
  if (price < 0.01) return price.toFixed(6)
  if (price < 1) return price.toFixed(4)
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPriceWithUSD(
  priceWei: bigint,
  nativeSymbol: string,
  ethUsdPrice?: bigint,
): string {
  const formattedPrice = formatPrice(priceWei)
  const price = Number(priceWei) / 1e18

  if (ethUsdPrice && ethUsdPrice > 0n) {
    const ethPrice = Number(ethUsdPrice) / 1e8 // Chainlink uses 8 decimals
    const usdPrice = (price * ethPrice).toFixed(2)
    return `$${usdPrice} (${formattedPrice} ${nativeSymbol})`
  }

  return `${formattedPrice} ${nativeSymbol}`
}
