import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { usePayIDContext } from 'payid-react';
import { parseEther } from 'viem';
import {
  attestationVerifierAbi,
  payIDVerifierAbi,
  payWithPayIDAbi,
  ruleItemERC721Abi,
  vindexRegistryAbi,
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

  const { writeContract, isPending, error, data: hash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });
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
    abi: payIDVerifierAbi,
    functionName: 'isInitialized',
  });
  const { data: pwpInit } = useReadContract({
    address: contracts.payWithPayID,
    abi: payWithPayIDAbi,
    functionName: 'isInitialized',
  });
  const { data: attVerInit } = useReadContract({
    address: attestationVerifierAddr,
    abi: attestationVerifierAbi,
    functionName: 'isInitialized',
    query: { enabled: attestationVerifierAddr !== '0x0000000000000000000000000000000000000000' },
  });

  const { data: isTrustedAuthority } = useReadContract({
    address: contracts.payIDVerifier,
    abi: payIDVerifierAbi,
    functionName: 'trustedAuthorities',
    args: [authorityAddr as `0x${string}`],
    query: { enabled: authorityAddr.startsWith('0x') && authorityAddr.length === 42 },
  });
  const { data: isTrustedAttester } = useReadContract({
    address: attestationVerifierAddr,
    abi: attestationVerifierAbi,
    functionName: 'trustedAttesters',
    args: [attesterAddr as `0x${string}`],
    query: { enabled: attesterAddr.startsWith('0x') && attesterAddr.length === 42 },
  });
  const { data: isTrustedSchema } = useReadContract({
    address: attestationVerifierAddr,
    abi: attestationVerifierAbi,
    functionName: 'trustedSchemas',
    args: [schemaUID as `0x${string}`],
    query: { enabled: schemaUID.startsWith('0x') && schemaUID.length === 66 },
  });

  const { data: isPaused } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'paused',
  });
  const { data: maxSlot } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'MAX_SLOT',
  });
  const { data: subCents } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'subscriptionUsdCents',
  });
  const { data: oracleAddrRead } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
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
    abi: vindexRegistryAbi,
    functionName: 'minStake',
    query: { enabled: vindexRegistryAddr !== '0x0000000000000000000000000000000000000000' },
  });
  const { data: vConsensus } = useReadContract({
    address: vindexRegistryAddr,
    abi: vindexRegistryAbi,
    functionName: 'consensusThreshold',
    query: { enabled: vindexRegistryAddr !== '0x0000000000000000000000000000000000000000' },
  });

  const ethPrice = priceData ? (Number(priceData[1]) / 1e8).toFixed(2) : null;
  const priceInEth = subCents && ethPrice ? (Number(subCents) / 100 / Number(ethPrice)).toFixed(6) : '—';

  /* ── Handlers ── */
  const initVerifier = () => {
    if (!initRuleAuthorityAddr || !initAttestVerifierAddr) return;
    writeContract({
      address: contracts.payIDVerifier,
      abi: payIDVerifierAbi,
      functionName: 'initialize',
      args: [initRuleAuthorityAddr as `0x${string}`, initAttestVerifierAddr as `0x${string}`],
    });
  };
  const initPWP = () => {
    if (!initPWPVerifierAddr || !initPWPAttestAddr) return;
    writeContract({
      address: contracts.payWithPayID,
      abi: payWithPayIDAbi,
      functionName: 'initialize',
      args: [initPWPVerifierAddr as `0x${string}`, initPWPAttestAddr as `0x${string}`],
    });
  };
  const setAuthority = (trusted: boolean) => {
    if (!authorityAddr) return;
    writeContract({
      address: contracts.payIDVerifier,
      abi: payIDVerifierAbi,
      functionName: 'setTrustedAuthority',
      args: [authorityAddr as `0x${string}`, trusted],
    });
  };
  const setSchema = (trusted: boolean) => {
    if (!schemaUID) return;
    writeContract({
      address: attestationVerifierAddr,
      abi: attestationVerifierAbi,
      functionName: 'setTrustedSchema',
      args: [schemaUID as `0x${string}`, trusted],
    });
  };
  const setAttester = (trusted: boolean) => {
    if (!attesterAddr) return;
    writeContract({
      address: attestationVerifierAddr,
      abi: attestationVerifierAbi,
      functionName: 'setTrustedAttester',
      args: [attesterAddr as `0x${string}`, trusted],
    });
  };
  const setPrice = () => {
    if (!priceCents) return;
    writeContract({
      address: contracts.ruleItemERC721,
      abi: ruleItemERC721Abi,
      functionName: 'setSubscriptionUsdCents',
      args: [BigInt(priceCents)],
    });
  };
  const setOracle = () => {
    if (!oracleAddr) return;
    writeContract({
      address: contracts.ruleItemERC721,
      abi: ruleItemERC721Abi,
      functionName: 'setOracle',
      args: [oracleAddr as `0x${string}`],
    });
  };
  const togglePause = () => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: ruleItemERC721Abi,
      functionName: isPaused ? 'unpause' : 'pause',
    });
  };
  const withdraw = () => {
    if (!withdrawTo || !withdrawAmount) return;
    writeContract({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI,
      functionName: 'withdrawTreasury',
      args: [withdrawTo as `0x${string}`, parseEther(withdrawAmount)],
    });
  };
  const withdrawAll = () => {
    if (!withdrawTo) return;
    writeContract({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI,
      functionName: 'withdrawAllTreasury',
      args: [withdrawTo as `0x${string}`],
    });
  };
  const setStake = () => {
    if (!minStake) return;
    writeContract({
      address: vindexRegistryAddr,
      abi: vindexRegistryAbi,
      functionName: 'setMinStake',
      args: [parseEther(minStake)],
    });
  };
  const setConsensus = () => {
    if (!consensusThreshold) return;
    writeContract({
      address: vindexRegistryAddr,
      abi: vindexRegistryAbi,
      functionName: 'setConsensusThreshold',
      args: [Number(consensusThreshold)],
    });
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
    verifierInit, pwpInit, attVerInit,
    isTrustedAuthority, isTrustedAttester, isTrustedSchema,
    isPaused, maxSlot, subCents, oracleAddrRead, priceData, treasuryBal,
    vMinStake, vConsensus,
    ethPrice, priceInEth,
    initVerifier, initPWP, setAuthority, setSchema, setAttester, setPrice, setOracle, togglePause, withdraw, withdrawAll, setStake, setConsensus,
    CONTRACTS_LIST,
  };
}
