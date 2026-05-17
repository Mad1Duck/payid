import { useState, useEffect, useCallback } from 'react';
import { useChainId } from 'wagmi';

export interface TxRecord {
  id: string;
  type: 'sent' | 'received';
  to: string;
  from: string;
  amount: string;
  asset: string;
  timestamp: number;
}

function storageKey(chainId: number) {
  return `payid_tx_history_${chainId}`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export { relativeTime };

export function useTxHistory() {
  const chainId = useChainId();
  const [txs, setTxs] = useState<TxRecord[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(chainId));
    if (raw) {
      try { setTxs(JSON.parse(raw) as TxRecord[]); } catch { /* ignore corrupt data */ }
    } else {
      setTxs([]);
    }
  }, [chainId]);

  const addTx = useCallback((tx: TxRecord) => {
    setTxs(prev => {
      const next = [tx, ...prev].slice(0, 50);
      localStorage.setItem(storageKey(chainId), JSON.stringify(next));
      return next;
    });
  }, [chainId]);

  return { txs, addTx };
}
