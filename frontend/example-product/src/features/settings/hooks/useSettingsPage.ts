import { useState, useEffect } from 'react';
import { useAccount, useChainId, useChains } from 'wagmi';
import { useV4Palette, useV4Theme } from '@/components/v4/theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSubscription, useSubscribe, useSubscriptionPrice } from 'payid-react';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { shortAddr } from '@/features/shared/utils/address';

export function useSettingsPage() {
  const p = useV4Palette();
  const { toggle } = useV4Theme();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chains = useChains();
  const nativeSymbol = chains.find(c => c.id === chainId)?.nativeCurrency.symbol ?? 'ETH';
  const payId =
    isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id';
  const { state, subscribe: subNotify, unsubscribe } = usePushNotifications();

  /* ─── Storage Preference (Persistent) ─── */
  const [storageProvider, setStorageProvider] = useState<'0g' | 'ipfs'>(() => {
    const saved = localStorage.getItem('payid-storage-preference');
    return (saved === '0g' || saved === 'ipfs') ? saved : 'ipfs';
  });

  useEffect(() => {
    localStorage.setItem('payid-storage-preference', storageProvider);
  }, [storageProvider]);

  /* ─── Subscription ─── */
  const { data: sub } = useSubscription(address);
  const { subscribe, isPending: subPending, error: subError } = useSubscribe();
  const { data: subPrice } = useSubscriptionPrice();
  const daysLeft = sub?.expiry
    ? Math.max(0, Math.floor((Number(sub.expiry) - Date.now() / 1000) / 86400))
    : 0;
  const price = subPrice ? (subPrice as bigint) : parseEther('0.001');

  const isSupportedChain = chainId === 16601 || chainId === 16602 || chainId === 31337;

  useEffect(() => {
    console.log('[SettingsPage] Subscription state:', {
      chainId, isSupportedChain, isPending: subPending,
      subError: subError ? String(subError) : null,
      subPrice: subPrice ? String(subPrice) : null,
      price: String(price),
    });
  }, [chainId, isSupportedChain, subPending, subError, subPrice, price]);

  useEffect(() => {
    if (subError) {
      console.error('[SettingsPage] Subscription error:', subError);
      const errorMsg = (subError as { shortMessage?: string; message?: string; }).shortMessage ||
        (subError as { message?: string; }).message ||
        'Transaction failed';
      if (!isSupportedChain) {
        toast.error('Subscription Failed', { description: `Contracts not deployed on chain ${chainId}. Switch to 0G Testnet (16601/16602) or Hardhat (31337).` });
      } else if (errorMsg.includes('contract') || errorMsg.includes('zero address') || errorMsg.includes('not deployed')) {
        toast.error('Subscription Failed', { description: 'Contracts not deployed on this chain.' });
      } else if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        toast.error('Subscription Failed', { description: `Insufficient ${nativeSymbol} balance to pay for subscription.` });
      } else if (errorMsg.includes('paused') || errorMsg.includes('Pausable')) {
        toast.error('Subscription Failed', { description: 'Contract is currently paused. Contact admin.' });
      } else {
        toast.error('Subscription Failed', { description: errorMsg });
      }
    }
  }, [subError, chainId, isSupportedChain]);

  const settings = [
    { icon: 'Globe' as const, label: 'Currency', value: 'USD', color: '#0EA5E9' },
    { icon: 'Bell' as const, label: 'Notifications', value: state.subscribed ? 'On' : state.permission === 'denied' ? 'Blocked' : 'Off', color: '#F59E0B', onClick: state.subscribed ? unsubscribe : subNotify },
    { icon: 'Shield' as const, label: 'Security', value: 'Biometric', color: '#00D084' },
    { icon: 'Wallet' as const, label: 'Network', value: 'Hardhat · 31337', color: '#8B5CF6' },
  ];

  const storageOptions = [
    { value: '0g' as const, label: '0G Storage', icon: 'Database' as const, description: 'Persistent on-chain storage via 0G network', color: '#8B5CF6' },
    { value: 'ipfs' as const, label: 'IPFS', icon: 'Cloud' as const, description: 'Decentralized file storage via IPFS', color: '#0EA5E9' },
  ];

  return {
    p, toggle, address, isConnected, payId,
    storageProvider, setStorageProvider,
    sub, subscribe, subPending, price, daysLeft,
    settings, storageOptions,
    notifyState: state, subNotify, unsubNotify: unsubscribe,
  };
}
