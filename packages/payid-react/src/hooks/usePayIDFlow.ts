import { useState, useCallback, useEffect } from 'react';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { createPayID } from 'payid/client';
import type { Address, Hash, Abi } from 'viem';
import { BrowserProvider } from 'ethers';

import { usePayIDContext } from '../PayIDProvider';

import CombinedRuleStorageArtifact from '../abis/PayIDModule#CombinedRuleStorage.json';
import RuleAuthorityArtifact from '../abis/PayIDModule#RuleAuthority.json';
import PayWithPayIDArtifact from '../abis/PayIDModule#PayWithPayID.json';

const CombinedRuleStorageABI = CombinedRuleStorageArtifact.abi as Abi;
const RuleAuthorityABI = RuleAuthorityArtifact.abi as Abi;
const PayWithPayIDABI = PayWithPayIDArtifact.abi as Abi;

// SDK singleton — WASM di-load sekali saat module di-import
const sdk = createPayID({ debugTrace: true });

// ─── Types ────────────────────────────────────────────────────────────────────
export type PayIDFlowStatus =
  | 'idle'
  | 'fetching-rule'
  | 'evaluating'
  | 'denied'
  | 'proving'
  | 'awaiting-wallet'
  | 'confirming'
  | 'success'
  | 'error';

export interface PayIDFlowParams {
  receiver: Address;
  asset: Address;
  amount: bigint;
  payId: string;
  context?: Record<string, unknown>;
  attestationUIDs?: Hash[];
  ruleAuthorityAddress?: Address;
}

export interface PayIDFlowResult {
  status: PayIDFlowStatus;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
  decision: 'ALLOW' | 'DENY' | null;
  denyReason: string | null;
  txHash: Hash | undefined;
  execute: (params: PayIDFlowParams) => Promise<void>;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePayIDFlow(): PayIDFlowResult {
  const { address: payer } = useAccount();
  const chainId = useChainId();
  const { contracts } = usePayIDContext();

  const publicClient = usePublicClient();

  const [status, setStatus] = useState<PayIDFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'ALLOW' | 'DENY' | null>(null);
  const [denyReason, setDenyReason] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isTxConfirmed && status === 'confirming') setStatus('success');
  }, [isTxConfirmed, status]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setDecision(null);
    setDenyReason(null);
    setTxHash(undefined);
  }, []);

  const execute = useCallback(async (params: PayIDFlowParams) => {
    if (!payer) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    if (!publicClient) {
      setError('RPC client not available. Check wagmi transport config.');
      setStatus('error');
      return;
    }

    try {
      reset();

      // ── Step 1: Fetch active rule dari chain ─────────────────────────────
      setStatus('fetching-rule');

      let activeHash: Hash | null = null;
      let ruleAuthorityAddr: Address =
        params.ruleAuthorityAddress ?? contracts.combinedRuleStorage;

      try {
        const result = await publicClient.readContract({
          address: contracts.combinedRuleStorage,
          abi: CombinedRuleStorageABI,
          functionName: 'getActiveRuleOf',
          args: [params.receiver],
        });
        if (result) activeHash = result as Hash;
      } catch { }

      // Fallback ke RuleAuthority
      if (!activeHash && contracts.ruleAuthority) {
        try {
          const hashes = (await publicClient.readContract({
            address: contracts.ruleAuthority,
            abi: RuleAuthorityABI,
            functionName: 'getOwnerRuleSets',
            args: [params.receiver],
          })) as Hash[];

          if (hashes.length > 0) {
            activeHash = hashes[hashes.length - 1]!;
            ruleAuthorityAddr = contracts.ruleAuthority;
          }
        } catch { }
      }

      // Kalau tidak ada rule → allow all
      const ruleConfig = activeHash
        ? ({ uri: `payid:rule:${activeHash}` } as any)
        : { logic: 'AND' as const, rules: [] };

      // ── Step 2: Evaluate ──────────────────────────────────────────────────
      setStatus('evaluating');

      const context = {
        tx: {
          sender: payer,
          receiver: params.receiver,
          asset: params.asset,
          amount: params.amount.toString(),
          chainId,
        },
        env: {
          timestamp: Math.floor(Date.now() / 1000),
        },
        state: {
          spentToday: '0',
          period: new Date().toISOString().slice(0, 10),
        },
        ...params.context,
      };

      // BrowserProvider wraps injected EIP-1193 provider yang sudah di-connect wagmi
      const ethereum = (globalThis as any).ethereum;
      if (!ethereum) throw new Error('No injected wallet found');

      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      // ── Step 3: Prove ─────────────────────────────────────────────────────
      setStatus('proving');

      const { result, proof } = await sdk.evaluateAndProve({
        context,
        authorityRule: ruleConfig,
        payId: params.payId,
        payer,
        receiver: params.receiver,
        asset: params.asset,
        amount: params.amount,
        signer,
        verifyingContract: contracts.payIDVerifier,
        ruleAuthority: activeHash
          ? ruleAuthorityAddr
          : '0x0000000000000000000000000000000000000000',
        chainId,
        blockTimestamp: Math.floor(Date.now() / 1000),
      });

      setDecision(result.decision as 'ALLOW' | 'DENY');

      if (result.decision !== 'ALLOW' || !proof) {
        setDenyReason((result as any).reason ?? 'Rule denied this payment');
        setStatus('denied');
        return;
      }

      // ── Step 4: Submit transaksi ──────────────────────────────────────────
      setStatus('awaiting-wallet');

      const isETH =
        params.asset === '0x0000000000000000000000000000000000000000';
      const d = proof.payload;
      const sig = proof.signature as Hash;

      const hash = await writeContractAsync(
        isETH
          ? {
            address: contracts.payWithPayID,
            abi: PayWithPayIDABI,
            functionName: 'payETH',
            args: [d, sig, params.attestationUIDs ?? []],
            value: params.amount,
          }
          : {
            address: contracts.payWithPayID,
            abi: PayWithPayIDABI,
            functionName: 'payERC20',
            args: [d, sig, params.attestationUIDs ?? []],
          },
      );

      setTxHash(hash);
      setStatus('confirming');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.toLowerCase().includes('user rejected')
          ? 'Transaction rejected by user'
          : msg,
      );
      setStatus('error');
    }
  }, [payer, chainId, contracts, publicClient, writeContractAsync, reset]);

  return {
    status,
    isPending: [
      'fetching-rule',
      'evaluating',
      'proving',
      'awaiting-wallet',
      'confirming',
    ].includes(status),
    isSuccess: status === 'success',
    error,
    decision,
    denyReason,
    txHash,
    execute,
    reset,
  };
}