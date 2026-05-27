import { useState, useMemo, useCallback, useEffect } from 'react';
import { useV4Palette } from '@/components/v4/theme';
import { useReputation, useOfflineCache } from 'payid-react';
import { useTxHistory, relativeTime, shortAddr, useClipboard } from '@/features/shared';
import { formatNumber } from '@/lib/utils';
import { useEthPrice } from './useEthPrice';
import { useWalletBalance } from './useWalletBalance';

export function useDashboard() {
  const wallet = useWalletBalance();
  const ethUsdPrice = useEthPrice(wallet.chainId);
  const [txMounted, setTxMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTxMounted(true), 600);
    return () => clearTimeout(t);
  }, []);
  const p = useV4Palette();
  const { copied, copy } = useClipboard();
  const { stats: cacheStats, isReady: cacheReady } = useOfflineCache();
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const { score, isBlacklisted, isTrusted, isLoading: repLoading } = useReputation({});

  const payId =
    wallet.isConnected && wallet.address ? `${shortAddr(wallet.address)}@pay.id` : 'connect@pay.id';

  const handleCopy = useCallback(() => {
    copy(payId);
  }, [copy, payId]);

  const { txs } = useTxHistory();

  const filteredTx = useMemo(
    () =>
      activeTab === 'all'
        ? txs
        : txs.filter(
          (tx) =>
            (activeTab === 'incoming' && tx.type === 'received') ||
            (activeTab === 'outgoing' && tx.type === 'sent'),
        ),
    [txs, activeTab],
  );

  const tokens = [
    {
      symbol: wallet.nativeSymbol,
      name: wallet.nativeName,
      balance: formatNumber(wallet.balanceValue, 4),
      usd: wallet.balanceValue * ethUsdPrice,
      icon: '⟠',
    },
  ];

  return {
    ...wallet,
    ethUsdPrice,
    txMounted,
    p, copied, copy, cacheStats, cacheReady,
    activeTab, setActiveTab,
    score, isBlacklisted, isTrusted, repLoading,
    payId, handleCopy,
    txs, filteredTx, tokens, relativeTime,
  };
}
