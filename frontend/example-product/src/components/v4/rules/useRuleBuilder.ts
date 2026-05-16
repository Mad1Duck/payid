import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useChains, useReadContract } from 'wagmi';
import {
  useActivateRule,
  useActiveCombinedRule,
  useCreateRule,
  useMyRules,
  usePayIDContext,
  useSubscribe,
  useSubscription,
  useSubscriptionPrice,
} from 'payid-react';
import { keccak256, stringToBytes } from 'viem';
import { toast } from 'sonner';
import { CHAINLINK_ORACLE_ADDRESSES, CHAINLINK_ORACLE_ABI } from '../../../constants/oracles';
import { genImage, dataUrlToUint8Array } from '@/features/rules/utils/image';
import { pinImage, pinJson, upload0G, get0GGateway } from '@/features/rules/utils/storage';
import { useV4Palette } from '../theme';
import { buildJson, canonicalize, makeBlank, plain } from '@/features/rules/utils/ruleEngine';
import type { Cond, RuleFormat } from '@/features/rules/types';
import { useClipboard } from '@/features/shared';

export type DeployStage = 'idle' | 'uploading' | 'creating' | 'done' | 'error';

export interface RuleBuilderState {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  nativeSymbol: string;
  p: any; // useV4Palette result
  contracts: any;
  ethUsdPrice: bigint | undefined;

  myRules: any[];
  activeCombined: any;
  sub: any;
  activeCount: number;
  refetchMyRules: () => void;
  refetchSub: () => void;

  conds: Cond[];
  setConds: React.Dispatch<React.SetStateAction<Cond[]>>;
  format: RuleFormat;
  setFormat: React.Dispatch<React.SetStateAction<RuleFormat>>;
  logic: 'AND' | 'OR';
  setLogic: React.Dispatch<React.SetStateAction<'AND' | 'OR'>>;
  ruleName: string;
  setRuleName: React.Dispatch<React.SetStateAction<string>>;
  ruleComment: string;
  setRuleComment: React.Dispatch<React.SetStateAction<string>>;
  denyMsg: string;
  setDenyMsg: React.Dispatch<React.SetStateAction<string>>;
  simpleMode: boolean;
  setSimpleMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  openPipes: Set<number>;
  setOpenPipes: React.Dispatch<React.SetStateAction<Set<number>>>;
  showJson: boolean;
  setShowJson: React.Dispatch<React.SetStateAction<boolean>>;
  copied: boolean;
  deployStage: DeployStage;
  setDeployStage: React.Dispatch<React.SetStateAction<DeployStage>>;
  deployMsg: string;
  setDeployMsg: React.Dispatch<React.SetStateAction<string>>;

  nftName: string;
  setNftName: React.Dispatch<React.SetStateAction<string>>;
  nftDesc: string;
  setNftDesc: React.Dispatch<React.SetStateAction<string>>;
  imgDataUrl: string | null;
  setImgDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  fileRef: React.RefObject<HTMLInputElement>;

  activateId: string;
  setActivateId: React.Dispatch<React.SetStateAction<string>>;
  activateRule: (id: bigint) => void;
  activating: boolean;
  activatingPending: boolean;
  activatingConfirming: boolean;
  activateStatus: 'idle' | 'done' | 'error';
  setActivateStatus: React.Dispatch<React.SetStateAction<'idle' | 'done' | 'error'>>;
  activateMsg: string;
  setActivateMsg: React.Dispatch<React.SetStateAction<string>>;

  subscribe: (price: bigint) => void;
  subPending: boolean;
  subConfirming: boolean;
  subOk: boolean;
  subError: any;
  subPrice: bigint | undefined;
  isSupportedChain: boolean;
  is0G: boolean;

  ruleJson: string;
  ruleHash: string;
  summary: string;

  updateCond: (i: number, patch: Partial<Cond>) => void;
  copyJson: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeploy: () => Promise<void>;
}

