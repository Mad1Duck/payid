import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import type { AIAgent, AdminAgent } from '../types';
import type { Address, Hash } from 'viem';

/* ── Inline ABI fragments ─────────────────────────────────────────────── */

const AI_AGENT_REGISTRY_ABI = [
  // ── Admin Agent Views ──
  {
    name: 'adminAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'agentWallet', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: 'displayName', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'encryptedURI', type: 'string' },
      { name: 'publicEndpoint', type: 'string' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'isAdminAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getAllAdminAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'agentWallet', type: 'address' },
          { name: 'owner', type: 'address' },
          { name: 'displayName', type: 'string' },
          { name: 'metadataHash', type: 'bytes32' },
          { name: 'encryptedURI', type: 'string' },
          { name: 'publicEndpoint', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getActiveAdminAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'agentWallet', type: 'address' },
          { name: 'owner', type: 'address' },
          { name: 'displayName', type: 'string' },
          { name: 'metadataHash', type: 'bytes32' },
          { name: 'encryptedURI', type: 'string' },
          { name: 'publicEndpoint', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  // ── User Agent Views ──
  {
    name: 'userAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'handle', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'modelType', type: 'string' },
      { name: 'computeProvider', type: 'string' },
      { name: 'computeEndpoint', type: 'string' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'verified', type: 'bool' },
      { name: 'reputationScore', type: 'uint256' },
      { name: 'totalInferences', type: 'uint256' },
      { name: 'lastActiveAt', type: 'uint256' },
    ],
  },
  {
    name: 'isUserAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'resolveUserHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'userAgentHandleOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'getActiveUserAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'handle', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'modelType', type: 'string' },
          { name: 'computeProvider', type: 'string' },
          { name: 'computeEndpoint', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'verified', type: 'bool' },
          { name: 'reputationScore', type: 'uint256' },
          { name: 'totalInferences', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getVerifiedUserAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'handle', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'modelType', type: 'string' },
          { name: 'computeProvider', type: 'string' },
          { name: 'computeEndpoint', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'verified', type: 'bool' },
          { name: 'reputationScore', type: 'uint256' },
          { name: 'totalInferences', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getUserAgentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'admin',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── Admin Agent Write ──
  {
    name: 'registerAdminAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentWallet', type: 'address' },
      { name: 'displayName', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'encryptedURI', type: 'string' },
      { name: 'publicEndpoint', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'updateAdminAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentWallet', type: 'address' },
      { name: 'displayName', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'encryptedURI', type: 'string' },
      { name: 'publicEndpoint', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'deactivateAdminAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentWallet', type: 'address' }],
    outputs: [],
  },
  {
    name: 'reactivateAdminAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentWallet', type: 'address' }],
    outputs: [],
  },
  // ── User Agent Write ──
  {
    name: 'registerUserAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'handle', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'modelType', type: 'string' },
      { name: 'computeProvider', type: 'string' },
      { name: 'computeEndpoint', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'updateUserAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'modelType', type: 'string' },
      { name: 'computeProvider', type: 'string' },
      { name: 'computeEndpoint', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'deactivateUserAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'reactivateUserAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'verifyUserAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [],
  },
  {
    name: 'recordUserInference',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'updateUserReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'newScore', type: 'uint256' },
    ],
    outputs: [],
  },
] as const satisfies Abi;

/* ── Types ──────────────────────────────────────────────────────────── */

interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface QueryListResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface TxHookResult {
  hash: `0x${string}` | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function normalizeAdminAgent(raw: unknown): AdminAgent {
  const a = raw as any;
  return {
    agentWallet: (a.agentWallet ?? '0x0000000000000000000000000000000000000000') as Address,
    owner: (a.owner ?? '0x0000000000000000000000000000000000000000') as Address,
    displayName: String(a.displayName ?? ''),
    metadataHash: (a.metadataHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000') as Hash,
    encryptedURI: String(a.encryptedURI ?? ''),
    publicEndpoint: String(a.publicEndpoint ?? ''),
    registeredAt: BigInt(a.registeredAt ?? 0),
    active: Boolean(a.active ?? false),
  };
}

function normalizeUserAgent(raw: unknown, address: Address): AIAgent {
  const a = raw as any;
  return {
    owner: (a.owner ?? address) as Address,
    handle: String(a.handle ?? ''),
    name: String(a.name ?? ''),
    metadataURI: String(a.metadataURI ?? ''),
    modelType: String(a.modelType ?? ''),
    computeProvider: String(a.computeProvider ?? ''),
    computeEndpoint: String(a.computeEndpoint ?? ''),
    registeredAt: BigInt(a.registeredAt ?? 0),
    active: Boolean(a.active ?? false),
    verified: Boolean(a.verified ?? false),
    reputationScore: BigInt(a.reputationScore ?? 0),
    totalInferences: BigInt(a.totalInferences ?? 0),
    lastActiveAt: BigInt(a.lastActiveAt ?? 0),
  };
}

function useContractEnabled() {
  const { contracts } = usePayIDContext();
  return !!contracts.aiAgentRegistry && contracts.aiAgentRegistry !== '0x0000000000000000000000000000000000000000';
}

/* ════════════════════════════════════════════════════════════════════
   ADMIN AGENT HOOKS
   ════════════════════════════════════════════════════════════════════ */

/* ── Hook: useIsAdminAIAgent ────────────────────────────────────────── */

export function useIsAdminAIAgent(address: Address | undefined): QueryResult<boolean> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'isAdminAgent',
    args: address ? [address] : undefined,
    query: { enabled: !!address && enabled },
  });

  return { data: data as boolean | undefined, isLoading, isError, refetch };
}

