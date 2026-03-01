import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import type { CombinedRule, RuleRef } from '../types';
import { RuleDirection } from '../types';
import CombinedRuleStorageArtifact from '../abis/PayIDModule#CombinedRuleStorage.json';
import RuleAuthorityArtifact from '../abis/PayIDModule#RuleAuthority.json';

const CombinedRuleStorageABI = CombinedRuleStorageArtifact.abi as Abi;
const RuleAuthorityABI = RuleAuthorityArtifact.abi as Abi;

// useAllCombinedRules

export function useAllCombinedRules(options?: { onlyActive?: boolean; }) {
  const { contracts } = usePayIDContext();

  const { data: hashes, isLoading: loadingHashes } = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'listAllRuleSetHashes',
  });

  const allHashes = (hashes as `0x${string}`[]) ?? [];

  const result = useReadContracts({
    contracts: allHashes.map(hash => ({
      address: contracts.combinedRuleStorage,
      abi: CombinedRuleStorageABI,
      functionName: 'getRuleByHash',
      args: [hash],
    })),
    query: { enabled: allHashes.length > 0 },
  });

  const activeResult = useReadContracts({
    contracts: allHashes.map(hash => ({
      address: contracts.combinedRuleStorage,
      abi: CombinedRuleStorageABI,
      functionName: 'isActive',
      args: [hash],
    })),
    query: { enabled: allHashes.length > 0 },
  });

  const data = useMemo<CombinedRule[]>(() => {
    if (!result.data) return [];
    return result.data
      .map((item, i) => {
        if (!item?.result) return null;
        const [owner, ruleRefs, version] = item.result as [string, RuleRef[], bigint];
        const active = (activeResult.data?.[i]?.result as boolean) ?? false;
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
        if (options?.onlyActive && !r.active) return false;
        return true;
      });
  }, [result.data, activeResult.data, allHashes, options?.onlyActive]);

  return {
    data,
    isLoading: loadingHashes || result.isLoading || activeResult.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

// useActiveCombinedRule

export function useActiveCombinedRule(owner: `0x${string}` | undefined) {
  const { contracts } = usePayIDContext();

  const { data: hash } = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getActiveRuleOf',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  const result = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getRuleByHash',
    args: hash ? [hash as `0x${string}`] : undefined,
    query: { enabled: !!hash },
  });

  const data = useMemo<CombinedRule | undefined>(() => {
    if (!result.data || !hash) return undefined;
    const [ownerAddr, ruleRefs, version] = result.data as [string, RuleRef[], bigint];
    return {
      hash: hash as `0x${string}`,
      owner: ownerAddr as `0x${string}`,
      version,
      active: true,
      ruleRefs,
    };
  }, [result.data, hash]);

  return { ...result, data };
}

// useActiveCombinedRuleByDirection

export function useActiveCombinedRuleByDirection(
  owner: `0x${string}` | undefined,
  direction: RuleDirection
) {
  const { contracts } = usePayIDContext();

  const { data: hash } = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getActiveRuleOfByDirection',
    args: owner ? [owner, direction] : undefined,
    query: { enabled: !!owner },
  });

  const result = useReadContract({
    address: contracts.combinedRuleStorage,
    abi: CombinedRuleStorageABI,
    functionName: 'getRuleByHash',
    args: hash ? [hash as `0x${string}`] : undefined,
    query: { enabled: !!hash },
  });

  const data = useMemo<CombinedRule | undefined>(() => {
    if (!result.data || !hash) return undefined;
    const [ownerAddr, ruleRefs, version] = result.data as [string, RuleRef[], bigint];
    return {
      hash: hash as `0x${string}`,
      owner: ownerAddr as `0x${string}`,
      version,
      active: true,
      ruleRefs,
      direction,
    };
  }, [result.data, hash, direction]);

  return { ...result, data };
}

// useOwnerRuleSets

export function useOwnerRuleSets(owner: `0x${string}` | undefined) {
  const { contracts } = usePayIDContext();

  const { data: hashes, isLoading: loadingHashes } = useReadContract({
    address: contracts.ruleAuthority,
    abi: RuleAuthorityABI,
    functionName: 'getOwnerRuleSets',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  const allHashes = (hashes as `0x${string}`[]) ?? [];

  const result = useReadContracts({
    contracts: allHashes.map(hash => ({
      address: contracts.ruleAuthority,
      abi: RuleAuthorityABI,
      functionName: 'getRuleSet',
      args: [hash],
    })),
    query: { enabled: allHashes.length > 0 },
  });

  const refsResult = useReadContracts({
    contracts: allHashes.map(hash => ({
      address: contracts.ruleAuthority,
      abi: RuleAuthorityABI,
      functionName: 'getRuleByHash',
      args: [hash],
    })),
    query: { enabled: allHashes.length > 0 },
  });

  const data = useMemo(() => {
    if (!result.data) return [];
    return result.data
      .map((item, i) => {
        if (!item?.result) return null;
        const [ownerAddr, version, active, registeredAt, refCount] =
          item.result as [string, bigint, boolean, bigint, bigint];
        let ruleRefs: RuleRef[] = [];
        try {
          const refsData = refsResult.data?.[i]?.result;
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
      .filter(Boolean);
  }, [result.data, refsResult.data, allHashes]);

  return {
    data,
    isLoading: loadingHashes || result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

// useMyRuleSets

export function useMyRuleSets() {
  const { address } = useAccount();
  return useOwnerRuleSets(address);
}