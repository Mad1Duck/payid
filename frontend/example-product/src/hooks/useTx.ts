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
        // Get current block to ensure maxFeePerGas > baseFee
        let gasConfig = {};
        if (publicClient) {
          try {
            const block = await publicClient.getBlock();
            if (block?.baseFeePerGas) {
              // Set maxPriorityFeePerGas to 1 gwei, maxFeePerGas = baseFee + priority
              const maxPriorityFeePerGas = 1000000000n; // 1 gwei
              const maxFeePerGas = block.baseFeePerGas + maxPriorityFeePerGas;
              gasConfig = {
                maxFeePerGas,
                maxPriorityFeePerGas,
              };
            }
          } catch {
            // Fallback if block fetch fails
          }
        }

        const h = await writeContractAsync({
          ...args,
          ...gasConfig,
        } as any);
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
