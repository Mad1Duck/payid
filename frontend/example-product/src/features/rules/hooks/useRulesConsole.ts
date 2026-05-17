import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId, useChains, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import {
  useActiveCombinedRule,
  useMyRules,
  usePayIDContext,
  useSubscribe,
  useSubscription,
  useSubscriptionPrice,
  useEffectiveAgentRule,
  usePreferredAgent,
  useAIAgent,
} from 'payid-react';
import { useQueryClient } from '@tanstack/react-query';
import { resolveStorageURI } from '@/lib/storage';
import { toast } from 'sonner';
import {
  CHAINLINK_ORACLE_ABI,
  CHAINLINK_ORACLE_ADDRESSES,
} from '@/constants/oracles';
import { useV4Palette } from '@/components/v4/theme';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { SlotData } from '../components/DroppableSlotZone';
import type { CartridgeData } from '../components/CartridgeTray';
import type { CartridgeType } from '../components/RuleCartridge';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { COMBINED_ABI } from '@/features/rules/abis/combinedRule';
import { buildRuleSetHash } from '@/features/rules/utils/ruleSetHash';

export function useRulesConsole() {
  const p = useV4Palette();
  const chainId = useChainId();
  const chains = useChains();
  const currentChain = chains.find((c) => c.id === chainId);
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH';
  const { address, isConnected } = useAccount();
  const { data: myRules = [], refetch: refetchMyRules } = useMyRules();
  const { data: activeCombined, refetch: refetchActiveCombined } = useActiveCombinedRule(address);
  const { data: sub } = useSubscription(address);
  const { contracts } = usePayIDContext();
  const queryClient = useQueryClient();

  /* ── AI Agent hooks ── */
  const { data: effectiveAgentRule } = useEffectiveAgentRule(address);
  const { data: preferredAgent } = usePreferredAgent(address);
  const { data: preferredAgentInfo } = useAIAgent(preferredAgent);

  /* ── Write contract ── */
  const { writeContract, data: registerHash, isPending: isRegistering, error: registerError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: registerSuccess } = useWaitForTransactionReceipt({ hash: registerHash });

  /* ── Subscribe ── */
  const { subscribe, isPending: subPending, isSuccess: subOk, isConfirming: subConfirming } = useSubscribe();
  const { data: subPrice } = useSubscriptionPrice();
  const price = subPrice ? (subPrice as bigint) : parseEther('0.001');

  /* ── Query Chainlink Oracle for ETH/USD price ── */
  const { data: oracleData } = useReadContract({
    address: CHAINLINK_ORACLE_ADDRESSES[chainId] || CHAINLINK_ORACLE_ADDRESSES[31337],
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
  });
  const ethUsdPrice = oracleData?.[1];

  /* ── Token Price Oracles for Multi-Token Pricing ── */
  const usdcPriceHook = useTokenPrice('USDC');
  const usdtPriceHook = useTokenPrice('USDT');
  const daiPriceHook = useTokenPrice('DAI');
  const wbtcPriceHook = useTokenPrice('WBTC');
  const linkPriceHook = useTokenPrice('LINK');
  const uniPriceHook = useTokenPrice('UNI');

  /* ── UI state ── */
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);
  const [activeCartridgeId, setActiveCartridgeId] = useState<string | null>(null);
  const [direction, setDirection] = useState<'none' | 'inbound' | 'outbound'>('none');
  const [version, setVersion] = useState('1');
  const [registerStage, setRegisterStage] = useState<'idle' | 'registering' | 'done' | 'error'>('idle');
  const [txLog, setTxLog] = useState<Array<{ time: string; msg: string; type: 'info' | 'ok' | 'err'; }>>([]);

  /* ── Demo test state ── */
  const [demoAmount, setDemoAmount] = useState('100');
  const [demoReceiver, setDemoReceiver] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
  const [demoTxValueUsd, setDemoTxValueUsd] = useState('4500000000');
  const [demoKycLevel, setDemoKycLevel] = useState('1');
  const [demoCountry, setDemoCountry] = useState('id');
  const [demoRiskScore, setDemoRiskScore] = useState('30');
  const [demoDailyLimit, setDemoDailyLimit] = useState('50000000');
  const [demoSpentToday, setDemoSpentToday] = useState('0');
  const [demoResult, setDemoResult] = useState<'idle' | 'running' | 'ALLOW' | 'REJECT'>('idle');
  const [demoReason, setDemoReason] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  /* ── NFT images + rule details ── */
  const [nftImages, setNftImages] = useState<Record<string, string | undefined>>({});
  const [ruleDetails, setRuleDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    async function load() {
      const imgs: Record<string, string> = {};
      const details: Record<string, any> = {};
      for (const r of myRules) {
        if (!r.uri) continue;
        try {
          const raw = await resolveStorageURI(r.uri);
          const meta = JSON.parse(raw);
          if (meta.image) {
            const img = meta.image.startsWith('ipfs://') ? await resolveStorageURI(meta.image) : meta.image;
            imgs[`rule_${r.ruleId.toString()}`] = img;
          }
          if (meta.rule) {
            let ruleVal = typeof meta.rule === 'string' ? JSON.parse(meta.rule) : meta.rule;
            if (ruleVal?.rule && !ruleVal?.if && !ruleVal?.conditions) ruleVal = ruleVal.rule;
            details[`rule_${r.ruleId.toString()}`] = ruleVal;
          }
        } catch (e) {
          console.error(`[RulesConsole] fetch failed for rule_${r.ruleId}:`, e);
        }
      }
      setNftImages(imgs);
      setRuleDetails(details);
    }
    if (myRules.length > 0) load();
  }, [myRules]);

  /* ── Cartridges ── */
  const allRules = myRules;
  const availableCartridges: CartridgeData[] = allRules.map((r) => ({
    id: `rule_${r.ruleId.toString()}`,
    type: 'minAmount' as CartridgeType,
    name: `Rule #${r.ruleId.toString()}`,
    summary: r.active ? `Token #${r.tokenId.toString()}` : 'INACTIVE',
    image: nftImages[`rule_${r.ruleId.toString()}`],
    ruleHash: r.ruleHash,
    authorityAddress: r.creator,
    active: r.active,
  }));

  /* ── Slots ── */
  const [slots, setSlots] = useState<SlotData[]>([
    { id: 'slot_a', label: 'SLOT A', cartridge: undefined },
    { id: 'slot_b', label: 'SLOT B', cartridge: undefined },
    { id: 'slot_c', label: 'SLOT C', cartridge: undefined },
  ]);

  const trayCartridges = availableCartridges.filter((c) => !slots.some((s) => s.cartridge?.id === c.id));
  const selectedSlots = slots.filter((s) => s.cartridge);
  const canRegister = selectedSlots.length > 0 && isConnected && !isRegistering && !isConfirming;

  /* ── Slot & cartridge handlers ── */
  const handleSlotClick = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot?.cartridge) setHighlightedSlot((prev) => (prev === slotId ? null : slotId));
  };

  const handleCartridgeEject = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.cartridge) {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, cartridge: undefined } : s)));
      toast('Rule Ejected', { description: `${slot.cartridge.name} removed from ${slot.label}` });
    }
  };

  const handleCartridgeDrop = (cartridgeId: string, slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.cartridge) {
      toast.error('Slot Occupied', { description: 'Remove the current cartridge first' });
      return;
    }
    const cartridge = availableCartridges.find((c) => c.id === cartridgeId);
    if (!cartridge) return;
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, cartridge } : s)));
    setHighlightedSlot(null);
    if (!cartridge.active) {
      toast.warning('Rule Inactive', { description: `${cartridge.name} loaded — activate first` });
    } else {
      toast.success('Rule Loaded', { description: `${cartridge.name} → ${slot?.label}` });
    }
  };

  const handleCartridgeClick = (cartridgeId: string) => {
    if (!highlightedSlot) {
      const empty = slots.find((s) => !s.cartridge);
      if (!empty) {
        toast.error('No Empty Slots', { description: 'Remove a cartridge first' });
        return;
      }
      handleCartridgeDrop(cartridgeId, empty.id);
    } else {
      handleCartridgeDrop(cartridgeId, highlightedSlot);
    }
  };

  /* ── DnD event handlers ── */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCartridgeId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id;
    if (typeof overId === 'string' && overId.startsWith('slot_')) {
      setHighlightedSlot(overId);
    } else {
      setHighlightedSlot(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCartridgeId(null);
      setHighlightedSlot(null);
      if (!over) return;
      const cartridgeId = active.id as string;
      const overId = over.id as string;
      if (overId === 'tray') {
        const src = slots.find((s) => s.cartridge?.id === cartridgeId);
        if (src) handleCartridgeEject(src.id);
        return;
      }
      const isFromSlot = slots.some((s) => s.cartridge?.id === cartridgeId);
      if (isFromSlot) {
        const srcSlot = slots.find((s) => s.cartridge?.id === cartridgeId)!;
        if (srcSlot.id === overId) return;
        setSlots((prev) =>
          prev.map((s) => {
            const src = prev.find((x) => x.id === srcSlot.id)!;
            const tgt = prev.find((x) => x.id === overId)!;
            if (s.id === srcSlot.id) return { ...s, cartridge: tgt.cartridge };
            if (s.id === overId) return { ...s, cartridge: src.cartridge };
            return s;
          }),
        );
        toast.success('Rules Swapped');
      } else {
        handleCartridgeDrop(cartridgeId, overId);
      }
    },
    [slots],
  );

  /* ── Register ── */
  const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleRegister = () => {
    const filled = slots.filter((s) => s.cartridge);
    if (filled.length === 0 || !isConnected) return;
    const selRules = filled.map((s) => allRules.find((r) => `rule_${r.ruleId.toString()}` === s.cartridge!.id)).filter(Boolean) as typeof allRules;
    if (selRules.length === 0) return;
    const unactivated = selRules.filter((r) => r.tokenId === 0n);
    if (unactivated.length > 0) {
      toast.error('Rules Not Activated', { description: `Activate rule(s) ${unactivated.map((r) => `#${r.ruleId}`).join(', ')} first` });
      return;
    }
    const tokenIds = selRules.map((r) => r.tokenId);
    const ver = BigInt(version || '1');
    const ruleSetHash = buildRuleSetHash(contracts.ruleItemERC721, tokenIds, ver);
    const ruleNFTs = Array(tokenIds.length).fill(contracts.ruleItemERC721) as Array<`0x${string}`>;
    setRegisterStage('registering');
    setTxLog((prev) => [...prev, { time: nowStr(), msg: '↻ Sending transaction…', type: 'info' }]);
    if (direction === 'none') {
      writeContract({ address: contracts.combinedRuleStorage, abi: COMBINED_ABI, functionName: 'registerCombinedRule', args: [ruleSetHash, ruleNFTs, tokenIds, ver] });
    } else {
      writeContract({ address: contracts.combinedRuleStorage, abi: COMBINED_ABI, functionName: 'registerCombinedRuleForDirection', args: [ruleSetHash, direction === 'inbound' ? 0 : 1, ruleNFTs, tokenIds, ver] });
    }
  };

  useEffect(() => {
    if (registerSuccess && registerStage === 'registering') {
      setRegisterStage('done');
      setTxLog((prev) => [...prev, { time: nowStr(), msg: '✓ Policy registered on-chain', type: 'ok' }]);
      toast.success('Policy Registered', { description: 'Combined rule is now live' });
      refetchMyRules();
      refetchActiveCombined();
      queryClient.invalidateQueries({ queryKey: ['useAllCombinedRules'] });
      setTimeout(() => {
        refetchMyRules();
        refetchActiveCombined();
        queryClient.invalidateQueries({ queryKey: ['useAllCombinedRules'] });
      }, 2000);
    }
  }, [registerSuccess, registerStage]);

  useEffect(() => {
    if (registerError && registerStage === 'registering') {
      const msg = (registerError as { shortMessage?: string; }).shortMessage ?? 'Unknown error';
      setRegisterStage('error');
      setTxLog((prev) => [...prev, { time: nowStr(), msg: `✗ ${msg}`, type: 'err' }]);
      toast.error('Registration Failed', { description: msg });
    }
  }, [registerError, registerStage]);

  useEffect(() => {
    if (subOk) {
      toast.success('Subscription active!', { description: `You now have ${sub?.maxSlots ?? 3} rule slots.` });
    }
  }, [subOk]);

  /* ── Overlay cartridge ── */
  const activeCartridge = activeCartridgeId
    ? (availableCartridges.find((c) => c.id === activeCartridgeId) ?? slots.flatMap((s) => (s.cartridge ? [s.cartridge] : [])).find((c) => c.id === activeCartridgeId))
    : null;

  /* ── Derived ── */
  const activeCount = myRules.filter((r) => r.active).length;

  return {
    p, chainId, nativeSymbol, address, isConnected, myRules, activeCombined, sub, contracts,
    effectiveAgentRule, preferredAgent, preferredAgentInfo,
    isRegistering, isConfirming, registerHash, registerSuccess, registerError,
    subscribe, subPending, subOk, subConfirming, subPrice, price,
    ethUsdPrice,
    usdcPriceHook, usdtPriceHook, daiPriceHook, wbtcPriceHook, linkPriceHook, uniPriceHook,
    highlightedSlot, setHighlightedSlot, activeCartridgeId, setActiveCartridgeId,
    direction, setDirection, version, setVersion, registerStage, setRegisterStage,
    txLog, setTxLog,
    demoAmount, setDemoAmount, demoReceiver, setDemoReceiver, demoTxValueUsd, setDemoTxValueUsd,
    demoKycLevel, setDemoKycLevel, demoCountry, setDemoCountry, demoRiskScore, setDemoRiskScore,
    demoDailyLimit, setDemoDailyLimit, demoSpentToday, setDemoSpentToday,
    demoResult, setDemoResult, demoReason, setDemoReason, showDemo, setShowDemo,
    nftImages, ruleDetails,
    slots, setSlots, trayCartridges, selectedSlots, canRegister,
    handleSlotClick, handleCartridgeEject, handleCartridgeDrop, handleCartridgeClick,
    handleDragStart, handleDragOver, handleDragEnd, handleRegister,
    activeCartridge, activeCount,
  };
}
