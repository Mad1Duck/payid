import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Abi, Hash } from 'viem';
import { usePayIDContext } from '../PayIDProvider';
import PayIDVerifierABI from '../abis/PayIDModule#PayIDVerifier.json';
import PayWithPayIDABI from '../abis/PayIDModule#PayWithPayID.json';
import RuleItemERC721ABI from '../abis/PayIDModule#RuleItemERC721.json';
import RuleAuthorityABI from '../abis/PayIDModule#RuleAuthority.json';

interface TxHookResult {
  hash: Hash | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

import type { DecisionPayload as Decision } from 'payid';

export function useVerifyDecision(
  decision: Decision | undefined,
  signature: `0x${string}` | undefined,
) {
  const { contracts } = usePayIDContext();
  return useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierABI.abi,
    functionName: 'verifyDecision',
    args: decision && signature ? [decision, signature] : undefined,
    query: { enabled: !!decision && !!signature },
  });
}

export function useNonceUsed(
  payer: `0x${string}` | undefined,
  nonce: `0x${string}` | undefined,
) {
  const { contracts } = usePayIDContext();
  return useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierABI.abi,
    functionName: 'usedNonce',
    args: payer && nonce ? [payer, nonce] : undefined,
    query: { enabled: !!payer && !!nonce },
  });
}

/**
 * Hook to pay with the chain's native token via PAY.ID.
 * @example
 * const { pay, isPending, isSuccess } = usePayNative()
 * await pay({ decision, signature, attestationUIDs: [] })
 */
export function usePayNative(): TxHookResult & {
  pay: (params: { decision: Decision; signature: `0x${string}`; attestationUIDs?: `0x${string}`[]; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pay = (params: {
    decision: Decision;
    signature: `0x${string}`;
    attestationUIDs?: `0x${string}`[];
  }) => {
    writeContract({
      address: contracts.payWithPayID,
      abi: PayWithPayIDABI.abi,
      functionName: 'payNative',
      args: [params.decision, params.signature, params.attestationUIDs ?? []],
      value: params.decision.amount,
    });
  };

  return { pay, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Hook untuk bayar dengan ERC20 via PAY.ID.
 * Pastikan `approve` sudah cukup sebelum memanggil `pay`.
 * @example
 * const { pay, isPending, isSuccess } = usePayERC20()
 * await pay({ decision, signature, attestationUIDs: [] })
 */
export function usePayERC20(): TxHookResult & {
  pay: (params: { decision: Decision; signature: `0x${string}`; attestationUIDs?: `0x${string}`[]; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pay = (params: {
    decision: Decision;
    signature: `0x${string}`;
    attestationUIDs?: `0x${string}`[];
  }) => {
    writeContract({
      address: contracts.payWithPayID,
      abi: PayWithPayIDABI.abi,
      functionName: 'payERC20',
      args: [params.decision, params.signature, params.attestationUIDs ?? []],
    });
  };

  return { pay, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Subscribe ke RuleItemERC721 untuk membuka slot rule tambahan.
 * Harga dihitung dari subscriptionPriceETH() — gunakan useSubscriptionPrice() dulu.
 */
export function useSubscribe(): TxHookResult & { subscribe: (priceInWei: bigint) => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const subscribe = (priceInWei: bigint) => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI.abi as Abi,
      functionName: 'subscribe',
      value: priceInWei,
    });
  };

  return { subscribe, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Buat rule baru (root rule, version 1).
 * @param ruleHash   keccak256 dari rule JSON
 * @param uri        IPFS URI ke rule metadata (ipfs://...)
 */
export function useCreateRule(): TxHookResult & {
  createRule: (params: { ruleHash: `0x${string}`; uri: string; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createRule = (params: { ruleHash: `0x${string}`; uri: string; }) => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI.abi as Abi,
      functionName: 'createRule',
      args: [params.ruleHash, params.uri],
    });
  };

  return { createRule, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Buat versi baru dari rule yang sudah ada.
 */
export function useCreateRuleVersion(): TxHookResult & {
  createRuleVersion: (params: { parentRuleId: bigint; newHash: `0x${string}`; newUri: string; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createRuleVersion = (params: {
    parentRuleId: bigint;
    newHash: `0x${string}`;
    newUri: string;
  }) => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI.abi as Abi,
      functionName: 'createRuleVersion',
      args: [params.parentRuleId, params.newHash, params.newUri],
    });
  };

  return { createRuleVersion, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Aktivasi sebuah rule version — mint NFT license.
 * Versi lama otomatis di-deactivate.
 */
export function useActivateRule(): TxHookResult & { activateRule: (ruleId: bigint) => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const activateRule = (ruleId: bigint) => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI.abi as Abi,
      functionName: 'activateRule',
      args: [ruleId],
    });
  };

  return { activateRule, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Perpanjang expiry satu rule NFT.
 * Hanya mengubah ruleExpiry[tokenId], bukan subscriptionExpiry.
 */
export function useExtendRuleExpiry(): TxHookResult & {
  extendRuleExpiry: (params: { tokenId: bigint; newExpiry: bigint; priceInWei: bigint; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const extendRuleExpiry = (params: {
    tokenId: bigint;
    newExpiry: bigint;
    priceInWei: bigint;
  }) => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721ABI.abi as Abi,
      functionName: 'extendRuleExpiry',
      args: [params.tokenId, params.newExpiry],
      value: params.priceInWei,
    });
  };

  return { extendRuleExpiry, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Register combined rule set ke CombinedRuleStorage.
 * Menggantikan rule lama jika ada.
 */
export function useRegisterCombinedRule(): TxHookResult & {
  registerCombinedRule: (params: { ruleSetHash: `0x${string}`; ruleNFTs: `0x${string}`[]; tokenIds: bigint[]; version: bigint; }) => void;
} {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const registerCombinedRule = (params: {
    ruleSetHash: `0x${string}`;
    ruleNFTs: `0x${string}`[];
    tokenIds: bigint[];
    version: bigint;
  }) => {
    writeContract({
      address: contracts.ruleAuthority,
      abi: RuleAuthorityABI.abi as Abi,
      functionName: 'registerRuleSet',
      args: [params.ruleSetHash, params.ruleNFTs.map((nft, i) => ({ ruleNFT: nft, tokenId: params.tokenIds[i] }))],
    });
  };

  return { registerCombinedRule, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Deactivate rule aktif milik caller.
 */
export function useDeactivateCombinedRule(): TxHookResult & { deactivate: (ruleSetHash: `0x${string}`) => void; } {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deactivate = (ruleSetHash: `0x${string}`) => {
    writeContract({
      address: contracts.ruleAuthority,
      abi: RuleAuthorityABI.abi as Abi,
      functionName: 'deactivateRuleSet',
      args: [ruleSetHash],
    });
  };

  return { deactivate, hash, isPending, isConfirming, isSuccess, error };
}