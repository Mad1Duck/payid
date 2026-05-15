import { useState, useEffect, useCallback } from 'react'

export interface TxRecord {
  id: string
  type: 'sent' | 'received'
  to: string
  from: string
  amount: string
  asset: string
  timestamp: number
}

const STORAGE_KEY = 'payid_tx_history'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export { relativeTime }

export function useTxHistory() {
  const [txs, setTxs] = useState<TxRecord[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try { setTxs(JSON.parse(raw) as TxRecord[]) } catch { /* ignore corrupt data */ }
    }
  }, [])

  const addTx = useCallback((tx: TxRecord) => {
    setTxs(prev => {
      const next = [tx, ...prev].slice(0, 50)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { txs, addTx }
}
