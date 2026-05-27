import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import type { Hash } from 'viem';
import { useMemo } from 'react';
import { usePayIDContext } from '../PayIDProvider';

interface TxHookResult {
  hash: Hash | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

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
    name: 'reputationOf',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reportsAgainst',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getReportsAgainst',
    inputs: [{ name: 'target', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
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

interface UseReputationParams {
  /** Override registry address. If omitted, reads from PayIDContext.contracts.vindexRegistry */
  registryAddress?: `0x${string}`;
  target?: `0x${string}`;
}

interface ReputationData {
  score: number;
  isBlacklisted: boolean;
  isTrusted: boolean;
}

/**
 * @notice Read reputation score, blacklist status, and trust flag for an address.
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useReputation({ registryAddress, target }: UseReputationParams) {
  const { address: connectedAddress } = useAccount();
  const { contracts } = usePayIDContext();
  const account = target ?? connectedAddress;

  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!account && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data: score } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'getReputation',
    args: account ? [account] : undefined,
    query: { enabled },
  });

  const { data: blacklisted } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'isBlacklisted',
    args: account ? [account] : undefined,
    query: { enabled },
  });

  const { data: trusted } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'isTrusted',
    args: account ? [account, 700] : undefined,
    query: { enabled },
  });

  const data: ReputationData | undefined = useMemo(() => {
    if (score === undefined || blacklisted === undefined || trusted === undefined) return undefined;
    return {
      score: Number(score),
      isBlacklisted: blacklisted,
      isTrusted: trusted,
    };
  }, [score, blacklisted, trusted]);

  return {
    data,
    score: data?.score ?? 500,
    isBlacklisted: data?.isBlacklisted ?? false,
    isTrusted: data?.isTrusted ?? false,
    isLoading: enabled && (score === undefined || blacklisted === undefined || trusted === undefined),
  };
}

/**
 * @notice Check if the connected wallet can submit a report (has minimum rep)
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useCanReport({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>) {
  const { address } = useAccount();
  const { contracts } = usePayIDContext();
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!address && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data: score } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'getReputation',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  return {
    canReport: (score ?? 500) >= 100,
    score: Number(score ?? 500),
  };
}

/**
 * @notice Read global VRAN parameters
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useVranConfig({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>) {
  const { contracts } = usePayIDContext();
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data: minStake } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'minStake',
    query: { enabled },
  });

  const { data: threshold } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'consensusThreshold',
    query: { enabled },
  });

  const { data: minReporterReputation } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'minReporterReputation',
    query: { enabled },
  });

  const { data: reportCount } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'reportCount',
    query: { enabled },
  });

  return {
    minStake: minStake ?? 0n,
    consensusThreshold: threshold ?? 3,
    minReporterReputation: minReporterReputation ?? 700,
    reportCount: Number(reportCount ?? 0n),
  };
}

/**
 * @notice Read a single report by ID.
 */
export function useReport({ registryAddress, reportId }: Pick<UseReputationParams, 'registryAddress'> & { reportId?: bigint; }) {
  const { contracts } = usePayIDContext();
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!reportId && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading } = useReadContract({
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
  };
}

/**
 * @notice Read successful report count for an address.
 */
export function useSuccessfulReports({ registryAddress, target }: Pick<UseReputationParams, 'registryAddress' | 'target'>) {
  const { address: connectedAddress } = useAccount();
  const { contracts } = usePayIDContext();
  const account = target ?? connectedAddress;
  const resolvedRegistry = registryAddress ?? contracts.vindexRegistry;
  const enabled = !!account && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'successfulReports',
    args: account ? [account] : undefined,
    query: { enabled },
  });

  return {
    count: Number(data ?? 0n),
    isLoading,
  };
}

/**
 * @notice Submit a staked report against a target address.
 * Reads vindexRegistry from PayIDContext if registryAddress is not provided.
 */
export function useSubmitReport({ registryAddress }: Pick<UseReputationParams, 'registryAddress'>): TxHookResult & { submitReport: (target: `0x${string}`, evidenceHash: string, stake: bigint) => void; } {
  const { contracts } = usePayIDContext();
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
  const { contracts } = usePayIDContext();
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
