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

const VERIFY_DECISION_ABI = [
  {
    name: 'verifyDecision',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'd', type: 'tuple',
        components: [
          { name: 'version', type: 'bytes32' },
          { name: 'payId', type: 'bytes32' },
          { name: 'payer', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'contextHash', type: 'bytes32' },
          { name: 'ruleSetHash', type: 'bytes32' },
          { name: 'ruleAuthority', type: 'address' },
          { name: 'issuedAt', type: 'uint64' },
          { name: 'expiresAt', type: 'uint64' },
          { name: 'nonce', type: 'bytes32' },
          { name: 'requiresAttestation', type: 'bool' },
          { name: 'attestationUIDsHash', type: 'bytes32' },
        ],
      },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

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

function toHttpUrl(uri: string, ipfsGateway: string, zgGateway: string): string {
  if (uri.startsWith('ipfs://')) {
    const base = ipfsGateway.endsWith('/') ? ipfsGateway : `${ipfsGateway}/`;
    return `${base}${uri.slice(7)}`;
  }
  if (uri.startsWith('0g://')) {
    return `${zgGateway}/file?root=${uri.slice(5)}`;
  }
  return uri;
}

async function loadRuleConfigs(
  ruleRefs: Array<{ ruleNFT: Address; tokenId: bigint; }>,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  ipfsGateway: string,
  zgGateway: string,
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

      // Reject dangerous URI schemes — only http(s), ipfs://, and 0g:// are allowed
      if (
        !tokenUri.startsWith('http://') &&
        !tokenUri.startsWith('https://') &&
        !tokenUri.startsWith('ipfs://') &&
        !tokenUri.startsWith('0g://')
      ) {
        throw new Error(`INVALID_TOKEN_URI_SCHEME: ${tokenUri.slice(0, 40)}`);
      }

      const url = toHttpUrl(tokenUri, ipfsGateway, zgGateway);
      log('loadRuleConfigs', `[${i}] fetch`, url);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      let res: Response;
      try {
        res = await fetch(url, { signal: controller.signal });
      } catch (err: any) {
        if (err?.name === 'AbortError') throw new Error(`RULE_FETCH_TIMEOUT: ${url}`);
        throw err;
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) throw new Error(`Failed to fetch rule metadata: ${url} (${res.status})`);

      const text = await res.text();
      if (text.length > 100 * 1024) throw new Error(`RULE_METADATA_TOO_LARGE: ${url}`);

      let metadata: any;
      try {
        metadata = JSON.parse(text);
      } catch {
        throw new Error(`RULE_METADATA_INVALID_JSON: ${url}`);
      }

      let ruleVal = metadata.rule;
      if (typeof ruleVal === 'string') {
        try { ruleVal = JSON.parse(ruleVal); } catch { throw new Error(`RULE_METADATA_INVALID_RULE_JSON: ${url}`); }
      }
      if (!ruleVal || typeof ruleVal !== 'object') {
        throw new Error(`Missing 'rule' in metadata: ${url}`);
      }
      // Unwrap double-nested { rule: { if, ... } } written by older RulesPage v4
      if ((ruleVal as any).rule && !(ruleVal as any).if && !(ruleVal as any).conditions) {
        ruleVal = (ruleVal as any).rule;
      }
      return ruleVal;
    }),
  );
}

