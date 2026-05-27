import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { TimeLockVestingAbi } from '@/constants/contracts';
import { addresses } from '@/constants/contracts/addresses';

export interface VestingSchedule {
  beneficiary: `0x${string}`;
  asset: `0x${string}`;
  totalAmount: bigint;
  startTime: bigint;
  cliff: bigint;
  duration: bigint;
  released: bigint;
  revocable: boolean;
  revoked: boolean;
  revoker: `0x${string}`;
}

export function useTimeLockVesting() {
  const chainId = useChainId();
  const timeLockVestingAddress = addresses[chainId as keyof typeof addresses]?.TimeLockVesting as `0x${string}`;

  // Read next schedule ID
  const { data: nextScheduleId, refetch: refetchNextScheduleId } = useReadContract({
    address: timeLockVestingAddress,
    abi: TimeLockVestingAbi,
    functionName: 'nextScheduleId',
  });

  // Read schedule by ID
  const { data: schedule, refetch: refetchSchedule } = useReadContract({
    address: timeLockVestingAddress,
    abi: TimeLockVestingAbi,
    functionName: 'schedules',
    args: undefined as any, // Will be set when called
    query: {
      enabled: false, // Only enable when scheduleId is provided
    },
  });

  // Read releasable amount
  const { data: releasableAmount, refetch: refetchReleasable } = useReadContract({
    address: timeLockVestingAddress,
    abi: TimeLockVestingAbi,
    functionName: 'releasable',
    args: undefined as any,
    query: {
      enabled: false,
    },
  });

  // Write contract
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Wait for transaction
  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Create vesting schedule
  const createSchedule = async (
    beneficiary: `0x${string}`,
    asset: `0x${string}`,
    totalAmount: bigint,
    startTime: bigint,
    cliff: bigint,
    duration: bigint,
    revocable: boolean,
    revoker: `0x${string}`,
    value?: bigint
  ) => {
    try {
      writeContract({
        address: timeLockVestingAddress,
        abi: TimeLockVestingAbi,
        functionName: 'createSchedule',
        args: [beneficiary, asset, totalAmount, startTime, cliff, duration, revocable, revoker],
        value,
      });
      toast.info('Creating vesting schedule...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create vesting schedule');
      throw err;
    }
  };

  // Release vested tokens
  const release = async (scheduleId: bigint) => {
    try {
      writeContract({
        address: timeLockVestingAddress,
        abi: TimeLockVestingAbi,
        functionName: 'release',
        args: [scheduleId],
      });
      toast.info('Releasing vested tokens...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to release tokens');
      throw err;
    }
  };

  // Revoke vesting schedule
  const revoke = async (scheduleId: bigint) => {
    try {
      writeContract({
        address: timeLockVestingAddress,
        abi: TimeLockVestingAbi,
        functionName: 'revoke',
        args: [scheduleId],
      });
      toast.info('Revoking vesting schedule...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke schedule');
      throw err;
    }
  };

  // Get schedule by ID
  const getSchedule = (scheduleId: bigint) => {
    return useReadContract({
      address: timeLockVestingAddress,
      abi: TimeLockVestingAbi,
      functionName: 'schedules',
      args: [scheduleId],
    });
  };

  // Get releasable amount
  const getReleasable = (scheduleId: bigint) => {
    return useReadContract({
      address: timeLockVestingAddress,
      abi: TimeLockVestingAbi,
      functionName: 'releasable',
      args: [scheduleId],
    });
  };

  return {
    // Contract address
    address: timeLockVestingAddress,

    // Read functions
    nextScheduleId,
    schedule,
    releasableAmount,
    getSchedule,
    getReleasable,

    // Write functions
    createSchedule,
    release,
    revoke,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,

    // Refetch helpers
    refetchSchedule,
    refetchNextScheduleId,
    refetchReleasable,
  };
}
