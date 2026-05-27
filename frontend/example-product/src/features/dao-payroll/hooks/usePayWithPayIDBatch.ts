import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { PayWithPayIDBatchAbi } from '@/constants/contracts';
import { addresses } from '@/constants/contracts/addresses';
import { useGasBuffer } from 'payid-react';
import type { Abi } from 'viem';

export interface BatchPaymentItem {
  receiver: `0x${string}`;
  amount: bigint;
  decision: any;
  signature: `0x${string}`;
  attestationUIDs: readonly `0x${string}`[];
}

export function usePayWithPayIDBatch() {
  const chainId = useChainId();
  const payWithPayIDBatchAddress = addresses[chainId as keyof typeof addresses]?.PayWithPayIDBatch as `0x${string}`;

  // Read contract state
  const { data: payWithPayID } = useReadContract({
    address: payWithPayIDBatchAddress,
    abi: PayWithPayIDBatchAbi,
    functionName: 'payWithPayID',
  });

  // Write contract
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const withBuffer = useGasBuffer();

  // Wait for transaction
  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Batch pay native (ETH)
  const batchPayNative = async (
    decisions: any[],
    sigs: `0x${string}`[],
    attestationUIDs: readonly `0x${string}`[][],
    totalValue: bigint
  ) => {
    try {
      const args = await withBuffer({
        address: payWithPayIDBatchAddress,
        abi: PayWithPayIDBatchAbi as unknown as Abi,
        functionName: 'batchPayNative',
        args: [decisions, sigs, attestationUIDs],
        value: totalValue,
      });
      await writeContractAsync(args);
      toast.info('Processing batch payment...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process batch payment');
      throw err;
    }
  };

  // Batch pay ERC20
  const batchPayERC20 = async (
    decisions: any[],
    sigs: `0x${string}`[],
    attestationUIDs: readonly `0x${string}`[][]
  ) => {
    try {
      const args = await withBuffer({
        address: payWithPayIDBatchAddress,
        abi: PayWithPayIDBatchAbi as unknown as Abi,
        functionName: 'batchPayERC20',
        args: [decisions, sigs, attestationUIDs],
      });
      await writeContractAsync(args);
      toast.info('Processing batch ERC20 payment...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process batch ERC20 payment');
      throw err;
    }
  };

  return {
    // Contract address
    address: payWithPayIDBatchAddress,
    payWithPayID,

    // Write functions
    batchPayNative,
    batchPayERC20,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
