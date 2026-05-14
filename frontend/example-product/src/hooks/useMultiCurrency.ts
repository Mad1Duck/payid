import { useState, useCallback, useMemo } from 'react'

export type CurrencyCode = 'ETH' | 'USD' | 'IDR'

export interface ExchangeRates {
  ETH: number   // 1 ETH = ? USD
  IDR: number   // 1 USD = ? IDR
}

// Mock rates — real implementation fetches from oracle/API
const DEFAULT_RATES: ExchangeRates = {
  ETH: 3500,
  IDR: 16300,
}

export function useMultiCurrency(rates: ExchangeRates = DEFAULT_RATES) {
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD')

  const convert = useCallback((
    amountEth: number,
    target: CurrencyCode
  ): number => {
    if (target === 'ETH') return amountEth
    const usd = amountEth * rates.ETH
    if (target === 'USD') return usd
    return usd * rates.IDR
  }, [rates])

  const format = useCallback((
    amount: number,
    currency: CurrencyCode
  ): string => {
    if (currency === 'ETH') return amount.toFixed(6)
    if (currency === 'USD') return `$${amount.toFixed(2)}`
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
  }, [])

  const toggle = useCallback(() => {
    setDisplayCurrency(prev => {
      const order: CurrencyCode[] = ['USD', 'IDR', 'ETH']
      const idx = order.indexOf(prev)
      return order[(idx + 1) % order.length]
    })
  }, [])

  return {
    displayCurrency,
    setDisplayCurrency,
    convert,
    format,
    toggle,
    rates,
  }
}
