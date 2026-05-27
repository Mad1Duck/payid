import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract, useChainId, useChains } from 'wagmi';
import { usePayIDContext, useGasBuffer } from 'payid-react';
import { parseEther } from 'viem';
import type { Abi } from 'viem';
import {
  AttestationVerifierAbi,
  PayIDVerifierAbi,
  PayWithPayIDAbi,
  RuleItemERC721Abi,
  VindexRegistryAbi,
} from '@/constants/contracts';
import { useV4Palette } from '@/components/v4/theme';

const PRICE_FEED_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const;

const TREASURY_ABI = [
  {
    name: 'treasuryBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'withdrawTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawAllTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [],
  },
] as const;

export function useAdminPage() {
  const { address, isConnected } = useAccount();
  const { contracts } = usePayIDContext();
  const p = useV4Palette();
  const chainId = useChainId();
  const chains = useChains();
  const nativeSymbol = chains.find(c => c.id === chainId)?.nativeCurrency.symbol ?? 'ETH';
  const { writeContractAsync, isPending, error, data: hash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });
  const withBuffer = useGasBuffer();
  const txBusy = isPending || confirming;
  const txError = error
    ? ((error as any).shortMessage ?? (error as any).message ?? 'Transaction failed')
    : null;

  /* ── Contract addresses ── */
  const attestationVerifierAddr: `0x${string}` =
    (contracts as any).attestationVerifier ?? '0x0000000000000000000000000000000000000000';
  const vindexRegistryAddr: `0x${string}` =
    (contracts as any).vindexRegistry ?? '0x0000000000000000000000000000000000000000';

  /* ── Form state ── */
  const [initRuleAuthorityAddr, setInitRuleAuthorityAddr] = useState(() => address ?? '');
  const [initAttestVerifierAddr, setInitAttestVerifierAddr] = useState(() =>
    attestationVerifierAddr !== '0x0000000000000000000000000000000000000000' ? attestationVerifierAddr : '',
  );
  const [initPWPVerifierAddr, setInitPWPVerifierAddr] = useState(() =>
    contracts.payIDVerifier !== '0x0000000000000000000000000000000000000000' ? contracts.payIDVerifier : '',
  );
  const [initPWPAttestAddr, setInitPWPAttestAddr] = useState(() =>
    attestationVerifierAddr !== '0x0000000000000000000000000000000000000000' ? attestationVerifierAddr : '',
  );

  const [authorityAddr, setAuthorityAddr] = useState('');
  const [schemaUID, setSchemaUID] = useState('');
  const [attesterAddr, setAttesterAddr] = useState('');

  const [priceCents, setPriceCents] = useState('');
  const [oracleAddr, setOracleAddr] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [minStake, setMinStake] = useState('');
  const [consensusThreshold, setConsensusThreshold] = useState('');

  /* ── VRAN Reputation Management ── */
  const [targetAddress, setTargetAddress] = useState('');
  const [newReputation, setNewReputation] = useState('');
  const [reputationReason, setReputationReason] = useState('');

  /* ── Sync init-form fields when context loads ── */
  useEffect(() => {
    if (address) setInitRuleAuthorityAddr((v) => v || address);
  }, [address]);
  useEffect(() => {
    if (attestationVerifierAddr !== '0x0000000000000000000000000000000000000000') {
      setInitAttestVerifierAddr((v) => v || attestationVerifierAddr);
      setInitPWPAttestAddr((v) => v || attestationVerifierAddr);
    }
  }, [attestationVerifierAddr]);
  useEffect(() => {
    if (contracts.payIDVerifier !== '0x0000000000000000000000000000000000000000') {
      setInitPWPVerifierAddr((v) => v || contracts.payIDVerifier);
    }
  }, [contracts.payIDVerifier]);

  /* ── On-chain reads ── */
  const { data: verifierInit } = useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierAbi,
    functionName: 'isInitialized',
  });
  const { data: adminRole } = useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierAbi,
    functionName: 'DEFAULT_ADMIN_ROLE',
  });
  const { data: isAdmin } = useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierAbi,
    functionName: 'hasRole',
    args: adminRole ? [adminRole, address as `0x${string}`] : undefined,
    query: { enabled: !!adminRole && !!address },
  });
  const { data: pwpInit } = useReadContract({
    address: contracts.payWithPayID,
    abi: PayWithPayIDAbi,
    functionName: 'isInitialized',
  });
  const { data: attVerInit } = useReadContract({
    address: attestationVerifierAddr,
    abi: AttestationVerifierAbi,
    functionName: 'isInitialized',
    query: { enabled: attestationVerifierAddr !== '0x0000000000000000000000000000000000000000' },
  });

  const { data: isTrustedAuthority } = useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierAbi,
    functionName: 'trustedAuthorities',
    args: [authorityAddr as `0x${string}`],
    query: { enabled: authorityAddr.startsWith('0x') && authorityAddr.length === 42 },
  });
  const { data: isTrustedAttester } = useReadContract({
    address: attestationVerifierAddr,
    abi: AttestationVerifierAbi,
    functionName: 'trustedAttesters',
    args: [attesterAddr as `0x${string}`],
    query: { enabled: attesterAddr.startsWith('0x') && attesterAddr.length === 42 },
  });
  const { data: isTrustedSchema } = useReadContract({
    address: attestationVerifierAddr,
    abi: AttestationVerifierAbi,
    functionName: 'trustedSchemas',
    args: [schemaUID as `0x${string}`],
    query: { enabled: schemaUID.startsWith('0x') && schemaUID.length === 66 },
  });

  // Default to false when undefined (query disabled or not loaded)
  const isTrustedAuthoritySafe = isTrustedAuthority ?? false;
  const isTrustedAttesterSafe = isTrustedAttester ?? false;
  const isTrustedSchemaSafe = isTrustedSchema ?? false;

  const { data: isPaused } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721Abi,
    functionName: 'paused',
  });
  const { data: maxSlot } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721Abi,
    functionName: 'MAX_SLOT',
  });
  const { data: subCents } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721Abi,
    functionName: 'subscriptionUsdCents',
  });
  const { data: oracleAddrRead } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RuleItemERC721Abi,
    functionName: 'ethUsdFeed',
  });
  const { data: priceData } = useReadContract({
    address: oracleAddrRead,
    abi: PRICE_FEED_ABI,
    functionName: 'latestRoundData',
    query: {
      enabled: !!oracleAddrRead && oracleAddrRead !== '0x0000000000000000000000000000000000000000',
    },
  });
  const { data: treasuryBal } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalance',
  });

  const { data: vMinStake } = useReadContract({
    address: vindexRegistryAddr,
    abi: VindexRegistryAbi,
    functionName: 'minStake',
    query: { enabled: vindexRegistryAddr !== '0x0000000000000000000000000000000000000000' },
  });
  const { data: vConsensus } = useReadContract({
    address: vindexRegistryAddr,
    abi: VindexRegistryAbi,
    functionName: 'consensusThreshold',
    query: { enabled: vindexRegistryAddr !== '0x0000000000000000000000000000000000000000' },
  });

  const ethPrice = priceData ? (Number(priceData[1]) / 1e8).toFixed(2) : null;
  const priceInEth = subCents && ethPrice ? (Number(subCents) / 100 / Number(ethPrice)).toFixed(6) : '—';

  /* ── Handlers ── */
  const initVerifier = async () => {
    if (!initRuleAuthorityAddr || !initAttestVerifierAddr) return;
    withBuffer({
      address: contracts.payIDVerifier,
      abi: PayIDVerifierAbi as unknown as Abi,
      functionName: 'initialize',
      args: [initRuleAuthorityAddr as `0x${string}`, initAttestVerifierAddr as `0x${string}`],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const initPWP = async () => {
    if (!initPWPVerifierAddr || !initPWPAttestAddr) return;
    withBuffer({
      address: contracts.payWithPayID,
      abi: PayWithPayIDAbi as unknown as Abi,
      functionName: 'initialize',
      args: [initPWPVerifierAddr as `0x${string}`, initPWPAttestAddr as `0x${string}`],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setAuthority = async (trusted: boolean) => {
    if (!authorityAddr) return;
    withBuffer({
      address: contracts.payIDVerifier,
      abi: PayIDVerifierAbi as unknown as Abi,
      functionName: 'setTrustedAuthority',
      args: [authorityAddr as `0x${string}`, trusted],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setSchema = async (trusted: boolean) => {
    if (!schemaUID) return;
    withBuffer({
      address: attestationVerifierAddr,
      abi: AttestationVerifierAbi as unknown as Abi,
      functionName: 'setTrustedSchema',
      args: [schemaUID as `0x${string}`, trusted],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setAttester = async (trusted: boolean) => {
    if (!attesterAddr) return;
    withBuffer({
      address: attestationVerifierAddr,
      abi: AttestationVerifierAbi as unknown as Abi,
      functionName: 'setTrustedAttester',
      args: [attesterAddr as `0x${string}`, trusted],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setPrice = async () => {
    if (!priceCents) return;
    withBuffer({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721Abi as unknown as Abi,
      functionName: 'setSubscriptionUsdCents',
      args: [BigInt(priceCents)],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setOracle = async () => {
    if (!oracleAddr) return;
    withBuffer({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721Abi as unknown as Abi,
      functionName: 'setOracle',
      args: [oracleAddr as `0x${string}`],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const togglePause = async () => {
    withBuffer({
      address: contracts.ruleItemERC721,
      abi: RuleItemERC721Abi as unknown as Abi,
      functionName: isPaused ? 'unpause' : 'pause',
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const withdraw = async () => {
    if (!withdrawTo || !withdrawAmount) return;
    withBuffer({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI as unknown as Abi,
      functionName: 'withdrawTreasury',
      args: [withdrawTo as `0x${string}`, parseEther(withdrawAmount)],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const withdrawAll = async () => {
    if (!withdrawTo) return;
    withBuffer({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI as unknown as Abi,
      functionName: 'withdrawAllTreasury',
      args: [withdrawTo as `0x${string}`],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setStake = async () => {
    if (!minStake) return;
    withBuffer({
      address: vindexRegistryAddr,
      abi: VindexRegistryAbi as unknown as Abi,
      functionName: 'setMinStake',
      args: [parseEther(minStake)],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const setConsensus = async () => {
    if (!consensusThreshold) return;
    withBuffer({
      address: vindexRegistryAddr,
      abi: VindexRegistryAbi as unknown as Abi,
      functionName: 'setConsensusThreshold',
      args: [Number(consensusThreshold)],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };
  const adjustReputation = async () => {
    if (!targetAddress || !newReputation) return;
    withBuffer({
      address: vindexRegistryAddr,
      abi: VindexRegistryAbi as unknown as Abi,
      functionName: 'adjustReputation',
      args: [targetAddress as `0x${string}`, Number(newReputation), reputationReason || 'Admin adjustment'],
    }).then(args => writeContractAsync(args)).catch(() => undefined);
  };

  const CONTRACTS_LIST = [
    { name: 'PayWithPayID', addr: contracts.payWithPayID, init: pwpInit },
    { name: 'PayIDVerifier', addr: contracts.payIDVerifier, init: verifierInit },
    { name: 'CombinedRuleStorage', addr: contracts.combinedRuleStorage, init: undefined },
    { name: 'RuleAuthority', addr: contracts.ruleAuthority, init: undefined },
    { name: 'RuleItemERC721', addr: contracts.ruleItemERC721, init: undefined },
    { name: 'AttestationVerifier', addr: attestationVerifierAddr, init: attVerInit },
    { name: 'VindexRegistry', addr: vindexRegistryAddr, init: undefined },
  ];

  return {
    address, isConnected, p, contracts, txBusy, txError, hash,
    attestationVerifierAddr, vindexRegistryAddr,
    initRuleAuthorityAddr, setInitRuleAuthorityAddr,
    initAttestVerifierAddr, setInitAttestVerifierAddr,
    initPWPVerifierAddr, setInitPWPVerifierAddr,
    initPWPAttestAddr, setInitPWPAttestAddr,
    authorityAddr, setAuthorityAddr,
    schemaUID, setSchemaUID,
    attesterAddr, setAttesterAddr,
    priceCents, setPriceCents,
    oracleAddr, setOracleAddr,
    withdrawTo, setWithdrawTo,
    withdrawAmount, setWithdrawAmount,
    minStake, setMinStake,
    consensusThreshold, setConsensusThreshold,
    targetAddress, setTargetAddress,
    newReputation, setNewReputation,
    reputationReason, setReputationReason,
    verifierInit, pwpInit, attVerInit,
    isAdmin,
    isTrustedAuthority: isTrustedAuthoritySafe,
    isTrustedAttester: isTrustedAttesterSafe,
    isTrustedSchema: isTrustedSchemaSafe,
    isPaused, maxSlot: (maxSlot ?? 0n) as bigint, subCents: (subCents ?? 0n) as bigint, oracleAddrRead, priceData, treasuryBal: (treasuryBal ?? 0n) as bigint,
    vMinStake: vMinStake ?? 0n, vConsensus: (vConsensus ?? 0n) as bigint,
    ethPrice, priceInEth, nativeSymbol,
    initVerifier, initPWP, setAuthority, setSchema, setAttester, setPrice, setOracle, togglePause, withdraw, withdrawAll, setStake, setConsensus, adjustReputation,
    CONTRACTS_LIST,
  };
}
