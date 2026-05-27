import { useCallback, useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import type { Hash, WriteContractParameters } from 'viem';

type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

interface TxState {
  send: (args: WriteContractParameters) => Promise<void>;
  hash: Hash | null;
  status: TxStatus;
  error: string | null;
  reset: () => void;
  isPending: boolean;
}

export function useTx(): TxState {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [hash, setHash] = useState<Hash | null>(null);
  const [status, setStatus] = useState<TxStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
  });

  useEffect(() => {
    if (confirmed && status === 'confirming') setStatus('success');
  }, [confirmed, status]);

  const send = useCallback(
    async (args: WriteContractParameters) => {
      setStatus('pending');
      setError(null);
      setHash(null);
      try {
        let txArgs = args;
        if (publicClient) {
          try {
            const fees = await publicClient.estimateFeesPerGas();
            if (fees?.maxFeePerGas) {
              txArgs = {
                ...args,
                maxFeePerGas: (fees.maxFeePerGas * 13n) / 10n,
                maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? 0n,
              } as WriteContractParameters;
            }
          } catch {
            // fallback to wallet estimation
          }
        }
        const h = await writeContractAsync(txArgs);
        setHash(h);
        setStatus('confirming');
      } catch (e: unknown) {
        const err = e as { shortMessage?: string; message?: string; };
        const msg = err.shortMessage ?? err.message ?? String(e);
        setError(
          msg.toLowerCase().includes('user rejected')
            ? 'Transaction rejected'
            : msg,
        );
        setStatus('error');
      }
    },
    [writeContractAsync, publicClient],
  );

  const reset = useCallback(() => {
    setHash(null);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    send,
    hash,
    status,
    error,
    reset,
    isPending: status === 'pending' || status === 'confirming',
  };
}
