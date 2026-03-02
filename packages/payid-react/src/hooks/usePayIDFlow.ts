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

const TOKEN_URI_ABI = [
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
] as const;

// ERC20 ABI — approve + allowance
const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const sdk = createPayID({ debugTrace: true });

const log = (step: string, label: string, value?: unknown) => {
  if (value !== undefined) {
    console.log(`[usePayIDFlow][${step}] ${label}`, value);
  } else {
    console.log(`[usePayIDFlow][${step}] ${label}`);
  }
};

const warn = (step: string, label: string, err?: unknown) => {
  console.warn(`[usePayIDFlow][${step}] ${label}`, err ?? '');
};

// Types

export type PayIDFlowStatus =
  | 'idle'
  | 'fetching-rule'
  | 'evaluating'
  | 'denied'
  | 'proving'
  | 'approving'
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

// IPFS Helper

function toHttpUrl(uri: string, gateway: string): string {
  if (uri.startsWith('ipfs://')) {
    const base = gateway.endsWith('/') ? gateway : `${gateway}/`;
    return `${base}${uri.slice(7)}`;
  }
  return uri;
}

// loadRuleConfigs

async function loadRuleConfigs(
  ruleRefs: Array<{ ruleNFT: Address; tokenId: bigint; }>,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  ipfsGateway: string,
): Promise<unknown[]> {
  log('loadRuleConfigs', `loading ${ruleRefs.length} rule ref(s)`, ruleRefs);

  return Promise.all(
    ruleRefs.map(async ({ ruleNFT, tokenId }, i) => {
      log('loadRuleConfigs', `[${i}] reading tokenURI`, { ruleNFT, tokenId: tokenId.toString() });

      const tokenUri = (await publicClient.readContract({
        address: ruleNFT,
        abi: TOKEN_URI_ABI,
        functionName: 'tokenURI',
        args: [tokenId],
      })) as string;

      log('loadRuleConfigs', `[${i}] tokenURI`, tokenUri);

      const url = toHttpUrl(tokenUri, ipfsGateway);
      log('loadRuleConfigs', `[${i}] resolved HTTP URL`, url);

      const res = await fetch(url);
      log('loadRuleConfigs', `[${i}] fetch status`, res.status);

      if (!res.ok) throw new Error(`Failed to fetch metadata: ${url} (status ${res.status})`);

      const metadata: any = await res.json();
      log('loadRuleConfigs', `[${i}] metadata keys`, Object.keys(metadata));

      if (!metadata.rule) {
        throw new Error(`Missing 'rule' in metadata for tokenId ${tokenId} (${url})`);
      }

      log('loadRuleConfigs', `[${i}] metadata.rule`, metadata.rule);
      return metadata.rule;
    }),
  );
}

// Hook

