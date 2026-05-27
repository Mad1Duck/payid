import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAccount, useBalance, useChainId, useChains, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useV4Palette } from '@/components/v4/theme';
import { useReputation, useOfflineCache } from 'payid-react';
import { useTxHistory, relativeTime } from '@/hooks/useTxHistory';
import { formatNumber } from '@/lib/utils';
import { shortAddr, useClipboard } from '@/features/shared';
import { addresses } from '@/constants/contracts/addresses';

const CHAINLINK_ORACLE_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CHAINLINK_FEEDS: Record<number, `0x${string}`> = {
  421614: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165', // Arbitrum Sepolia ETH/USD
  11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia ETH/USD
  84532: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',    // Base Sepolia ETH/USD
};

function useEthUsdPrice(chainId: number): number {
  const chainlinkAddr = CHAINLINK_FEEDS[chainId];
  const mockAddr = (addresses as Record<number, Record<string, `0x${string}`>>)[chainId]?.MockOracle;
  const oracleAddr = chainlinkAddr ?? mockAddr;

  const { data } = useReadContract({
    address: oracleAddr,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
    query: { enabled: !!oracleAddr, staleTime: 60_000 },
  });

  if (data && Array.isArray(data) && data[1]) {
    const price = Number(data[1]) / 1e8;
    if (price > 100 && price < 1_000_000) return price;
  }
  return 3500;
}

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

  const ethUsdPrice = useEthUsdPrice(chainId);

  const tokens = [
    {
      symbol: nativeSymbol,
      name: nativeName,
      balance: formatNumber(balanceValue, 4),
      usd: balanceValue * ethUsdPrice,
      icon: '⟠',
    },
  ];

  return {
    address, isConnected, balance, balanceLoading, chainId,
    nativeSymbol, nativeName, balanceValue, ethUsdPrice, txMounted,
    p, copied, copy, cacheStats, cacheReady,
    activeTab, setActiveTab,
    score, isBlacklisted, isTrusted, repLoading,
    payId, handleCopy,
    txs, filteredTx, tokens, relativeTime,
  };
}
