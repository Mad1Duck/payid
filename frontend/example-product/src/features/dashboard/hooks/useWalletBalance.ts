import { useAccount, useBalance, useChainId, useChains } from 'wagmi';
import { formatUnits } from 'viem';
import { formatNumber } from '@/lib/utils';

export interface WalletBalance {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  balance: bigint | undefined;
  balanceLoading: boolean;
  chainId: number;
  nativeSymbol: string;
  nativeName: string;
  balanceValue: number;
}

export function useWalletBalance(): WalletBalance {
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

  return {
    address,
    isConnected,
    balance,
    balanceLoading,
    chainId,
    nativeSymbol,
    nativeName,
    balanceValue,
  };
}