/* ── Hook: useAdminAIAgent ─────────────────────────────────────────── */

export function useAdminAIAgent(address: Address | undefined): QueryResult<AdminAgent> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'adminAgents',
    args: address ? [address] : undefined,
    query: { enabled: !!address && enabled },
  });

  const normalized = useMemo<AdminAgent | undefined>(() => {
    if (!data || !address) return undefined;
    return normalizeAdminAgent(data);
  }, [data, address]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useAllAdminAIAgents ─────────────────────────────────────── */

export function useAllAdminAIAgents(options?: { onlyActive?: boolean; }): QueryListResult<AdminAgent> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();
  const onlyActive = options?.onlyActive ?? true;

  const functionName = onlyActive ? 'getActiveAdminAgents' : 'getAllAdminAgents';

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName,
    query: { enabled },
  });

  const normalized = useMemo<AdminAgent[]>(() => {
    if (!data || !Array.isArray(data)) return [];
    return (data as any[]).map((a) => normalizeAdminAgent(a));
  }, [data]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useRegisterAdminAIAgent ─────────────────────────────────── */

export function useRegisterAdminAIAgent(): TxHookResult & {
  registerAgent: (params: {
    agentWallet: Address;
    displayName: string;
    metadataHash: Hash;
    encryptedURI: string;
    publicEndpoint: string;
  }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const registerAgent = (params: {
    agentWallet: Address;
    displayName: string;
    metadataHash: Hash;
    encryptedURI: string;
    publicEndpoint: string;
  }) => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'registerAdminAgent',
      args: [params.agentWallet, params.displayName, params.metadataHash, params.encryptedURI, params.publicEndpoint],
    });
  };

  return { registerAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useUpdateAdminAIAgent ───────────────────────────────────── */

export function useUpdateAdminAIAgent(): TxHookResult & {
  updateAgent: (params: {
    agentWallet: Address;
    displayName: string;
    metadataHash: Hash;
    encryptedURI: string;
    publicEndpoint: string;
  }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const updateAgent = (params: {
    agentWallet: Address;
    displayName: string;
    metadataHash: Hash;
    encryptedURI: string;
    publicEndpoint: string;
  }) => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'updateAdminAgent',
      args: [params.agentWallet, params.displayName, params.metadataHash, params.encryptedURI, params.publicEndpoint],
    });
  };

  return { updateAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useDeactivateAdminAIAgent ───────────────────────────────── */

export function useDeactivateAdminAIAgent(): TxHookResult & {
  deactivate: (agentWallet: Address) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deactivate = (agentWallet: Address) => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'deactivateAdminAgent',
      args: [agentWallet],
    });
  };

  return { deactivate, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useRegistryAdmin ────────────────────────────────────────── */

export function useRegistryAdmin(): QueryResult<Address> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'admin',
    query: { enabled },
  });

  return { data: (data as Address | undefined) ?? undefined, isLoading, isError, refetch };
}

/* ════════════════════════════════════════════════════════════════════
   USER AGENT HOOKS
   ════════════════════════════════════════════════════════════════════ */

/* ── Hook: useIsUserAIAgent ────────────────────────────────────────── */

export function useIsUserAIAgent(address: Address | undefined): QueryResult<boolean> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'isUserAgent',
    args: address ? [address] : undefined,
    query: { enabled: !!address && enabled },
  });

  return { data: data as boolean | undefined, isLoading, isError, refetch };
}

/* ── Hook: useUserAIAgent ──────────────────────────────────────────── */

