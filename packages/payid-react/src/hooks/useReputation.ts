import { useReadContract, useAccount } from 'wagmi';
import { useMemo } from 'react';
import { usePayIDContext } from '../PayIDProvider';

/*
 * VRAN — Vindex Reputation & Anti-Scam Network Hooks
 *
 * These hooks read from the VindexRegistry contract.
 * Install the ABI artifact after deploying VindexRegistry.sol.
 */

// Minimal ABI for VindexRegistry (reputation + blacklist views)
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

  return {
    minStake: minStake ?? 0n,
    consensusThreshold: threshold ?? 3,
  };
}
