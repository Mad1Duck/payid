import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnectorClient,
} from 'wagmi';
import type { Address, Hash, Abi } from 'viem';
import { BrowserProvider } from 'ethers';

import { usePayIDContext } from '../PayIDProvider';

import CombinedRuleStorageArtifact from '../abis/PayIDModule#CombinedRuleStorage.json';
import PayWithPayIDArtifact from '../abis/PayIDModule#PayWithPayID.json';

const CombinedRuleStorageABI = CombinedRuleStorageArtifact.abi as Abi;
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

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const log = (step: string, label: string, value?: unknown) =>
  value !== undefined
    ? console.log(`[usePayIDFlow][${step}] ${label}`, value)
    : console.log(`[usePayIDFlow][${step}] ${label}`);

const warn = (step: string, label: string, err?: unknown) =>
  console.warn(`[usePayIDFlow][${step}] ${label}`, err ?? '');

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

function toHttpUrl(uri: string, gateway: string): string {
  if (uri.startsWith('ipfs://')) {
    const base = gateway.endsWith('/') ? gateway : `${gateway}/`;
    return `${base}${uri.slice(7)}`;
  }
  return uri;
}

async function loadRuleConfigs(
  ruleRefs: Array<{ ruleNFT: Address; tokenId: bigint; }>,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  ipfsGateway: string,
): Promise<unknown[]> {
  log('loadRuleConfigs', `loading ${ruleRefs.length} rule ref(s)`);

  return Promise.all(
    ruleRefs.map(async ({ ruleNFT, tokenId }, i) => {
      const tokenUri = (await publicClient.readContract({
        address: ruleNFT,
        abi: TOKEN_URI_ABI,
        functionName: 'tokenURI',
        args: [tokenId],
      })) as string;

      const url = toHttpUrl(tokenUri, ipfsGateway);
      log('loadRuleConfigs', `[${i}] fetch`, url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch rule metadata: ${url} (${res.status})`);

      const metadata: any = await res.json();
      if (!metadata.rule) throw new Error(`Missing 'rule' in metadata: ${url}`);

      return metadata.rule;
    }),
  );
}

export function usePayIDFlow(): PayIDFlowResult {
  const { address: payer } = useAccount();
  const chainId = useChainId();
  const { contracts, ipfsGateway } = usePayIDContext();
  const publicClient = usePublicClient();

  /**
   * FIX #1: Import path salah — 'payid/client' bukan nama package yang valid.
   * Package ini adalah 'payid-sdk-core' atau tergantung package.json di monorepo.
   * Selain itu, createPayID di module level (di luar hook) menyebabkan WASM
   * loading terjadi saat import time — ini menyebabkan crash di SSR/Next.js
   * karena WebAssembly tidak tersedia di Node.js environment yang sama.
   *
   * FIX: Lazy init SDK menggunakan useRef — WASM hanya di-load saat hook
   * pertama kali dipanggil di browser, bukan saat module di-import.
   */
  const sdkRef = useRef<any>(null);
  const getSdk = useCallback(async () => {
    if (!sdkRef.current) {
      const { createPayID } = await import('payid/client');
      sdkRef.current = createPayID({ debugTrace: true });
      await sdkRef.current.ready?.();
    }
    return sdkRef.current;
  }, []);

  /**
   * FIX #2: useConnectorClient dari wagmi memberikan akses ke connector
   * aktif yang terhubung, apapun jenisnya (MetaMask, WalletConnect, Coinbase,
   * dll). Ini jauh lebih robust daripada (globalThis as any).ethereum yang
   * hanya bekerja untuk injected wallet (MetaMask) dan gagal total untuk
   * WalletConnect dan wallet lainnya.
   */
  const { data: connectorClient } = useConnectorClient();

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

    /**
     * FIX #2 (lanjutan): Validasi connectorClient tersedia.
     * Sebelumnya langsung pakai (globalThis as any).ethereum — gagal untuk
     * WalletConnect, Coinbase Wallet, Safe, dll.
     */
    if (!connectorClient) {
      setError('Wallet connector not ready. Please reconnect your wallet.');
      setStatus('error');
      return;
    }

    try {
      reset();

      setStatus('fetching-rule');
      log('step-1', 'fetching active rule for receiver', params.receiver);

      const ruleAuthorityAddr: Address =
        params.ruleAuthorityAddress ?? contracts.combinedRuleStorage;

      let activeHash: Hash | null = null;
      let activeVersion: bigint = 1n;
      let ruleRefs: Array<{ ruleNFT: Address; tokenId: bigint; }> = [];

      try {
        const result = await publicClient.readContract({
          address: contracts.combinedRuleStorage,
          abi: CombinedRuleStorageABI,
          functionName: 'getActiveRuleOf',
          args: [params.receiver],
        });
        if (result) {
          activeHash = result as Hash;
          log('step-1', 'activeHash', activeHash);
        }
      } catch (e) {
        warn('step-1', 'no active rule (receiver belum register atau NO_ACTIVE_RULE)', e);
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
          log('step-1', 'ruleRefs', ruleRefs.map(r => ({ ruleNFT: r.ruleNFT, tokenId: r.tokenId.toString() })));
        } catch (e) {
          warn('step-1', 'getRuleByHash failed', e);
        }
      }

      log('step-2', 'loading rule configs', { count: ruleRefs.length });

      let authorityRule: any;

      if (ruleRefs.length > 0) {
        const ruleConfigs = await loadRuleConfigs(ruleRefs, publicClient, ipfsGateway);
        authorityRule = {
          version: String(activeVersion),
          logic: 'AND' as const,
          rules: ruleConfigs,
        };
        log('step-2', 'authorityRule built', authorityRule);
      } else {
        authorityRule = { logic: 'AND' as const, rules: [] };
        log('step-2', 'no ruleRefs — allow-all policy');
      }

      setStatus('evaluating');

      /**
       * FIX #2 (ethers bridge): Gunakan connector transport dari wagmi
       * bukan (globalThis as any).ethereum. Ini bekerja untuk semua
       * wallet type: MetaMask, WalletConnect, Coinbase Wallet, Safe, dll.
       *
       * connectorClient.transport adalah EIP-1193 provider yang diberikan
       * wagmi — wrapping-nya ke BrowserProvider ethers sudah aman.
       */
      const provider = new BrowserProvider(connectorClient.transport as any);
      const signer = await provider.getSigner();

      const signerNetwork = await provider.getNetwork();
      const signerChainId = Number(signerNetwork.chainId);

      log('step-3', 'signer', await signer.getAddress());
      log('step-3', 'chainId', { wagmi: chainId, signer: signerChainId });

      if (signerChainId !== chainId) {
        warn('step-3', `chainId MISMATCH: wallet=${signerChainId}, wagmi=${chainId}`);
      }

      const context = {
        tx: {
          sender: payer,
          receiver: params.receiver,
          asset: params.asset,
          amount: params.amount.toString(),
          chainId: signerChainId,
        },
        env: { timestamp: Math.floor(Date.now() / 1000) },
        state: { spentToday: '0', period: new Date().toISOString().slice(0, 10) },
        ...params.context,
      };

      log('step-3', 'context', context);

      setStatus('proving');

      const sdk = await getSdk();

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
        ruleSetHashOverride: activeHash ?? undefined,
        chainId: signerChainId,
        blockTimestamp: Math.floor(Date.now() / 1000),
      });

      log('step-4', 'result', { decision: result.decision, reason: (result as any).reason });

      setDecision(result.decision as 'ALLOW' | 'DENY');

      if (result.decision !== 'ALLOW' || !proof) {
        const reason = (result as any).reason ?? 'Rule denied this payment';
        warn('step-4', 'DENIED', reason);
        setDenyReason(reason);
        setStatus('denied');
        return;
      }

      const isETH = params.asset === ETH_ADDRESS;

      if (!isETH) {
        const allowance = (await publicClient.readContract({
          address: params.asset,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [payer, contracts.payWithPayID],
        })) as bigint;

        log('step-4.5', 'allowance', { current: allowance.toString(), required: params.amount.toString() });

        if (allowance < params.amount) {
          setStatus('approving');
          const approveTx = await writeContractAsync({
            address: params.asset,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contracts.payWithPayID, params.amount],
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
          if (receipt.status !== 'success') throw new Error('ERC20 approve failed');
          log('step-4.5', 'approve confirmed');
        }
      }

      setStatus('awaiting-wallet');

      const d = proof.payload;
      const sig = proof.signature as Hash;

      log('step-5', 'submitting', { isETH, asset: params.asset, amount: params.amount.toString() });

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

      log('step-5', 'tx submitted', hash);
      setTxHash(hash);
      setStatus('confirming');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warn('execute', 'error', err);
      setError(
        msg.toLowerCase().includes('user rejected')
          ? 'Transaction rejected by user'
          : msg,
      );
      setStatus('error');
    }
  }, [payer, chainId, contracts, ipfsGateway, publicClient, connectorClient, writeContractAsync, reset, getSdk]);

  return {
    status,
    isPending: ['fetching-rule', 'evaluating', 'proving', 'approving', 'awaiting-wallet', 'confirming'].includes(status),
    isSuccess: status === 'success',
    error,
    decision,
    denyReason,
    txHash,
    execute,
    reset,
  };
}