export function usePayIDFlow(): PayIDFlowResult {
  const { address: payer } = useAccount();
  const chainId = useChainId();
  const { contracts, ipfsGateway, zgGateway } = usePayIDContext();
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
      const { createPayIDClient } = await import('payid/client');
      sdkRef.current = createPayIDClient({ debugTrace: true });
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
  const { isSuccess: isTxConfirmed, isError: isTxFailed, error: txReceiptError } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isTxConfirmed && status === 'confirming') {
      log('tx', 'confirmed on-chain', txHash);
      setStatus('success');
    }
    if (isTxFailed && status === 'confirming') {
      warn('tx', 'reverted', txReceiptError);
      const raw = txReceiptError instanceof Error ? txReceiptError.message : 'Transaction reverted on-chain';
      const low = raw.toLowerCase();
      const causeData: string | undefined =
        (txReceiptError as any)?.cause?.data ??
        (txReceiptError as any)?.data ??
        (txReceiptError as any)?.cause?.cause?.data;
      let msg = raw;
      if (causeData?.toLowerCase().startsWith('0xd7e6bcf8')) {
        msg = 'Contracts not initialized — go to Admin page and call Initialize.';
      } else if (low.includes('unknown reason') && causeData) {
        msg = `Contract reverted: ${causeData.slice(0, 10)}`;
      } else if (low.includes('unknown reason') || low.includes('notinitialized')) {
        msg = 'Contracts not initialized — go to Admin page and call Initialize.';
      } else if (low.includes('invalid_proof') || low.includes('payid: invalid')) {
        msg = 'Invalid decision proof — proof may be expired or chain mismatch.';
      } else if (low.includes('nonce_already_used')) {
        msg = 'Nonce already used — reset and try again.';
      }
      setError(msg);
      setStatus('error');
    }
  }, [isTxConfirmed, isTxFailed, txReceiptError, status, txHash]);

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

    if (!contracts.payIDVerifier || contracts.payIDVerifier === '0x0000000000000000000000000000000000000000') {
      setError(`PayID contracts not configured for chainId ${chainId}. Please check PayIDProvider config.`);
      setStatus('error');
      return;
    }

    try {
      reset();

      // Preflight: verify PayWithPayID is initialized — fail early with clear message
      try {
        const isInit = await publicClient!.readContract({
          address: contracts.payWithPayID,
          abi: PayWithPayIDABI,
          functionName: 'isInitialized',
        }) as boolean;
        if (!isInit) {
          throw new Error('Contracts not initialized — go to Admin page and call Initialize.');
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('not initialized')) throw e;
        warn('preflight', 'isInitialized check failed', e);
      }

      setStatus('fetching-rule');
      log('step-1', 'fetching active rule for receiver', params.receiver);

      const ruleAuthorityAddr: Address =
        params.ruleAuthorityAddress ?? ETH_ADDRESS; // ZeroAddress = no specific authority

      let activeHash: Hash | null = null;
      let activeVersion: bigint = 1n;
      let ruleRefs: Array<{ ruleNFT: Address; tokenId: bigint; }> = [];

      try {
        const result = (await publicClient.readContract({
          address: contracts.combinedRuleStorage,
          abi: CombinedRuleStorageABI,
          functionName: 'getActiveRuleOf',
          args: [params.receiver],
        })) as Hash;

        if (result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          activeHash = result;
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
          activeHash = null;
        }
      }

      log('step-2', 'loading rule configs', { count: ruleRefs.length });

      let authorityRule: any;

      if (ruleRefs.length > 0) {
        const ruleConfigs = await loadRuleConfigs(ruleRefs, publicClient, ipfsGateway, zgGateway);
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

      // Use chain's block.timestamp to stay in sync with Hardhat/testnet
      // (Hardhat block.timestamp lags behind wall clock if no recent blocks)
      const latestBlock = await publicClient!.getBlock({ blockTag: 'latest' });
      const chainTimestamp = Number(latestBlock.timestamp);
      log('step-3', 'chainTimestamp', chainTimestamp);

      if (signerChainId !== chainId) {
        throw new Error(
          `CHAIN_MISMATCH: Wallet is on chainId ${signerChainId} but app expects ${chainId}. ` +
          `Please switch your wallet network to match the app.`
        );
      }

      const context = {
        tx: {
          sender: payer,
          receiver: params.receiver,
          asset: params.asset,
          amount: params.amount.toString(),
          chainId: signerChainId,
        },
        env: { timestamp: chainTimestamp },
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
        blockTimestamp: chainTimestamp,
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

      const d = proof.payload;
      const sig = proof.signature as Hash;

      log('step-5', 'submitting', { isETH, asset: params.asset, amount: params.amount.toString() });

      // Diagnostic: verify PayWithPayID.verifier matches the configured payIDVerifier address
      try {
        const storedVerifier = await publicClient!.readContract({
          address: contracts.payWithPayID,
          abi: PayWithPayIDABI,
          functionName: 'verifier',
        }) as string;
        if (storedVerifier.toLowerCase() !== contracts.payIDVerifier.toLowerCase()) {
          throw new Error(
            `Contract misconfiguration: PayWithPayID.verifier=${storedVerifier} does not match ` +
            `contracts.payIDVerifier=${contracts.payIDVerifier}. ` +
            `Re-initialize PayWithPayID with the correct PayIDVerifier address.`
          );
        }
        log('step-5', 'verifier address check', { storedVerifier, expected: contracts.payIDVerifier });
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('misconfiguration')) throw e;
        warn('step-5', 'verifier address check failed', e);
      }

      // Diagnostic: call verifyDecision to detect INVALID_PROOF early
      try {
        const isValid = await publicClient!.readContract({
          address: contracts.payIDVerifier,
          abi: VERIFY_DECISION_ABI,
          functionName: 'verifyDecision',
          args: [d, sig],
        }) as boolean;
        if (!isValid) {
          throw new Error(
            `INVALID_PROOF: verifyDecision returned false. ` +
            `issuedAt=${d.issuedAt}, expiresAt=${d.expiresAt}, payer=${d.payer}. ` +
            `Check chain timestamp, verifyingContract address, and chainId.`
          );
        }
        log('step-5', 'verifyDecision', 'valid');
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('INVALID_PROOF')) throw e;
        warn('step-5', 'verifyDecision check failed', e);
      }

      // Simulate before sending to MetaMask — catches reverts with decoded errors
      await publicClient!.simulateContract(
        isETH
          ? {
            address: contracts.payWithPayID,
            abi: PayWithPayIDABI,
            functionName: 'payETH',
            args: [d, sig, params.attestationUIDs ?? []],
            value: params.amount,
            account: payer as `0x${string}`,
          }
          : {
            address: contracts.payWithPayID,
            abi: PayWithPayIDABI,
            functionName: 'payERC20',
            args: [d, sig, params.attestationUIDs ?? []],
            account: payer as `0x${string}`,
          },
      );

      setStatus('awaiting-wallet');

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
      const raw = err instanceof Error ? err.message : String(err);
      warn('execute', 'error', err);

      // Decode 4-byte custom error selectors from viem's cause.data
      // keccak256("NotInitialized()") = 0xd7e6bcf8
      // keccak256("AlreadyInitialized()") = 0x0dc149f0
      const causeData: string | undefined =
        (err as any)?.cause?.data ??
        (err as any)?.data ??
        (err as any)?.cause?.cause?.data;

      let msg = raw;
      const low = raw.toLowerCase();

      if (causeData?.startsWith('0xd7e6bcf8') || causeData?.startsWith('0xd7e6BCF8')) {
        msg = 'Contracts not initialized — go to Admin page and call Initialize.';
      } else if (low.includes('unknown reason') && causeData) {
        // Unknown custom error — show selector to help debugging
        msg = `Contract reverted with unknown error: ${causeData.slice(0, 10)}`;
      } else if (low.includes('user rejected') || low.includes('user denied')) {
        msg = 'Transaction rejected by user';
      } else if (low.includes('notinitialized') || low.includes('not_initialized')) {
        msg = 'Contracts not initialized — go to Admin page and call Initialize.';
      } else if (low.includes('unknown reason')) {
        msg = 'Contracts not initialized — go to Admin page and call Initialize.';
      } else if (low.includes('invalid_proof') || low.includes('payid: invalid')) {
        msg = 'Invalid decision proof — check wallet chain and contract setup.';
      } else if (low.includes('nonce_already_used')) {
        msg = 'Nonce already used — reset and try again.';
      } else if (low.includes('rule_license_expired')) {
        msg = 'Rule NFT license expired — extend or recreate the rule.';
      } else if (low.includes('rule_authority_not_trusted')) {
        msg = 'Rule authority not trusted — set it in Admin > Trusted Authorities.';
      } else if (low.includes('chain_mismatch')) {
        msg = raw;
      } else if (low.includes('wasm') || low.includes('failed to fetch wasm')) {
        msg = 'WASM engine failed to load. Check network/CORS or VITE_WASM_URL env.';
      }

      setError(msg);
      setStatus('error');
    }
  }, [payer, chainId, contracts, ipfsGateway, zgGateway, publicClient, connectorClient, writeContractAsync, reset, getSdk]);

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