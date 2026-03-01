import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import type { RuleDefinition } from '../types';
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
export function useRule(ruleId: bigint | undefined) {
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
    if (!result.data?.[0]?.result) return undefined;
    const [ruleHash, uri, creator, rootRuleId, version, deprecated, active] =
      result.data[0].result as [string, string, string, bigint, number, boolean, boolean];
    const tokenId = (result.data[1]?.result as bigint) ?? 0n;
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
export function useRules(options?: { onlyActive?: boolean; creator?: `0x${string}`; }) {
  const { contracts } = usePayIDContext();

  const { data: nextRuleId } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721ABI,
    functionName: 'nextRuleId',
  });

  const count = nextRuleId ? Number(nextRuleId as bigint) - 1 : 0;
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
        if (!item?.result) return null;
        const [ruleHash, uri, creator, rootRuleId, version, deprecated, active] =
          item.result as [string, string, string, bigint, number, boolean, boolean];
        const tokenId = (tokenResult.data?.[i]?.result as bigint) ?? 0n;
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
export function useMyRules() {
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
export function useSubscription(address: `0x${string}` | undefined) {
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
    if (!result.data?.[0]?.result) return undefined;
    const expiry = result.data[0].result as bigint;
    const logicalRuleCount = Number(result.data[1]?.result ?? 0);
    const maxSlots = Number(result.data[2]?.result ?? 1);
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