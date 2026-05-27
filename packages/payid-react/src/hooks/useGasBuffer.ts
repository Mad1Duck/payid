import { usePublicClient } from 'wagmi';
import { useCallback } from 'react';
import type { Abi } from 'viem';

/**
 * Helper hook that adds a 30% gas buffer to contract write args.
 * Uses viem's estimateFeesPerGas which is more reliable than manual block fetching.
 *
 * Note: Uses generic structural typing instead of EstimateContractGasParameters
 * to avoid cross-package viem type duplication issues in monorepos.
 */
export function useGasBuffer() {
  const publicClient = usePublicClient();
  return useCallback(
    async <T extends { address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint; account?: `0x${string}` | null | undefined; }>(
      args: T,
    ): Promise<T & { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint; gas?: bigint; }> => {
      if (!publicClient) return args as any;
      try {
        const [fees, gasEst] = await Promise.all([
          publicClient.estimateFeesPerGas(),
          publicClient.estimateContractGas(args as any).catch(() => undefined),
        ]);
        return {
          ...args,
          ...(fees?.maxFeePerGas && {
            maxFeePerGas: (fees.maxFeePerGas * 13n) / 10n,
            maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? 0n,
          }),
          ...(gasEst && { gas: (gasEst * 15n) / 10n }),
        } as any;
      } catch {
        return args as any;
      }
    },
    [publicClient],
  );
}
