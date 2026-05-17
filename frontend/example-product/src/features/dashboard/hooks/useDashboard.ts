import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAccount, useBalance, useChainId, useChains } from 'wagmi';
import { formatUnits } from 'viem';
import { useV4Palette } from '@/components/v4/theme';
import { useReputation, useOfflineCache } from 'payid-react';
import { useTxHistory, relativeTime } from '@/hooks/useTxHistory';
import { formatNumber } from '@/lib/utils';
import { shortAddr, useClipboard } from '@/features/shared';

export function useDashboard() {
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading: balanceLoading } = useBalance({ address });
  const chainId = useChainId();
  const chains = useChains();
  const currentChain = chains.find((c) => c.id === chainId);
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH';
  const nativeName = currentChain?.nativeCurrency.name ?? 'Ethereum';
  const balanceValue =
    isConnected && balance
      ? parseFloat(formatUnits(balance.value, balance.decimals))
      : 0;
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
    isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id';

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
      symbol: nativeSymbol,
      name: nativeName,
      balance: formatNumber(balanceValue, 4),
      usd: balanceValue * 3500,
      icon: '⟠',
    },
  ];

  return {
    address, isConnected, balance, balanceLoading, chainId,
    nativeSymbol, nativeName, balanceValue, txMounted,
    p, copied, copy, cacheStats, cacheReady,
    activeTab, setActiveTab,
    score, isBlacklisted, isTrusted, repLoading,
    payId, handleCopy,
    txs, filteredTx, tokens, relativeTime,
  };
}