export function usePayIDFlow(): PayIDFlowResult {
  const { address: payer } = useAccount();
  const chainId = useChainId();
  const { contracts, ipfsGateway } = usePayIDContext();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<PayIDFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'ALLOW' | 'DENY' | null>(null);
  const [denyReason, setDenyReason] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isTxConfirmed && status === 'confirming') {
      log('tx', 'confirmed on-chain', txHash);
      setStatus('success');
    }
  }, [isTxConfirmed, status, txHash]);

  const reset = useCallback(() => {
    log('reset', 'resetting flow state');
    setStatus('idle');
    setError(null);
    setDecision(null);
    setDenyReason(null);
    setTxHash(undefined);
  }, []);

  const execute = useCallback(async (params: PayIDFlowParams) => {
    log('execute', 'start', {
      receiver: params.receiver,
      asset: params.asset,
      amount: params.amount.toString(),
      payId: params.payId,
      chainId,
      ipfsGateway,
    });

    if (!payer) {
      warn('execute', 'wallet not connected');
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    if (!publicClient) {
      warn('execute', 'publicClient unavailable — check wagmi transport config');
      setError('RPC client not available. Check wagmi transport config.');
      setStatus('error');
      return;
    }

    try {
      reset();

      // Step 1: fetch active rule hash
      setStatus('fetching-rule');
      log('step-1', 'fetching active rule hash for receiver', params.receiver);

      let activeHash: Hash | null = null;
      let activeVersion: bigint = 1n;
      let ruleRefs: Array<{ ruleNFT: Address; tokenId: bigint; }> = [];
      let ruleAuthorityAddr: Address =
        params.ruleAuthorityAddress ?? contracts.combinedRuleStorage;

      try {
        const result = await publicClient.readContract({
          address: contracts.combinedRuleStorage,
          abi: CombinedRuleStorageABI,
          functionName: 'getActiveRuleOf',
          args: [params.receiver],
        });
        if (result) {
          activeHash = result as Hash;
          log('step-1', 'CombinedRuleStorage activeHash', activeHash);
        }
      } catch (e) {
        warn('step-1', 'getActiveRuleOf failed (no active rule or revert)', e);
      }

      if (activeHash) {
        try {
          const ruleData = (await publicClient.readContract({
            address: contracts.combinedRuleStorage,
            abi: CombinedRuleStorageABI,
            functionName: 'getRuleByHash',
            args: [activeHash],
          })) as [string, Array<{ ruleNFT: Address; tokenId: bigint; }>, bigint];

          ruleRefs = ruleData[1];
          activeVersion = ruleData[2];

          log('step-1', 'ruleRefs', ruleRefs.map(r => ({
            ruleNFT: r.ruleNFT,
            tokenId: r.tokenId.toString(),
          })));
          log('step-1', 'activeVersion', activeVersion.toString());
        } catch (e) {
          warn('step-1', 'getRuleByHash failed', e);
        }
      }

      // Fallback ke RuleAuthority
      if (!activeHash && contracts.ruleAuthority) {
        log('step-1', 'falling back to RuleAuthority', contracts.ruleAuthority);
        try {
          const hashes = (await publicClient.readContract({
            address: contracts.ruleAuthority,
            abi: RuleAuthorityABI,
            functionName: 'getOwnerRuleSets',
            args: [params.receiver],
          })) as Hash[];

          log('step-1', 'RuleAuthority hashes', hashes);

          if (hashes.length > 0) {
            activeHash = hashes[hashes.length - 1]!;
            ruleAuthorityAddr = contracts.ruleAuthority;
            log('step-1', 'using last hash from RuleAuthority', activeHash);

            const ruleData = (await publicClient.readContract({
              address: contracts.ruleAuthority,
              abi: RuleAuthorityABI,
              functionName: 'getRuleByHash',
              args: [activeHash],
            })) as [string, Array<{ ruleNFT: Address; tokenId: bigint; }>, bigint];

            ruleRefs = ruleData[1];
            activeVersion = ruleData[2];
            log('step-1', 'RuleAuthority ruleRefs', ruleRefs);
          }
        } catch (e) {
          warn('step-1', 'RuleAuthority fallback failed', e);
        }
      }

      if (!activeHash) {
        log('step-1', 'no active rule found → will use allow-all policy');
      }

      // Step 2: fetch rule configs from IPFS
      log('step-2', 'loading rule configs from IPFS', { ruleRefsCount: ruleRefs.length, ipfsGateway });

      let authorityRule: any;

      if (ruleRefs.length > 0) {
        const ruleConfigs = await loadRuleConfigs(ruleRefs, publicClient, ipfsGateway);
        authorityRule = {
          version: Number(activeVersion),
          logic: 'AND' as const,
          rules: ruleConfigs,
        };
        log('step-2', 'authorityRule built', authorityRule);
      } else {
        authorityRule = { logic: 'AND' as const, rules: [] };
        log('step-2', 'no ruleRefs — using allow-all policy');
      }

      // Step 3: evaluate
      setStatus('evaluating');

      const context = {
        tx: {
          sender: payer,
          receiver: params.receiver,
          asset: params.asset,
          amount: params.amount.toString(),
          chainId,
        },
        env: { timestamp: Math.floor(Date.now() / 1000) },
        state: {
          spentToday: '0',
          period: new Date().toISOString().slice(0, 10),
        },
        ...params.context,
      };

      log('step-3', 'evaluation context', context);

      const ethereum = (globalThis as any).ethereum;
      if (!ethereum) throw new Error('No injected wallet found');

      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      log('step-3', 'signer address', await signer.getAddress());

      // Step 4: prove
      setStatus('proving');
      log('step-4', 'calling sdk.evaluateAndProve', {
        payId: params.payId,
        payer,
        receiver: params.receiver,
        ruleAuthority: activeHash ? ruleAuthorityAddr : ETH_ADDRESS,
        verifyingContract: contracts.payIDVerifier,
        chainId,
      });

      const { result, proof } = await sdk.evaluateAndProve({
        context,
        authorityRule,
        payId: params.payId,
        payer,
        receiver: params.receiver,
        asset: params.asset,
        amount: params.amount,
        signer,
        verifyingContract: contracts.payIDVerifier,
        ruleAuthority: activeHash ? ruleAuthorityAddr : ETH_ADDRESS,
        chainId,
        blockTimestamp: Math.floor(Date.now() / 1000),
      });

      log('step-4', 'sdk result', {
        decision: result.decision, reason: (result as any).reason, prove: {
          context,
          authorityRule,
          payId: params.payId,
          payer,
          receiver: params.receiver,
          asset: params.asset,
          amount: params.amount,
          signer,
          verifyingContract: contracts.payIDVerifier,
          ruleAuthority: activeHash ? ruleAuthorityAddr : ETH_ADDRESS,
          chainId,
          blockTimestamp: Math.floor(Date.now() / 1000),
        }
      });
      log('step-4', 'proof', proof ? { hasPayload: !!proof.payload, hasSignature: !!proof.signature } : null);

      setDecision(result.decision as 'ALLOW' | 'DENY');

      if (result.decision !== 'ALLOW' || !proof) {
        const reason = (result as any).reason ?? 'Rule denied this payment';
        warn('step-4', 'payment DENIED', reason);
        setDenyReason(reason);
        setStatus('denied');
        return;
      }

      const isETH = params.asset === ETH_ADDRESS;

      // ✅ Step 4.5: ERC20 approve jika bukan ETH
      if (!isETH) {
        log('step-4.5', 'ERC20 detected, checking allowance', {
          token: params.asset,
          spender: contracts.payWithPayID,
          amount: params.amount.toString(),
        });

        const allowance = (await publicClient.readContract({
          address: params.asset,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [payer, contracts.payWithPayID],
        })) as bigint;

        log('step-4.5', 'current allowance', allowance.toString());

        if (allowance < params.amount) {
          log('step-4.5', 'allowance insufficient, requesting approve', {
            need: params.amount.toString(),
            have: allowance.toString(),
          });

          setStatus('approving');

          const approveTx = await writeContractAsync({
            address: params.asset,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contracts.payWithPayID, params.amount],
          });

          log('step-4.5', 'approve tx submitted', approveTx);

          // Tunggu approve confirmed sebelum lanjut
          // Buat client baru untuk polling receipt
          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
          log('step-4.5', 'approve confirmed', { status: approveReceipt.status, block: approveReceipt.blockNumber.toString() });

          if (approveReceipt.status !== 'success') {
            throw new Error('ERC20 approve transaction failed');
          }
        } else {
          log('step-4.5', 'allowance sufficient, skipping approve');
        }
      }

      // Step 5: submit pay tx
      setStatus('awaiting-wallet');

      const d = proof.payload;
      const sig = proof.signature as Hash;

      log('step-5', 'submitting tx', {
        isETH,
        token: params.asset,
        amount: params.amount.toString(),
        contract: contracts.payWithPayID,
      });

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

      log('step-5', 'tx submitted, waiting for confirmation', hash);
      setTxHash(hash);
      setStatus('confirming');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warn('execute', 'error caught', err);
      setError(
        msg.toLowerCase().includes('user rejected')
          ? 'Transaction rejected by user'
          : msg,
      );
      setStatus('error');
    }
  }, [payer, chainId, contracts, ipfsGateway, publicClient, writeContractAsync, reset]);

  return {
    status,
    isPending: [
      'fetching-rule',
      'evaluating',
      'proving',
      'approving',
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