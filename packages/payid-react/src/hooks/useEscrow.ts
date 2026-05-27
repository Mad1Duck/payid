import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Address, Hash, Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import { useGasBuffer } from './useGasBuffer';
import type { MilestoneDef, EscrowResult } from '../adapters/types';
import type { TxHookResult } from '../types';

// ─── Minimal ABI for EscrowMilestone ──────────────────────────────────────

const EscrowMilestoneABI = [
  {
    type: 'function',
    name: 'createEscrow',
    inputs: [
      { name: 'freelancer', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'descriptions', type: 'string[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'escrowId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'submitMilestone',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'index', type: 'uint256' },
      { name: 'evidenceHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'releaseMilestone',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'dispute',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveRefund',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'autoRefund',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'escrows',
    inputs: [{ type: 'uint256' }],
    outputs: [
      { name: 'client', type: 'address' },
      { name: 'freelancer', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'total', type: 'uint256' },
      { name: 'released', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextEscrowId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
//  Read: User Escrows (source-based routing)
// ═══════════════════════════════════════════════════════════════════════════

interface UseUserEscrowsParams {
  escrowAddress?: `0x${string}`;
  user?: `0x${string}`;
}

function useInjectedUserEscrows(
  adapter: import('../adapters/types').IEscrowAdapter,
  user: `0x${string}` | undefined,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payid', 'escrows', 'injected', adapter.name, user],
    queryFn: async () => {
      if (!user) throw new Error('No user address');
      return adapter.getUserEscrows(user);
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  return {
    escrows: data ?? [],
    isLoading,
    error,
  };
}

function useContractUserEscrows(
  contracts: import('../types').PayIDContracts,
  escrowAddress: `0x${string}` | undefined,
  user: `0x${string}` | undefined,
) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const publicClient = usePublicClient();

  const enabled =
    !!user &&
    !!resolvedAddress &&
    resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, error } = useQuery({
    queryKey: ['payid', 'escrows', 'contract', resolvedAddress, user],
    queryFn: async (): Promise<EscrowResult[]> => {
      if (!publicClient || !user || !resolvedAddress) return [];

      const nextId = (await publicClient.readContract({
        address: resolvedAddress,
        abi: EscrowMilestoneABI,
        functionName: 'nextEscrowId',
      })) as bigint;

      const results: EscrowResult[] = [];
      const statusMap = ['pending', 'active', 'disputed', 'completed', 'refunded'] as const;

      // Batch all escrows() calls into a single multicall RPC request
      const multicallResults = await publicClient.multicall({
        contracts: Array.from({ length: Number(nextId) }, (_, i) => ({
          address: resolvedAddress,
          abi: EscrowMilestoneABI,
          functionName: 'escrows',
          args: [BigInt(i)],
        })),
      });

      for (let i = 0; i < multicallResults.length; i++) {
        const call = multicallResults[i];
        if (call.status !== 'success') continue;
        const e = call.result as unknown as readonly [Address, Address, Address, bigint, bigint, number, bigint, bigint];

        const client = e[0];
        const freelancer = e[1];
        if (
          client.toLowerCase() !== user.toLowerCase() &&
          freelancer.toLowerCase() !== user.toLowerCase()
        )
          continue;

        results.push({
          id: BigInt(i),
          client,
          freelancer,
          asset: e[2],
          total: e[3],
          released: e[4],
          status: statusMap[e[5]] ?? 'pending',
          milestones: [], // Would need additional contract calls
          deadline: e[7],
        });
      }
      return results;
    },
    enabled,
    staleTime: 15_000,
  });

  return {
    escrows: data ?? [],
    isLoading,
    error,
  };
}

function useNoopUserEscrows() {
  return { escrows: [] as EscrowResult[], isLoading: false, error: null };
}

/**
 * @notice Read escrows relevant to a user (as client or freelancer).
 */
export function useUserEscrows({ escrowAddress, user }: UseUserEscrowsParams = {}) {
  const { address: connectedAddress } = useAccount();
  const { contracts, escrow } = usePayIDContext();
  const targetUser = user ?? connectedAddress;

  if (escrow.info.source === 'injected') {
    return useInjectedUserEscrows(escrow.adapter, targetUser);
  }

  if (escrow.info.source === 'contract') {
    return useContractUserEscrows(contracts, escrowAddress, targetUser);
  }

  return useNoopUserEscrows();
}

// ═══════════════════════════════════════════════════════════════════════════
//  Write Sub-Hooks (adapter-routed)
// ═══════════════════════════════════════════════════════════════════════════

function useInjectedCreateEscrow(adapter: import('../adapters/types').IEscrowAdapter) {
  const mutation = useMutation({
    mutationFn: async (params: {
      freelancer: Address;
      asset: Address;
      milestones: MilestoneDef[];
      deadline: bigint;
      value?: bigint;
    }) => {
      return adapter.createEscrow(params.freelancer, params.asset, params.milestones, params.deadline, params.value);
    },
  });

  return {
    createEscrow: (freelancer: Address, asset: Address, milestones: MilestoneDef[], deadline: bigint, value?: bigint) =>
      mutation.mutate({ freelancer, asset, milestones, deadline, value }),
    hash: mutation.data ? undefined : undefined, // bigint, not Hash
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useContractCreateEscrow(contracts: import('../types').PayIDContracts, escrowAddress: `0x${string}` | undefined) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();

  const enabled = !!resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const createEscrow = (freelancer: Address, asset: Address, milestones: MilestoneDef[], deadline: bigint, value?: bigint) => {
    if (!enabled) throw new Error('[Escrow] EscrowMilestone address not configured');
    const amounts = milestones.map((m) => m.amount);
    const descriptions = milestones.map((m) => m.description);
    withBuffer({
      address: resolvedAddress,
      abi: EscrowMilestoneABI as unknown as Abi,
      functionName: 'createEscrow',
      args: [freelancer, asset, amounts, descriptions, deadline],
      value,
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  return { createEscrow, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * @notice Create a new escrow with milestones.
 */
export function useCreateEscrow({ escrowAddress }: Pick<UseUserEscrowsParams, 'escrowAddress'> = {}): TxHookResult & {
  createEscrow: (freelancer: Address, asset: Address, milestones: MilestoneDef[], deadline: bigint, value?: bigint) => void;
} {
  const { contracts, escrow } = usePayIDContext();

  if (escrow.info.source === 'injected') {
    return useInjectedCreateEscrow(escrow.adapter);
  }

  return useContractCreateEscrow(contracts, escrowAddress);
}

// ─── Submit Milestone ─────────────────────────────────────────────────────

function useInjectedSubmitMilestone(adapter: import('../adapters/types').IEscrowAdapter) {
  const mutation = useMutation({
    mutationFn: async (params: { escrowId: bigint; index: number; evidenceHash: string; }) => {
      return adapter.submitMilestone(params.escrowId, params.index, params.evidenceHash);
    },
  });

  return {
    submitMilestone: (escrowId: bigint, index: number, evidenceHash: string) =>
      mutation.mutate({ escrowId, index, evidenceHash }),
    hash: (mutation.data ?? undefined) as Hash | undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useContractSubmitMilestone(contracts: import('../types').PayIDContracts, escrowAddress: `0x${string}` | undefined) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();

  const enabled = !!resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const submitMilestone = (escrowId: bigint, index: number, evidenceHash: string) => {
    if (!enabled) throw new Error('[Escrow] EscrowMilestone address not configured');
    withBuffer({
      address: resolvedAddress,
      abi: EscrowMilestoneABI as unknown as Abi,
      functionName: 'submitMilestone',
      args: [escrowId, BigInt(index), evidenceHash as Hash],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  return { submitMilestone, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * @notice Submit milestone proof (freelancer).
 */
export function useSubmitMilestone({ escrowAddress }: Pick<UseUserEscrowsParams, 'escrowAddress'> = {}): TxHookResult & {
  submitMilestone: (escrowId: bigint, index: number, evidenceHash: string) => void;
} {
  const { contracts, escrow } = usePayIDContext();

  if (escrow.info.source === 'injected') {
    return useInjectedSubmitMilestone(escrow.adapter);
  }

  return useContractSubmitMilestone(contracts, escrowAddress);
}

// ─── Release Milestone ────────────────────────────────────────────────────

function useInjectedReleaseMilestone(adapter: import('../adapters/types').IEscrowAdapter) {
  const mutation = useMutation({
    mutationFn: async (params: { escrowId: bigint; index: number; }) => {
      return adapter.releaseMilestone(params.escrowId, params.index);
    },
  });

  return {
    releaseMilestone: (escrowId: bigint, index: number) => mutation.mutate({ escrowId, index }),
    hash: (mutation.data ?? undefined) as Hash | undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useContractReleaseMilestone(contracts: import('../types').PayIDContracts, escrowAddress: `0x${string}` | undefined) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();

  const enabled = !!resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const releaseMilestone = (escrowId: bigint, index: number) => {
    if (!enabled) throw new Error('[Escrow] EscrowMilestone address not configured');
    withBuffer({
      address: resolvedAddress,
      abi: EscrowMilestoneABI as unknown as Abi,
      functionName: 'releaseMilestone',
      args: [escrowId, BigInt(index)],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  return { releaseMilestone, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * @notice Release milestone payment (client/arbiter).
 */
export function useReleaseMilestone({ escrowAddress }: Pick<UseUserEscrowsParams, 'escrowAddress'> = {}): TxHookResult & {
  releaseMilestone: (escrowId: bigint, index: number) => void;
} {
  const { contracts, escrow } = usePayIDContext();

  if (escrow.info.source === 'injected') {
    return useInjectedReleaseMilestone(escrow.adapter);
  }

  return useContractReleaseMilestone(contracts, escrowAddress);
}

// ─── Dispute ──────────────────────────────────────────────────────────────

function useInjectedDispute(adapter: import('../adapters/types').IEscrowAdapter) {
  const mutation = useMutation({
    mutationFn: async (params: { escrowId: bigint; }) => {
      return adapter.dispute(params.escrowId);
    },
  });

  return {
    dispute: (escrowId: bigint) => mutation.mutate({ escrowId }),
    hash: (mutation.data ?? undefined) as Hash | undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useContractDispute(contracts: import('../types').PayIDContracts, escrowAddress: `0x${string}` | undefined) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();

  const enabled = !!resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const dispute = (escrowId: bigint) => {
    if (!enabled) throw new Error('[Escrow] EscrowMilestone address not configured');
    withBuffer({
      address: resolvedAddress,
      abi: EscrowMilestoneABI as unknown as Abi,
      functionName: 'dispute',
      args: [escrowId],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  return { dispute, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * @notice Raise a dispute on an escrow.
 */
export function useDisputeEscrow({ escrowAddress }: Pick<UseUserEscrowsParams, 'escrowAddress'> = {}): TxHookResult & {
  dispute: (escrowId: bigint) => void;
} {
  const { contracts, escrow } = usePayIDContext();

  if (escrow.info.source === 'injected') {
    return useInjectedDispute(escrow.adapter);
  }

  return useContractDispute(contracts, escrowAddress);
}

// ─── Resolve Refund ──────────────────────────────────────────────────────

function useInjectedResolveRefund(adapter: import('../adapters/types').IEscrowAdapter) {
  const mutation = useMutation({
    mutationFn: async (params: { escrowId: bigint; }) => {
      return adapter.resolveRefund(params.escrowId);
    },
  });

  return {
    resolveRefund: (escrowId: bigint) => mutation.mutate({ escrowId }),
    hash: (mutation.data ?? undefined) as Hash | undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useContractResolveRefund(contracts: import('../types').PayIDContracts, escrowAddress: `0x${string}` | undefined) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();

  const enabled = !!resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const resolveRefund = (escrowId: bigint) => {
    if (!enabled) throw new Error('[Escrow] EscrowMilestone address not configured');
    withBuffer({
      address: resolvedAddress,
      abi: EscrowMilestoneABI as unknown as Abi,
      functionName: 'resolveRefund',
      args: [escrowId],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  return { resolveRefund, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * @notice Resolve dispute with refund.
 */
export function useResolveRefund({ escrowAddress }: Pick<UseUserEscrowsParams, 'escrowAddress'> = {}): TxHookResult & {
  resolveRefund: (escrowId: bigint) => void;
} {
  const { contracts, escrow } = usePayIDContext();

  if (escrow.info.source === 'injected') {
    return useInjectedResolveRefund(escrow.adapter);
  }

  return useContractResolveRefund(contracts, escrowAddress);
}

// ─── Auto Refund ───────────────────────────────────────────────────────────

function useInjectedAutoRefund(adapter: import('../adapters/types').IEscrowAdapter) {
  const mutation = useMutation({
    mutationFn: async (params: { escrowId: bigint; }) => {
      return adapter.autoRefund(params.escrowId);
    },
  });

  return {
    autoRefund: (escrowId: bigint) => mutation.mutate({ escrowId }),
    hash: (mutation.data ?? undefined) as Hash | undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useContractAutoRefund(contracts: import('../types').PayIDContracts, escrowAddress: `0x${string}` | undefined) {
  const resolvedAddress = escrowAddress ?? contracts.escrowMilestone;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();

  const enabled = !!resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000';

  const autoRefund = (escrowId: bigint) => {
    if (!enabled) throw new Error('[Escrow] EscrowMilestone address not configured');
    withBuffer({
      address: resolvedAddress,
      abi: EscrowMilestoneABI as unknown as Abi,
      functionName: 'autoRefund',
      args: [escrowId],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  return { autoRefund, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * @notice Trigger auto-refund if deadline passed.
 */
export function useAutoRefund({ escrowAddress }: Pick<UseUserEscrowsParams, 'escrowAddress'> = {}): TxHookResult & {
  autoRefund: (escrowId: bigint) => void;
} {
  const { contracts, escrow } = usePayIDContext();

  if (escrow.info.source === 'injected') {
    return useInjectedAutoRefund(escrow.adapter);
  }

  return useContractAutoRefund(contracts, escrowAddress);
}
