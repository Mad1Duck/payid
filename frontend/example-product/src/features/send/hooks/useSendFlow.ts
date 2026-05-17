import { useCallback, useEffect, useState } from 'react';
import { useAccount, useBalance, useChainId, useChains } from 'wagmi';
import { formatUnits, isAddress, parseEther, parseUnits } from 'viem';
import { usePayIDFlow, useActiveCombinedRule } from 'payid-react';
import { useMultiCurrency } from '../../../hooks/useMultiCurrency';
import { useV4Palette } from '@/components/v4/theme';
import type { Address } from 'viem';
import { useTxHistory } from '@/hooks/useTxHistory';
import { getTokenConfig, getTokenPriceOracle } from '@/constants/tokens';
import { getPipeline } from '@/features/send/constants';
import type { Step } from '@/features/send/types';
import { CHAIN_NAMES, useClipboard } from '@/features/shared';

export function useSendFlow() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const chains = useChains();
  const currentChain = chains.find((c) => c.id === chainId);
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH';
  const p = useV4Palette();
  const { copy } = useClipboard();

  const chainName = CHAIN_NAMES[chainId] ?? `Chain #${chainId}`;

  const { displayCurrency, convert, format, toggle } = useMultiCurrency();
  const { addTx } = useTxHistory();
  const [step, setStep] = useState<Step>('who');
  const [payId, setPayId] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [targetAddress, setTargetAddress] = useState<Address | null>(null);
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState(nativeSymbol);
  const [txHash, setTxHash] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [preflightWarning, setPreflightWarning] = useState<string | null>(null);
  const { data: targetPolicy } = useActiveCombinedRule(targetAddress ?? undefined);

  const {
    status: flowStatus,
    isPending: flowIsPending,
    txHash: flowTxHash,
    denyReason: flowDenyReason,
    error: flowError,
    execute,
    reset: resetFlow,
  } = usePayIDFlow();

  const balanceValue = balance
    ? parseFloat(formatUnits(balance.value, balance.decimals))
    : 0;
  const pipeline = getPipeline(flowStatus);

  const resolvePayId = useCallback(() => {
    if (!payId.trim()) return;
    setResolvedName(payId);
    if (isAddress(payId)) {
      setTargetAddress(payId);
    }
    setStep('amount');
  }, [payId]);

  // Pre-fill PayID / address from query parameters (e.g. ?to=0x... or ?to=alice@pay.id)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const toParam = params.get('to');
      if (toParam) {
        setPayId(toParam);
        setResolvedName(toParam);
        if (isAddress(toParam)) {
          setTargetAddress(toParam as Address);
        } else if (toParam.includes('@')) {
          // If it is a payId identifier, let's check if the part before @ is an address
          const prefix = toParam.split('@')[0];
          if (isAddress(prefix)) {
            setTargetAddress(prefix as Address);
          }
        }
        setStep('amount');
      }
    }
  }, []);

  const handleRunPolicy = useCallback(() => {
    const receiver = payId.trim();
    if (!isAddress(receiver)) {
      setDenyReason('Enter a valid wallet address (0x...) as receiver to run policy evaluation.');
      return;
    }
    setDenyReason('');
    setStep('evaluating');

    const token = getTokenConfig(chainId, asset);
    const assetAddress = (token?.address ?? '0x0000000000000000000000000000000000000000') as Address;
    const tokenDecimals = token?.decimals ?? 18;
    const amountRaw = tokenDecimals === 18
      ? parseEther(amount || '0')
      : parseUnits(amount || '0', tokenDecimals);

    const tokenPriceOracle = getTokenPriceOracle(chainId, asset);

    const execParams: any = {
      receiver: receiver,
      asset: assetAddress,
      amount: amountRaw,
      payId: address ? `${address}@pay.id` : 'anon@pay.id',
    };

    if (tokenPriceOracle) {
      execParams.tokenDecimals = tokenDecimals;
      execParams.tokenPriceOracle = tokenPriceOracle;
      execParams.minUsdValue = 4500000000n; // $45.00
    }

    execute(execParams);
  }, [payId, amount, address, execute, chainId, asset]);

  // Pre-flight check: warn early if token has no oracle but recipient has USD rules
  useEffect(() => {
    if (step === 'review' && targetPolicy?.active && targetPolicy.ruleRefs && targetPolicy.ruleRefs.length > 0) {
      const token = getTokenConfig(chainId, asset);
      const hasOracle = !!token?.oracleKey;
      if (!hasOracle) {
        setPreflightWarning(
          `${asset} has no price oracle on this chain. If the recipient's rules check USD value, this transaction will be rejected.`
        );
      } else {
        setPreflightWarning(null);
      }
    } else {
      setPreflightWarning(null);
    }
  }, [step, targetPolicy, chainId, asset]);

  useEffect(() => {
    if (flowStatus === 'success' && flowTxHash) {
      setTxHash(flowTxHash);
      setStep('success');
      addTx({
        id: flowTxHash,
        type: 'sent',
        to: resolvedName ?? payId,
        from: address ?? '',
        amount,
        asset,
        timestamp: Date.now(),
      });
    }
    if (flowStatus === 'denied') {
      setDenyReason(flowDenyReason ?? 'Policy denied this transaction');
      setStep('evaluating');
    }
    if (flowStatus === 'error') {
      const rawErr = String(flowError ?? 'Transaction failed');
      const shortErr = rawErr.split('\n')[0].split('Contract Call:')[0].trim();
      setDenyReason(shortErr || rawErr);
      if (step !== 'signing') setStep('review');
    }
    if (flowStatus === 'awaiting-wallet' || flowStatus === 'confirming')
      setStep('signing');
  }, [flowStatus, flowTxHash]);

  useEffect(() => {
    setAsset(nativeSymbol);
  }, [nativeSymbol]);

  const reset = useCallback(() => {
    resetFlow();
    setStep('who');
    setPayId('');
    setResolvedName(null);
    setTargetAddress(null);
    setAmount('');
    setAsset(nativeSymbol);
    setTxHash('');
    setDenyReason('');
  }, [resetFlow, nativeSymbol]);

  return {
    address, isConnected, balance, chainId, chainName, nativeSymbol, p,
    displayCurrency, convert, format, toggle,
    step, setStep,
    payId, setPayId,
    resolvedName, setResolvedName,
    amount, setAmount,
    asset, setAsset,
    txHash, setTxHash,
    denyReason, setDenyReason,
    flowStatus, flowIsPending, flowTxHash, flowDenyReason, flowError,
    balanceValue, pipeline,
    targetPolicy, preflightWarning,
    resolvePayId, handleRunPolicy, reset, copy,
  };
}
