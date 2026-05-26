import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import type { RuleDefinition, SubscriptionInfo } from '../types';

interface ReadHookResult<T> {
  data: T;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'pending' | 'error' | 'success';
  refetch: () => void;
}

interface QueryListResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}
import RuleItemERC721Artifact from '../abis/PayIDModule#RuleItemERC721.json';

const RuleItemERC721ABI = RuleItemERC721Artifact.abi as Abi;

// useRuleCount
export function useRuleCount() {
  const { contracts } = usePayIDContext();

  return useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721ABI,
    functionName: 'nextRuleId',
  });
}

// useRule
export function useRule(ruleId: bigint | undefined): ReadHookResult<RuleDefinition | undefined> {
  const { contracts } = usePayIDContext();

  const result = useReadContracts({
    contracts: ruleId !== undefined ? [
      {
        address: contracts.ruleItemERC721,
        abi: RuleItemERC721ABI,
        functionName: 'getRule',
        args: [ruleId],
      },
      {
        address: contracts.ruleItemERC721,
        abi: RuleItemERC721ABI,
        functionName: 'ruleTokenId',
        args: [ruleId],
      },
    ] : [],
    query: { enabled: ruleId !== undefined },
  });

  const data = useMemo<RuleDefinition | undefined>(() => {
    const get0 = result.data?.[0];
    const raw0 = Array.isArray(get0) ? get0 : get0?.result;
    if (!raw0) return undefined;
    const [ruleHash, uri, creator, rootRuleId, version, deprecated, active] =
      raw0 as [string, string, string, bigint, number, boolean, boolean];
    const get1 = result.data?.[1];
    const tokenId = ((Array.isArray(get1) ? get1 : get1?.result) as bigint) ?? 0n;
    return {
      ruleId: ruleId!,
      ruleHash: ruleHash as `0x${string}`,
      uri,
      creator: creator as `0x${string}`,
      rootRuleId,
      version,
      deprecated,
      active,
      tokenId,
      expiry: 0n,
    };
  }, [result.data, ruleId]);

  return { ...result, data };
}

// useRules
export function useRules(options?: { onlyActive?: boolean; creator?: `0x${string}`; }): QueryListResult<RuleDefinition> {
  const { contracts } = usePayIDContext();

  const { data: nextRuleId } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721ABI,
    functionName: 'nextRuleId',
  });

  // FIX: nextRuleId starts at 0, increments to 1 on first createRule.
  // ruleIds are 1..nextRuleId (inclusive). count = nextRuleId, NOT nextRuleId - 1.
  // Old code: `count = Number(nextRuleId) - 1` → if 1 rule exists: count=0 → empty array!
  const count = nextRuleId ? Number(nextRuleId as bigint) : 0;

  const ruleIds = useMemo(
    () => Array.from({ length: count }, (_, i) => BigInt(i + 1)),
    [count]
  );

  const result = useReadContracts({
    contracts: ruleIds.map(ruleId => ({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI,
      functionName: 'getRule',
      args: [ruleId],
    })),
    query: { enabled: count > 0 },
  });

  const tokenResult = useReadContracts({
    contracts: ruleIds.map(ruleId => ({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI,
      functionName: 'ruleTokenId',
      args: [ruleId],
    })),
    query: { enabled: count > 0 },
  });

  const data = useMemo<RuleDefinition[]>(() => {
    if (!result.data) return [];

    return result.data
      .map((item, i) => {
        // FIX: wagmi useReadContracts may return either:
        //   - wrapped: { result: T, status: 'success'|'failure' }
        //   - direct: T (when allowFailure is false or older wagmi versions)
        // Handle both shapes so we never silently drop valid data.
        const raw = Array.isArray(item) ? item : item?.result;
        const isFailed = !Array.isArray(item) && item?.status === 'failure';
        if (isFailed || !raw) return null;

        const [ruleHash, uri, creator, rootRuleId, version, deprecated, active] =
          raw as [string, string, string, bigint, number, boolean, boolean];

        const tokenItem = tokenResult.data?.[i];
        const tokenRaw = Array.isArray(tokenItem) ? tokenItem : tokenItem?.result;
        const tokenId = (tokenRaw as bigint) ?? 0n;

        return {
          ruleId: ruleIds[i]!,
          ruleHash: ruleHash as `0x${string}`,
          uri,
          creator: creator as `0x${string}`,
          rootRuleId,
          version,
          deprecated,
          active,
          tokenId,
          expiry: 0n,
        } satisfies RuleDefinition;
      })
      .filter((r): r is RuleDefinition => {
        if (!r) return false;
        if (options?.onlyActive && !r.active) return false;
        if (options?.creator && r.creator.toLowerCase() !== options.creator.toLowerCase()) return false;
        return true;
      });
  }, [result.data, tokenResult.data, ruleIds, options?.onlyActive, options?.creator]);

  return {
    data,
    isLoading: result.isLoading || tokenResult.isLoading,
    isError: result.isError || tokenResult.isError,
    refetch: result.refetch,
  };
}

// useMyRules
export function useMyRules(): QueryListResult<RuleDefinition> {
  const { address } = useAccount();
  return useRules({ creator: address });
}

// useRuleExpiry
export function useRuleExpiry(tokenId: bigint | undefined) {
  const { contracts } = usePayIDContext();

  return useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721ABI,
    functionName: 'ruleExpiry',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && tokenId > 0n },
  });
}

// useSubscription
export function useSubscription(address: `0x${string}` | undefined): ReadHookResult<SubscriptionInfo | undefined> {
  const { contracts } = usePayIDContext();

  const result = useReadContracts({
    contracts: address ? [
      {
        address: contracts.ruleItemERC721,
        abi: RuleItemERC721ABI,
        functionName: 'subscriptionExpiry',
        args: [address],
      },
      {
        address: contracts.ruleItemERC721,
        abi: RuleItemERC721ABI,
        functionName: 'logicalRuleCount',
        args: [address],
      },
      {
        address: contracts.ruleItemERC721,
        abi: RuleItemERC721ABI,
        functionName: 'MAX_SLOT',
      },
    ] : [],
    query: { enabled: !!address },
  });

  const data = useMemo(() => {
    const unwrap = (idx: number) => {
      const item = result.data?.[idx];
      if (item == null) return null;
      return typeof item === 'object' && 'result' in item ? item.result : item;
    };
    const expiryRaw = unwrap(0);
    if (expiryRaw == null) return undefined;
    const expiry = expiryRaw as bigint;
    const logicalRuleCount = Number(unwrap(1) ?? 0);
    const maxSlots = Number(unwrap(2) ?? 1);
    const now = BigInt(Math.floor(Date.now() / 1000));
    return {
      expiry,
      isActive: expiry >= now,
      logicalRuleCount,
      maxSlots: expiry >= now ? maxSlots : 1,
    };
  }, [result.data]);

  return { ...result, data };
}