export function useRuleBuilder(): RuleBuilderState {
  const { address, isConnected, chainId } = useAccount();
  const chains = useChains();
  const currentChain = chains.find((c) => c.id === chainId);
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH';

  const storagePreference = useMemo(() => {
    const saved = localStorage.getItem('payid-storage-preference');
    return saved === '0g' || saved === 'ipfs' ? saved : '0g';
  }, []);

  const { data: myRules = [], refetch: refetchMyRules } = useMyRules();
  const { data: activeCombined } = useActiveCombinedRule(address);
  const { data: sub, refetch: refetchSub } = useSubscription(address);
  const { contracts } = usePayIDContext();
  const p = useV4Palette();

  const { data: oracleData } = useReadContract({
    address: CHAINLINK_ORACLE_ADDRESSES[chainId ?? 31337] || CHAINLINK_ORACLE_ADDRESSES[31337],
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
  });
  const ethUsdPrice = oracleData?.[1] as bigint | undefined;

  const [conds, setConds] = useState<Cond[]>([makeBlank()]);
  const [format, setFormat] = useState<RuleFormat>('simple');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [ruleName, setRuleName] = useState('rule_001');
  const [ruleComment, setRuleComment] = useState('');
  const [denyMsg, setDenyMsg] = useState('Transaction rejected by policy');
  const [simpleMode, setSimpleMode] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [openPipes, setOpenPipes] = useState<Set<number>>(new Set());
  const [showJson, setShowJson] = useState(false);
  const { copied, copy } = useClipboard();
  const [deployStage, setDeployStage] = useState<DeployStage>('idle');
  const [deployMsg, setDeployMsg] = useState('');
  const { createRule, isSuccess: created, error: createErr } = useCreateRule();

  const [nftName, setNftName] = useState('PAY.ID Rule NFT');
  const [nftDesc, setNftDesc] = useState('PAY.ID programmable payment policy');
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  const [activateId, setActivateId] = useState('');
  const {
    activateRule,
    isPending: activatingPending,
    isConfirming: activatingConfirming,
    isSuccess: activated,
    error: activateErr,
  } = useActivateRule();
  const activating = activatingPending || activatingConfirming;
  const [activateStatus, setActivateStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [activateMsg, setActivateMsg] = useState('');

  const {
    subscribe,
    isPending: subPending,
    isSuccess: subOk,
    isConfirming: subConfirming,
    error: subError,
  } = useSubscribe();

  const { data: subPriceRaw } = useSubscriptionPrice();
  const subPrice = subPriceRaw ? BigInt(subPriceRaw as string) : undefined;

  const is0G = chainId === 16601 || chainId === 16602;
  const isSupportedChain = is0G || chainId === 31337;

  useEffect(() => {
    console.log('[RulesPage] Subscription state:', {
      chainId,
      isSupportedChain,
      isPending: subPending,
      isSuccess: subOk,
      subError: subError ? String(subError) : null,
      subPrice: subPrice ? String(subPrice) : null,
    });
  }, [chainId, isSupportedChain, subPending, subOk, subError, subPrice]);

  useEffect(() => {
    if (subError) {
      console.error('[RulesPage] Subscription error:', subError);
      console.error('[RulesPage] Current chain:', chainId);
      console.error('[RulesPage] Full error object:', JSON.stringify(subError, null, 2));
      const errorMsg =
        (subError as { shortMessage?: string; message?: string; }).shortMessage ||
        (subError as { message?: string; }).message ||
        'Transaction failed';

      if (!isSupportedChain) {
        toast.error('Subscription Failed', {
          description: `Contracts not deployed on chain ${chainId}. Switch to 0G Testnet (16601/16602) or Hardhat (31337).`,
        });
      } else if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        toast.error('Subscription Failed', {
          description: `Insufficient ${nativeSymbol} balance to pay for subscription.`,
        });
      } else if (errorMsg.includes('paused') || errorMsg.includes('Pausable')) {
        toast.error('Subscription Failed', { description: 'Contract is currently paused. Contact admin.' });
      } else {
        toast.error('Subscription Failed', { description: errorMsg });
      }
    }
  }, [subError, chainId, isSupportedChain, nativeSymbol]);

  const activeCount = myRules.filter((r) => r.active).length;

  const ruleJson = useMemo(() => {
    const obj = buildJson(conds, format, logic, ruleName, ruleComment, denyMsg);
    return JSON.stringify(canonicalize({ rule: obj }), null, 2);
  }, [conds, format, logic, ruleName, ruleComment, denyMsg]);

  const ruleHash = useMemo(() => keccak256(stringToBytes(ruleJson)), [ruleJson]);

  const summary = useMemo(() => {
    const parts = conds.filter((c) => c.field && c.op).map(plain);
    if (!parts.length) return 'Add at least one condition';
    if (format === 'simple') return `BLOCK if: ${parts[0]}`;
    return `BLOCK if: ${parts.join(` ${logic} `)}`;
  }, [conds, format, logic]);

  const updateCond = useCallback(
    (i: number, patch: Partial<Cond>) =>
      setConds((prev) => {
        const n = [...prev];
        n[i] = { ...n[i], ...patch } as Cond;
        return n;
      }),
    [],
  );

  const copyJson = useCallback(() => {
    copy(ruleJson);
  }, [copy, ruleJson]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImgDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!isConnected) return;
    setDeployStage('uploading');
    setDeployMsg(storagePreference === '0g' ? 'Uploading to 0G Storage…' : 'Uploading to IPFS…');
    try {
      const imgToPin = imgDataUrl ?? genImage(ruleName, ruleHash);
      let imageURL: string;
      let tokenUri: string;

      if (storagePreference === '0g') {
        const imgBytes = dataUrlToUint8Array(imgToPin);
        const { MemData } = await import('@0gfoundation/0g-storage-ts-sdk');
        const imgMem = new MemData(imgBytes);
        const [imgTree, imgTreeErr] = await imgMem.merkleTree();
        if (imgTreeErr) throw new Error(`0G merkle error: ${imgTreeErr}`);
        const imgRootHash = (imgTree as { rootHash: () => string; }).rootHash();
        imageURL = `${get0GGateway()}/file?root=${imgRootHash}`;

        const metadata = {
          name: nftName || `PAY.ID Rule — ${ruleName}`,
          description: nftDesc || denyMsg,
          image: imageURL,
          attributes: [
            { trait_type: 'Rule ID', value: ruleName },
            { trait_type: 'Engine', value: 'PAY.ID' },
            { trait_type: 'Standard', value: 'payid.rule.v1' },
            { trait_type: 'Storage', value: '0G' },
          ],
          rule: (JSON.parse(ruleJson) as { rule: unknown; }).rule ?? JSON.parse(ruleJson),
          ruleHash,
          standard: 'payid.rule.v1',
        };

        const jsonBytes = new TextEncoder().encode(JSON.stringify(metadata));
        setDeployMsg('Uploading assets to 0G Storage in parallel...');
        const [_imgRes, jsonRes] = await Promise.all([upload0G(imgBytes), upload0G(jsonBytes)]);
        tokenUri = jsonRes.url;
      } else {
        const { url: imgUrl } = await pinImage(imgToPin, `rule-${ruleName}.png`);
        imageURL = imgUrl;

        const metadata = {
          name: nftName || `PAY.ID Rule — ${ruleName}`,
          description: nftDesc || denyMsg,
          image: imageURL,
          attributes: [
            { trait_type: 'Rule ID', value: ruleName },
            { trait_type: 'Engine', value: 'PAY.ID' },
            { trait_type: 'Standard', value: 'payid.rule.v1' },
            { trait_type: 'Storage', value: 'IPFS' },
          ],
          rule: (JSON.parse(ruleJson) as { rule: unknown; }).rule ?? JSON.parse(ruleJson),
          ruleHash,
          standard: 'payid.rule.v1',
        };
        const { url: jsonUrl } = await pinJson(metadata, `rule-${ruleName}.json`);
        tokenUri = jsonUrl;
      }

      setDeployStage('creating');
      setDeployMsg('Confirm the transaction in your wallet…');
      createRule({ ruleHash, uri: tokenUri });
    } catch (e: unknown) {
      setDeployStage('error');
      setDeployMsg((e as { message?: string; }).message ?? 'Upload failed');
    }
  }, [isConnected, storagePreference, imgDataUrl, ruleName, ruleHash, nftName, nftDesc, denyMsg, ruleJson, createRule]);

  useEffect(() => {
    if (created && deployStage === 'creating') {
      setDeployStage('done');
      setDeployMsg('Rule NFT created! It will appear in My Rules below.');
      toast.success('Rule NFT created!', { description: 'Refreshing your rules list…' });
      refetchMyRules();
      setTimeout(() => refetchMyRules(), 2000);
    }
  }, [created, deployStage, refetchMyRules]);

  useEffect(() => {
    if (createErr && deployStage === 'creating') {
      setDeployStage('error');
      const msg = (createErr as { shortMessage?: string; }).shortMessage ?? 'Transaction failed';
      setDeployMsg(msg);
      toast.error('Create rule failed', { description: msg });
    }
  }, [createErr, deployStage]);

  useEffect(() => {
    if (activated) {
      toast.success('Rule activated!', { description: 'NFT license minted. Policy is now enforced.' });
      setActivateStatus('done');
      setActivateMsg('✓ Rule activated! NFT license minted.');
      refetchMyRules();
    }
  }, [activated, refetchMyRules]);

  useEffect(() => {
    if (activateErr) {
      const msg = (activateErr as { shortMessage?: string; }).shortMessage ?? 'Transaction failed';
      toast.error('Activation failed', { description: msg });
      setActivateStatus('error');
      setActivateMsg(msg);
    }
  }, [activateErr]);

  useEffect(() => {
    if (subOk) {
      toast.success('Subscription active!', { description: 'You can now activate rule NFTs.' });
      refetchSub();
    }
  }, [subOk, refetchSub]);

  return {
    address,
    isConnected,
    chainId,
    nativeSymbol,
    p,
    contracts,
    ethUsdPrice,

    myRules,
    activeCombined,
    sub,
    activeCount,
    refetchMyRules,
    refetchSub,

    conds,
    setConds,
    format,
    setFormat,
    logic,
    setLogic,
    ruleName,
    setRuleName,
    ruleComment,
    setRuleComment,
    denyMsg,
    setDenyMsg,
    simpleMode,
    setSimpleMode,
    selectedTemplate,
    setSelectedTemplate,
    openPipes,
    setOpenPipes,
    showJson,
    setShowJson,
    copied,
    deployStage,
    setDeployStage,
    deployMsg,
    setDeployMsg,

    nftName,
    setNftName,
    nftDesc,
    setNftDesc,
    imgDataUrl,
    setImgDataUrl,
    fileRef,

    activateId,
    setActivateId,
    activateRule,
    activating,
    activatingPending,
    activatingConfirming,
    activateStatus,
    setActivateStatus,
    activateMsg,
    setActivateMsg,

    subscribe,
    subPending,
    subConfirming,
    subOk,
    subError,
    subPrice,
    isSupportedChain,
    is0G,

    ruleJson,
    ruleHash,
    summary,

    updateCond,
    copyJson,
    handleFileChange,
    handleDeploy,
  };
}