export function useUserAIAgent(address: Address | undefined): QueryResult<AIAgent> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'userAgents',
    args: address ? [address] : undefined,
    query: { enabled: !!address && enabled },
  });

  const normalized = useMemo<AIAgent | undefined>(() => {
    if (!data || !address) return undefined;
    return normalizeUserAgent(data, address);
  }, [data, address]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useUserAIAgentByHandle ──────────────────────────────────── */

export function useUserAIAgentByHandle(handle: string | undefined): QueryResult<AIAgent> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();

  const { data: resolvedAddress, isLoading: resolving, isError: resolveError } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'resolveUserHandle',
    args: handle ? [handle] : undefined,
    query: { enabled: !!handle && enabled },
  });

  const addr = (resolvedAddress as Address | undefined) ?? undefined;

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName: 'userAgents',
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr && enabled },
  });

  const normalized = useMemo<AIAgent | undefined>(() => {
    if (!data || !addr) return undefined;
    return normalizeUserAgent(data, addr);
  }, [data, addr]);

  return { data: normalized, isLoading: resolving || isLoading, isError: resolveError || isError, refetch };
}

/* ── Hook: useAllUserAIAgents ──────────────────────────────────────── */

export function useAllUserAIAgents(options?: { onlyActive?: boolean; verifiedOnly?: boolean; }): QueryListResult<AIAgent> {
  const enabled = useContractEnabled();
  const { contracts } = usePayIDContext();
  const verifiedOnly = options?.verifiedOnly ?? false;

  const functionName = verifiedOnly ? 'getVerifiedUserAgents' : 'getActiveUserAgents';

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRegistry,
    abi: AI_AGENT_REGISTRY_ABI,
    functionName,
    query: { enabled },
  });

  const normalized = useMemo<AIAgent[]>(() => {
    if (!data || !Array.isArray(data)) return [];
    return (data as any[]).map((a) =>
      normalizeUserAgent(a, '0x0000000000000000000000000000000000000000' as Address),
    );
  }, [data]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useRegisterUserAIAgent ──────────────────────────────────── */

export function useRegisterUserAIAgent(): TxHookResult & {
  registerAgent: (params: {
    handle: string;
    name: string;
    metadataURI: string;
    modelType: string;
    computeProvider: string;
    computeEndpoint: string;
  }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const registerAgent = (params: {
    handle: string;
    name: string;
    metadataURI: string;
    modelType: string;
    computeProvider: string;
    computeEndpoint: string;
  }) => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'registerUserAgent',
      args: [params.handle, params.name, params.metadataURI, params.modelType, params.computeProvider, params.computeEndpoint],
    });
  };

  return { registerAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useUpdateUserAIAgent ────────────────────────────────────── */

export function useUpdateUserAIAgent(): TxHookResult & {
  updateAgent: (params: {
    name: string;
    metadataURI: string;
    modelType: string;
    computeProvider: string;
    computeEndpoint: string;
  }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const updateAgent = (params: {
    name: string;
    metadataURI: string;
    modelType: string;
    computeProvider: string;
    computeEndpoint: string;
  }) => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'updateUserAgent',
      args: [params.name, params.metadataURI, params.modelType, params.computeProvider, params.computeEndpoint],
    });
  };

  return { updateAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useDeactivateUserAIAgent ────────────────────────────────── */

export function useDeactivateUserAIAgent(): TxHookResult & { deactivate: () => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deactivate = () => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'deactivateUserAgent',
    });
  };

  return { deactivate, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useVerifyUserAIAgent ────────────────────────────────────── */

export function useVerifyUserAIAgent(): TxHookResult & { verify: (owner: Address) => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const verify = (owner: Address) => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'verifyUserAgent',
      args: [owner],
    });
  };

  return { verify, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useRecordUserInference ──────────────────────────────────── */

export function useRecordUserInference(): TxHookResult & { record: () => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const record = () => {
    if (!contracts.aiAgentRegistry) return;
    writeContract({
      address: contracts.aiAgentRegistry,
      abi: AI_AGENT_REGISTRY_ABI,
      functionName: 'recordUserInference',
    });
  };

  return { record, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ════════════════════════════════════════════════════════════════════
   BACKWARD COMPATIBILITY ALIASES
   (Old hook names → User agent hooks)
   ════════════════════════════════════════════════════════════════════ */

export const useIsAIAgent = useIsUserAIAgent;
export const useAIAgent = useUserAIAgent;
export const useAIAgentByHandle = useUserAIAgentByHandle;
export const useAllAIAgents = useAllUserAIAgents;
export const useRegisterAIAgent = useRegisterUserAIAgent;
export const useUpdateAIAgent = useUpdateUserAIAgent;
export const useDeactivateAIAgent = useDeactivateUserAIAgent;
export const useRecordInference = useRecordUserInference;
export const useVerifyAgent = useVerifyUserAIAgent;
