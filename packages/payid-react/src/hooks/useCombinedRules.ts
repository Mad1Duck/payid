import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import type { CombinedRule, RuleRef, RuleSet } from '../types';

interface QueryListResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

import { RuleDirection } from '../types';
import CombinedRuleStorageArtifact from '../abis/PayIDModule#CombinedRuleStorage.json';
import RuleAuthorityArtifact from '../abis/PayIDModule#RuleAuthority.json';

const CombinedRuleStorageABI = CombinedRuleStorageArtifact.abi as Abi;
const RuleAuthorityABI = RuleAuthorityArtifact.abi as Abi;

// useAllCombinedRules
export function useAllCombinedRules(options?: { onlyActive?: boolean; }): QueryListResult<CombinedRule> {
  const { contracts } = usePayIDContext();

  const onlyActive = options?.onlyActive;

  const { data: hashes, isLoading: loadingHashes } = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'listAllRuleSetHashes',
  });

  const allHashes = useMemo<`0x${string}`[]>(
    () => (hashes as `0x${string}`[]) ?? [],
    [hashes]
  );

  const ruleContracts = useMemo(
    () =>
      allHashes.map(hash => ({
        address: contracts.combinedRuleStorage,
        abi: CombinedRuleStorageABI,
        functionName: 'getRuleByHash' as const,
        args: [hash] as const,
      })),
    [allHashes, contracts.combinedRuleStorage]
  );

  const activeContracts = useMemo(
    () =>
      allHashes.map(hash => ({
        address: contracts.combinedRuleStorage,
        abi: CombinedRuleStorageABI,
        functionName: 'isActive' as const,
        args: [hash] as const,
      })),
    [allHashes, contracts.combinedRuleStorage]
  );

  const result = useReadContracts({
    contracts: ruleContracts,
    query: { enabled: allHashes.length > 0 },
  });

  const activeResult = useReadContracts({
    contracts: activeContracts,
    query: { enabled: allHashes.length > 0 },
  });

  const data = useMemo<CombinedRule[]>(() => {
    if (!result.data) return [];
    return result.data
      .map((item, i) => {
        const raw = Array.isArray(item) ? item : item?.result;
        if (!raw) return null;
        const [owner, ruleRefs, version] = raw as [string, RuleRef[], bigint];
        const activeItem = activeResult.data?.[i];
        const activeRaw = Array.isArray(activeItem) ? activeItem : activeItem?.result;
        const active = (activeRaw as boolean) ?? false;
        return {
          hash: allHashes[i]!,
          owner: owner as `0x${string}`,
          version,
          active,
          ruleRefs,
        } satisfies CombinedRule;
      })
      .filter((r): r is CombinedRule => {
        if (!r) return false;
        if (onlyActive && !r.active) return false;
        return true;
      });
  }, [result.data, activeResult.data, allHashes, onlyActive]);

  return {
    data,
    isLoading: loadingHashes || result.isLoading || activeResult.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

// useActiveCombinedRule
export function useActiveCombinedRule(owner: `0x${string}` | undefined): QueryResult<CombinedRule> {
  const { contracts } = usePayIDContext();

  const { data: hash } = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getActiveRuleOf',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  const stableHash = hash as `0x${string}` | undefined;

  const result = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getRuleByHash',
    args: stableHash ? [stableHash] : undefined,
    query: { enabled: !!stableHash },
  });

  const data = useMemo<CombinedRule | undefined>(() => {
    if (!result.data || !stableHash) return undefined;
    const [ownerAddr, ruleRefs, version] = result.data as [string, RuleRef[], bigint];
    return {
      hash: stableHash,
      owner: ownerAddr as `0x${string}`,
      version,
      active: true,
      ruleRefs,
    };
  }, [result.data, stableHash]);

  return {
    data,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

// useActiveCombinedRuleByDirection
export function useActiveCombinedRuleByDirection(
  owner: `0x${string}` | undefined,
  direction: RuleDirection
): QueryResult<CombinedRule> {
  const { contracts } = usePayIDContext();

  const { data: hash } = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getActiveRuleOfByDirection',
    args: owner ? [owner, direction] : undefined,
    query: { enabled: !!owner },
  });

  const stableHash = hash as `0x${string}` | undefined;

  const result = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getRuleByHash',
    args: stableHash ? [stableHash] : undefined,
    query: { enabled: !!stableHash },
  });

  const data = useMemo<CombinedRule | undefined>(() => {
    if (!result.data || !stableHash) return undefined;
    const [ownerAddr, ruleRefs, version] = result.data as [string, RuleRef[], bigint];
    return {
      hash: stableHash,
      owner: ownerAddr as `0x${string}`,
      version,
      active: true,
      ruleRefs,
      direction,
    };
  }, [result.data, stableHash, direction]);

  return {
    data,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

// useOwnerRuleSets
export function useOwnerRuleSets(owner: `0x${string}` | undefined): QueryListResult<RuleSet> {
  const { contracts } = usePayIDContext();

  const { data: hashes, isLoading: loadingHashes } = useReadContract({
    address: contracts.ruleAuthority,
    abi: RuleAuthorityABI,
    functionName: 'getOwnerRuleSets',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  const allHashes = useMemo<`0x${string}`[]>(
    () => (hashes as `0x${string}`[]) ?? [],
    [hashes]
  );

  const ruleSetContracts = useMemo(
    () =>
      allHashes.map(hash => ({
        address: contracts.ruleAuthority,
        abi: RuleAuthorityABI,
        functionName: 'getRuleSet' as const,
        args: [hash] as const,
      })),
    [allHashes, contracts.ruleAuthority]
  );

  const ruleRefContracts = useMemo(
    () =>
      allHashes.map(hash => ({
        address: contracts.ruleAuthority,
        abi: RuleAuthorityABI,
        functionName: 'getRuleByHash' as const,
        args: [hash] as const,
      })),
    [allHashes, contracts.ruleAuthority]
  );

  const result = useReadContracts({
    contracts: ruleSetContracts,
    query: { enabled: allHashes.length > 0 },
  });

  const refsResult = useReadContracts({
    contracts: ruleRefContracts,
    query: { enabled: allHashes.length > 0 },
  });

  const data = useMemo(() => {
    if (!result.data) return [];
    return result.data
      .map((item, i) => {
        const raw = Array.isArray(item) ? item : item?.result;
        if (!raw) return null;
        const [ownerAddr, version, active, registeredAt, refCount] =
          raw as [string, bigint, boolean, bigint, bigint];
        let ruleRefs: RuleRef[] = [];
        try {
          const refsItem = refsResult.data?.[i];
          const refsData = Array.isArray(refsItem) ? refsItem : refsItem?.result;
          if (refsData) {
            const [, refs] = refsData as [string, RuleRef[], bigint];
            ruleRefs = refs;
          }
        } catch { }
        return {
          hash: allHashes[i]!,
          owner: ownerAddr as `0x${string}`,
          version,
          active,
          registeredAt,
          refCount,
          ruleRefs,
        };
      })
      .filter((r): r is RuleSet => r !== null);
  }, [result.data, refsResult.data, allHashes]);

  return {
    data,
    isLoading: loadingHashes || result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

// useMyRuleSets
export function useMyRuleSets(): QueryListResult<RuleSet> {
  const { address } = useAccount();
  return useOwnerRuleSets(address);
}