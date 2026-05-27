import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Hash } from 'viem';
import { useMemo } from 'react';
import { usePayIDContext } from '../PayIDProvider';
import type { TxHookResult } from '../types';

/*
 * VRAN — Vindex Reputation & Anti-Scam Network Hooks
 *
 * These hooks read from the VindexRegistry contract.
 * Install the ABI artifact after deploying VindexRegistry.sol.
 */

// Minimal ABI for VindexRegistry (reputation + blacklist views + write functions)
const VindexRegistryABI = [
  {
    type: 'function',
    name: 'getReputation',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isBlacklisted',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isTrusted',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'threshold', type: 'uint16' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minStake',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'consensusThreshold',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'submitReport',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'evidenceHash', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'confirmReport',
    inputs: [{ name: 'reportId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reports',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'target', type: 'address' },
      { name: 'reporter', type: 'address' },
      { name: 'evidenceHash', type: 'string' },
      { name: 'stake', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'confirmations', type: 'uint8' },
      { name: 'resolved', type: 'bool' },
      { name: 'valid', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reportCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'successfulReports',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minReporterReputation',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
  },
] as const;

const DEFAULT_TRUST_THRESHOLD = 700;

interface UseReputationParams {
  registryAddress?: `0x${string}`;
  target?: `0x${string}`;
}

interface ReputationData {
  score: number;
  isBlacklisted: boolean;
  isTrusted: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Source-Based Sub-Hooks (no casting, no union types)
// ═══════════════════════════════════════════════════════════════════════════

function useInjectedReputation(adapter: import('../adapters/types').IReputationAdapter, account: `0x${string}` | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payid', 'reputation', 'injected', adapter.name, account],
    queryFn: async () => {
      if (!account) throw new Error('No account');
      return adapter.getReputation(account);
    },
    enabled: !!account,
    staleTime: 30_000, // 30s cache
  });

  return {
    data: data ?? undefined,
    score: data?.score ?? 500,
    isBlacklisted: data?.isBlacklisted ?? false,
    isTrusted: data?.isTrusted ?? false,
    isLoading,
    error,
  };
}

function useContractReputation(contracts: import('../types').PayIDContracts, registryAddress: `0x${string}` | undefined, account: `0x${string}` | undefined) {
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!account && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading } = useReadContracts({
    contracts: enabled
      ? [
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'getReputation', args: [account!] },
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'isBlacklisted', args: [account!] },
      ]
      : [],
    query: { enabled },
  });

  const score = data?.[0]?.result;
  const blacklisted = data?.[1]?.result;

  const reputationData: ReputationData | undefined = useMemo(() => {
    if (score === undefined || blacklisted === undefined) return undefined;
    return { score: Number(score), isBlacklisted: blacklisted, isTrusted: Number(score) >= DEFAULT_TRUST_THRESHOLD && !blacklisted };
  }, [score, blacklisted]);

  return {
    data: reputationData,
    score: reputationData?.score ?? 500,
    isBlacklisted: reputationData?.isBlacklisted ?? false,
    isTrusted: reputationData?.isTrusted ?? false,
    isLoading,
    error: null,
  };
}

function useNoopReputation() {
  return {
    data: undefined,
    score: 500,
    isBlacklisted: false,
    isTrusted: false,
    isLoading: false,
    error: null,
  };
}

function useInjectedCanReport(adapter: import('../adapters/types').IReputationAdapter, address: `0x${string}` | undefined) {
  const { data: canReport, isLoading } = useQuery({
    queryKey: ['payid', 'canReport', 'injected', adapter.name, address],
    queryFn: async () => {
      if (!address) return false;
      return adapter.canReport(address);
    },
    enabled: !!address,
    staleTime: 30_000,
  });

  return {
    canReport: canReport ?? false,
    score: canReport ? 700 : 0,
    isLoading,
  };
}

function useContractCanReport(contracts: import('../types').PayIDContracts, registryAddress: `0x${string}` | undefined, address: `0x${string}` | undefined) {
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!address && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading } = useReadContracts({
    contracts: enabled
      ? [
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'getReputation', args: [address!] },
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'minReporterReputation' },
      ]
      : [],
    query: { enabled },
  });

  const score = data?.[0]?.result;
  const minReporterReputation = data?.[1]?.result;
  const threshold = Number(minReporterReputation ?? 100);

  return {
    canReport: (score ?? 500) >= threshold,
    score: Number(score ?? 500),
    isLoading,
  };
}

