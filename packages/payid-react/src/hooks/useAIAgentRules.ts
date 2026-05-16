import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import type { AgentRuleInfo, AgentSubscription, AgentWithRule } from '../types';
import type { Address, Hash } from 'viem';

/* ── Inline ABI fragments ─────────────────────────────────────────────── */

const AI_AGENT_RULE_MANAGER_ABI = [
  {
    name: 'agentRules',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'ruleSetHash', type: 'bytes32' },
      { name: 'setAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'subscriptions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' },
    ],
    outputs: [
      { name: 'expiry', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'preferredAgentOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'subscriberCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'subscriptionPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isSubscribed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'agent', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getEffectiveAgentRule',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'ruleSetHash', type: 'bytes32' },
      { name: 'agent', type: 'address' },
    ],
  },
  {
    name: 'getAgentsWithRules',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'agents', type: 'address[]' },
      { name: 'hashes', type: 'bytes32[]' },
    ],
  },
  {
    name: 'setAgentCombinedRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ruleSetHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'unsetAgentCombinedRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'subscribeToAgent',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
  },
  {
    name: 'unsubscribeFromAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
  },
  {
    name: 'setPreferredAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agent', type: 'address' }],
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

/* ── Hook: useAgentCombinedRule ─────────────────────────────────────── */

export function useAgentCombinedRule(agent: Address | undefined): QueryResult<AgentRuleInfo> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'agentRules',
    args: agent ? [agent] : undefined,
    query: {
      enabled:
        !!agent &&
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  const normalized = useMemo<AgentRuleInfo | undefined>(() => {
    if (!data) return undefined;
    const [ruleSetHash, setAt, active] = data as [Hash, bigint, boolean];
    return { ruleSetHash, setAt, active };
  }, [data]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useAgentSubscription ────────────────────────────────────── */

export function useAgentSubscription(
  user: Address | undefined,
  agent: Address | undefined,
): QueryResult<AgentSubscription> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'subscriptions',
    args: user && agent ? [user, agent] : undefined,
    query: {
      enabled:
        !!user &&
        !!agent &&
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  const normalized = useMemo<AgentSubscription | undefined>(() => {
    if (!data) return undefined;
    const [expiry, active] = data as [bigint, boolean];
    return { expiry, active };
  }, [data]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useIsSubscribedToAgent ──────────────────────────────────── */

export function useIsSubscribedToAgent(
  user: Address | undefined,
  agent: Address | undefined,
): QueryResult<boolean> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'isSubscribed',
    args: user && agent ? [user, agent] : undefined,
    query: {
      enabled:
        !!user &&
        !!agent &&
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  return { data: data as boolean | undefined, isLoading, isError, refetch };
}

/* ── Hook: usePreferredAgent ──────────────────────────────────────── */

export function usePreferredAgent(user: Address | undefined): QueryResult<Address> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'preferredAgentOf',
    args: user ? [user] : undefined,
    query: {
      enabled:
        !!user &&
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  return { data: (data as Address | undefined) ?? undefined, isLoading, isError, refetch };
}

/* ── Hook: useEffectiveAgentRule ────────────────────────────────────── */

export function useEffectiveAgentRule(user: Address | undefined): QueryResult<{
  ruleSetHash: Hash;
  agent: Address;
}> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'getEffectiveAgentRule',
    args: user ? [user] : undefined,
    query: {
      enabled:
        !!user &&
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  const normalized = useMemo<{ ruleSetHash: Hash; agent: Address; } | undefined>(() => {
    if (!data) return undefined;
    const [ruleSetHash, agent] = data as [Hash, Address];
    return { ruleSetHash, agent };
  }, [data]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useAllAgentsWithRules ────────────────────────────────────── */

export function useAllAgentsWithRules(): QueryListResult<AgentWithRule> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'getAgentsWithRules',
    query: {
      enabled:
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  const normalized = useMemo<AgentWithRule[]>(() => {
    if (!data) return [];
    const [agents, hashes] = data as [Address[], Hash[]];
    return agents.map((agent, i) => ({
      agent,
      ruleSetHash: hashes[i] ?? ('0x0000000000000000000000000000000000000000000000000000000000000000' as Hash),
    }));
  }, [data]);

  return { data: normalized, isLoading, isError, refetch };
}

/* ── Hook: useSubscriptionPrice ───────────────────────────────────── */

export function useAgentSubscriptionPrice(): QueryResult<bigint> {
  const { contracts } = usePayIDContext();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contracts.aiAgentRuleManager,
    abi: AI_AGENT_RULE_MANAGER_ABI,
    functionName: 'subscriptionPrice',
    query: {
      enabled:
        !!contracts.aiAgentRuleManager &&
        contracts.aiAgentRuleManager !== '0x0000000000000000000000000000000000000000',
    },
  });

  return { data: data as bigint | undefined, isLoading, isError, refetch };
}

/* ── Hook: useSetAgentCombinedRule ────────────────────────────────── */

export function useSetAgentCombinedRule(): TxHookResult & {
  setAgentCombinedRule: (ruleSetHash: Hash) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setAgentCombinedRule = (ruleSetHash: Hash) => {
    if (!contracts.aiAgentRuleManager) return;
    writeContract({
      address: contracts.aiAgentRuleManager,
      abi: AI_AGENT_RULE_MANAGER_ABI,
      functionName: 'setAgentCombinedRule',
      args: [ruleSetHash],
    });
  };

  return { setAgentCombinedRule, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useUnsetAgentCombinedRule ──────────────────────────────── */

export function useUnsetAgentCombinedRule(): TxHookResult & { unset: () => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const unset = () => {
    if (!contracts.aiAgentRuleManager) return;
    writeContract({
      address: contracts.aiAgentRuleManager,
      abi: AI_AGENT_RULE_MANAGER_ABI,
      functionName: 'unsetAgentCombinedRule',
    });
  };

  return { unset, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useSubscribeToAgent ────────────────────────────────────── */

export function useSubscribeToAgent(): TxHookResult & {
  subscribeToAgent: (params: { agent: Address; value: bigint; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const subscribeToAgent = (params: { agent: Address; value: bigint; }) => {
    if (!contracts.aiAgentRuleManager) return;
    writeContract({
      address: contracts.aiAgentRuleManager,
      abi: AI_AGENT_RULE_MANAGER_ABI,
      functionName: 'subscribeToAgent',
      args: [params.agent],
      value: params.value,
    });
  };

  return { subscribeToAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useUnsubscribeFromAgent ─────────────────────────────────── */

export function useUnsubscribeFromAgent(): TxHookResult & {
  unsubscribeFromAgent: (agent: Address) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const unsubscribeFromAgent = (agent: Address) => {
    if (!contracts.aiAgentRuleManager) return;
    writeContract({
      address: contracts.aiAgentRuleManager,
      abi: AI_AGENT_RULE_MANAGER_ABI,
      functionName: 'unsubscribeFromAgent',
      args: [agent],
    });
  };

  return { unsubscribeFromAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}

/* ── Hook: useSetPreferredAgent ───────────────────────────────────── */

export function useSetPreferredAgent(): TxHookResult & {
  setPreferredAgent: (agent: Address) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setPreferredAgent = (agent: Address) => {
    if (!contracts.aiAgentRuleManager) return;
    writeContract({
      address: contracts.aiAgentRuleManager,
      abi: AI_AGENT_RULE_MANAGER_ABI,
      functionName: 'setPreferredAgent',
      args: [agent],
    });
  };

  return { setPreferredAgent, hash, isPending, isConfirming, isSuccess, error: error ?? null };
}
