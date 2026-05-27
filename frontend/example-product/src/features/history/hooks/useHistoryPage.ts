import { useState, useMemo, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useV4Palette } from '@/components/v4/theme';
import { useTxHistory, relativeTime } from '@/hooks/useTxHistory';

export function useHistoryPage() {
  const p = useV4Palette();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');
  const [search, setSearch] = useState('');
  const { txs } = useTxHistory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(t);
  }, []);

  /* ── Reset UI state on chain change ── */
  useEffect(() => {
    setActiveTab('all');
    setSearch('');
  }, [chainId]);

  const filteredTxs = useMemo(() => {
    let filtered = activeTab === 'all' ? txs : txs.filter((tx) => tx.type === activeTab);
    if (search) {
      filtered = filtered.filter(
        (tx) =>
          (tx.to || tx.from).toLowerCase().includes(search.toLowerCase()) ||
          tx.id.toLowerCase().includes(search.toLowerCase()),
      );
    }
    return filtered;
  }, [activeTab, search, txs]);

  const totalSent = txs
    .filter((t) => t.type === 'sent')
    .reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
  const totalReceived = txs
    .filter((t) => t.type === 'received')
    .reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);

  return {
    p, isConnected, activeTab, setActiveTab, search, setSearch,
    mounted, filteredTxs, totalSent, totalReceived, relativeTime,
  };
}