function useInjectedVranConfig(adapter: import('../adapters/types').IReputationAdapter) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['payid', 'vranConfig', 'injected', adapter.name],
    queryFn: () => adapter.getConfig(),
    staleTime: 60_000, // 1min cache — config rarely changes
  });

  const cfg = result ?? { minStake: 0n, consensusThreshold: 0n, minReporterReputation: 0n, reportCount: 0, trustThreshold: 0 };
  return {
    minStake: cfg.minStake,
    consensusThreshold: Number(cfg.consensusThreshold),
    minReporterReputation: Number(cfg.minReporterReputation),
    reportCount: cfg.reportCount ?? 0,
    trustThreshold: cfg.trustThreshold ?? 0,
    isLoading,
  };
}

function useContractVranConfig(contracts: import('../types').PayIDContracts, registryAddress: `0x${string}` | undefined) {
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading } = useReadContracts({
    contracts: enabled
      ? [
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'minStake' },
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'consensusThreshold' },
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'minReporterReputation' },
        { address: resolvedRegistry, abi: VindexRegistryABI, functionName: 'reportCount' },
      ]
      : [],
    query: { enabled },
  });

  const minStake = data?.[0]?.result;
  const threshold = data?.[1]?.result;
  const minReporterReputation = data?.[2]?.result;
  const reportCount = data?.[3]?.result;

  return {
    minStake: minStake ?? 0n,
    consensusThreshold: threshold ?? 3,
    minReporterReputation: minReporterReputation ?? 700,
    reportCount: Number(reportCount ?? 0n),
    trustThreshold: DEFAULT_TRUST_THRESHOLD,
    isLoading,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Write Sub-Hooks (adapter-routed)
// ═══════════════════════════════════════════════════════════════════════════

function useInjectedSubmitReport(adapter: import('../adapters/types').IReputationAdapter) {
  const mutation = useMutation({
    mutationFn: async ({ target, evidenceHash, stake }: { target: `0x${string}`; evidenceHash: string; stake: bigint; }) => {
      if (!adapter.submitReport) throw new Error(`${adapter.label} does not support submitReport`);
      return adapter.submitReport(target, evidenceHash, stake);
    },
  });

  return {
    submitReport: (target: `0x${string}`, evidenceHash: string, stake: bigint) =>
      mutation.mutate({ target, evidenceHash, stake }),
    hash: mutation.data ?? undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useInjectedConfirmReport(adapter: import('../adapters/types').IReputationAdapter) {
  const mutation = useMutation({
    mutationFn: async ({ reportId }: { reportId: bigint; }) => {
      if (!adapter.confirmReport) throw new Error(`${adapter.label} does not support confirmReport`);
      return adapter.confirmReport(reportId);
    },
  });

  return {
    confirmReport: (reportId: bigint) => mutation.mutate({ reportId }),
    hash: mutation.data ?? undefined,
    isPending: mutation.isPending,
    isConfirming: false,
    isSuccess: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
  };
}

function useInjectedReport(
  adapter: import('../adapters/types').IReputationAdapter,
  reportId: bigint | undefined,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payid', 'report', 'injected', adapter.name, String(reportId)],
    queryFn: async () => {
      if (!adapter.getReport) throw new Error(`${adapter.label} does not support getReport`);
      if (reportId === undefined) throw new Error('No reportId');
      return adapter.getReport(reportId);
    },
    enabled: !!reportId && !!adapter.getReport,
    staleTime: 30_000,
  });

  const r = data;
  return {
    report: r
      ? {
        target: r.target,
        reporter: r.reporter,
        evidenceHash: r.evidenceHash,
        stake: r.stake,
        timestamp: 0n,
        confirmations: r.confirmations,
        resolved: r.resolved,
        valid: r.valid,
      }
      : undefined,
    isLoading,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Public Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @notice Read reputation score, blacklist status, and trust flag for an address.
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useReputation({ registryAddress, target }: UseReputationParams) {
  const { address: connectedAddress } = useAccount();
  const { contracts, reputation } = usePayIDContext();
  const account = target ?? connectedAddress;

  // ═══ Route by source — no casting needed ═══════════════════════════════

  // 1. INJECTED adapter (e.g. any platform) — call adapter directly
  if (reputation.info.source === 'injected') {
    return useInjectedReputation(reputation.adapter, account);
  }

  // 2. CONTRACT deployed (default VRAN) — use wagmi hooks
  if (reputation.info.source === 'contract') {
    return useContractReputation(contracts, registryAddress, account);
  }

  // 3. NOOP — feature disabled, return safe defaults
  return useNoopReputation();
}

/**
 * @notice Check if the connected wallet can submit a report (has minimum rep)
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useCanReport({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>) {
  const { address } = useAccount();
  const { contracts, reputation } = usePayIDContext();

  if (reputation.info.source === 'injected') {
    return useInjectedCanReport(reputation.adapter, address);
  }

  if (reputation.info.source === 'contract') {
    return useContractCanReport(contracts, registryAddress, address);
  }

  return { canReport: false, score: 500, isLoading: false };
}

/**
 * @notice Read global VRAN parameters
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useVranConfig({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>) {
  const { contracts, reputation } = usePayIDContext();

  if (reputation.info.source === 'injected') {
    return useInjectedVranConfig(reputation.adapter);
  }

  if (reputation.info.source === 'contract') {
    return useContractVranConfig(contracts, registryAddress);
  }

  return {
    minStake: 0n,
    consensusThreshold: 0,
    minReporterReputation: 0,
    reportCount: 0,
    trustThreshold: 0,
    isLoading: false,
  };
}

/**
 * @notice Read a single report by ID.
 */
export function useReport({ registryAddress, reportId }: Pick<UseReputationParams, 'registryAddress'> & { reportId?: bigint; }) {
  const { contracts, reputation } = usePayIDContext();

  // 1. INJECTED adapter — route read through adapter if getReport is supported
  if (reputation.info.source === 'injected' && reputation.adapter.getReport) {
    return useInjectedReport(reputation.adapter, reportId);
  }

  // 2. CONTRACT path — use wagmi readContract
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!reportId && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, error } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'reports',
    args: reportId !== undefined ? [reportId] : undefined,
    query: { enabled },
  });

  return {
    report: data
      ? {
        target: data[0],
        reporter: data[1],
        evidenceHash: data[2],
        stake: data[3],
        timestamp: data[4],
        confirmations: data[5],
        resolved: data[6],
        valid: data[7],
      }
      : undefined,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

function useInjectedSuccessfulReports(adapter: import('../adapters/types').IReputationAdapter, address: `0x${string}` | undefined) {
  const { data: count, isLoading, error } = useQuery({
    queryKey: ['payid', 'successfulReports', 'injected', adapter.name, address],
    queryFn: () => (address && adapter.getSuccessfulReports ? adapter.getSuccessfulReports(address) : Promise.resolve(0)),
    enabled: !!address && !!adapter.getSuccessfulReports,
    staleTime: 30_000,
  });

  return {
    count: count ?? 0,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

function useContractSuccessfulReports(contracts: import('../types').PayIDContracts, registryAddress: `0x${string}` | undefined, address: `0x${string}` | undefined) {
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!address && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, error } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'successfulReports',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  return {
    count: Number(data ?? 0n),
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

/**
 * @notice Read successful report count for an address.
 */
export function useSuccessfulReports({ registryAddress, target }: Pick<UseReputationParams, 'registryAddress' | 'target'>) {
  const { address: connectedAddress } = useAccount();
  const { contracts, reputation } = usePayIDContext();
  const account = target ?? connectedAddress;

  // 1. INJECTED — route read through adapter
  if (reputation.info.source === 'injected') {
    return useInjectedSuccessfulReports(reputation.adapter, account);
  }

  // 2. CONTRACT
  return useContractSuccessfulReports(contracts, registryAddress, account);
}

/**
 * @notice Submit a staked report against a target address.
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useSubmitReport({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>): TxHookResult & { submitReport: (target: `0x${string}`, evidenceHash: string, stake: bigint) => void; } {
  const { contracts, reputation } = usePayIDContext();

  // 1. INJECTED adapter — route write through adapter
  if (reputation.info.source === 'injected') {
    return useInjectedSubmitReport(reputation.adapter);
  }

  // 2. CONTRACT path — use wagmi writeContract
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const enabled = !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const submitReport = (target: `0x${string}`, evidenceHash: string, stake: bigint) => {
    if (!enabled) throw new Error('[VRAN] VindexRegistry address not configured');
    writeContract({
      address: resolvedRegistry,
      abi: VindexRegistryABI,
      functionName: 'submitReport',
      args: [target, evidenceHash],
      value: stake,
    });
  };

  return {
    submitReport,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * @notice Confirm an existing report (requires high reputation).
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useConfirmReport({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>): TxHookResult & { confirmReport: (reportId: bigint) => void; } {
  const { contracts, reputation } = usePayIDContext();

  // 1. INJECTED adapter — route write through adapter
  if (reputation.info.source === 'injected') {
    return useInjectedConfirmReport(reputation.adapter);
  }

  // 2. CONTRACT path — use wagmi writeContract
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const enabled = !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const confirmReport = (reportId: bigint) => {
    if (!enabled) throw new Error('[VRAN] VindexRegistry address not configured');
    writeContract({
      address: resolvedRegistry,
      abi: VindexRegistryABI,
      functionName: 'confirmReport',
      args: [reportId],
    });
  };

  return {
    confirmReport,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
