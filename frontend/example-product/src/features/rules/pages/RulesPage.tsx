import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  Image as ImageIcon,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
  Zap,
} from 'lucide-react'
import { parseEther } from 'viem'
import PremiumButton from '@/components/v4/PremiumButton'
import { formatPriceWithUSD } from '@/features/rules/utils/pricing'
import { genImage } from '@/features/rules/utils/image'
import { buildFieldExpr, makeBlank } from '@/features/rules/utils/ruleEngine'
import { TEMPLATES } from '@/features/rules/data/templates'
import { useRuleBuilder } from '../hooks/useRuleBuilder'
import { getPinataJWT, RuleImage } from '@/features/rules';
import { toast } from 'sonner';
import { uriToHttp } from '../utils/storage';
import { ruleItemERC721Abi } from '@/constants/contracts/RuleItemERC721';

function RuleCardItem({ rule, p, contracts, refetchMyRules, refetchSub }: any) {
  const [meta, setMeta] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Rule deactivated!', { description: 'Slot is now free.' });
      refetchMyRules?.();
      refetchSub?.();
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      const msg = (error as { shortMessage?: string; }).shortMessage ?? 'Transaction failed';
      toast.error('Deactivation failed', { description: msg });
    }
  }, [error]);

  useEffect(() => {
    if (!rule.uri) return;
    let cancel = false;
    const fetchMeta = async () => {
      try {
        const url = uriToHttp(rule.uri);
        if (url.startsWith('data:')) {
          const base64 = url.split(',')[1];
          if (base64) {
            const json = JSON.parse(decodeURIComponent(escape(atob(base64))));
            if (!cancel) setMeta(json);
          }
          return;
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('image/')) return;
        const json = await res.json();
        if (!cancel) {
          setMeta(json);
          setLoadingMeta(false);
        }
      } catch (e) {
        if (!cancel) setLoadingMeta(false);
      }
    };
    fetchMeta();
    return () => { cancel = true; };
  }, [rule.uri]);

  return (
    <div
      className={`rounded-xl border ${p.cardBorder} overflow-hidden`}
      style={{
        backgroundColor: p.dark
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(0,0,0,0.02)',
      }}
    >
      <div className="aspect-video bg-[#00D084]/5 relative overflow-hidden group">
        <RuleImage
          uri={rule.uri}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-semibold text-sm truncate">
            {meta?.name || `Rule #${rule.ruleId.toString()}`}
          </p>
          {meta?.description && (
            <p className="text-white/80 text-[10px] truncate mt-0.5">
              {meta.description}
            </p>
          )}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs font-semibold ${p.textMain}`}>
            {meta?.name || `Rule #${rule.ruleId.toString()}`}
          </p>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              rule.tokenId > 0n
                ? 'bg-[#00D084]/15 text-[#00D084]'
                : 'bg-[#64748B]/15 text-[#64748B]'
            }`}
          >
            {rule.tokenId > 0n ? '✓ Activated' : 'Pending'}
          </span>
        </div>
        
        {loadingMeta && !meta ? (
          <p className="text-[10px] text-amber-500 animate-pulse mb-2">Loading IPFS metadata...</p>
        ) : meta?.attributes && (
          <div className="flex flex-wrap gap-1 mt-2 mb-2">
            {meta.attributes.map((attr: any, idx: number) => (
              <span key={idx} className="px-1.5 py-0.5 rounded bg-black/5 text-[9px] font-medium text-gray-500">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1">
          <p
            className={`text-[10px] font-mono ${p.textMuted} truncate`}
          >
            {rule.ruleHash.slice(0, 18)}…
          </p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(rule.ruleHash)
                toast.success('Hash copied!')
              } catch {
                toast.error('Failed to copy')
              }
            }}
            className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
            title="Copy hash"
          >
            <Copy className="w-3 h-3 text-[#94a3b8]" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {rule.tokenId > 0n && (
            <button
              onClick={async () => {
                try {
                  const eth = (window as any).ethereum
                  if (!eth) {
                    toast.error('No wallet found')
                    return
                  }
                  await eth.request({
                    method: 'wallet_watchAsset',
                    params: {
                      type: 'ERC721',
                      options: {
                        address: contracts.ruleItemERC721,
                        tokenId: rule.tokenId.toString(),
                      },
                    },
                  })
                  toast.success('NFT added to wallet!')
                } catch (e) {
                  const err = e as Error;
                  if (err.message?.includes('not owned')) {
                    toast.error('Failed to add NFT', {
                      description: 'MetaMask has not detected this NFT yet. Please wait a few seconds for the RPC to sync, then try again.',
                    })
                  } else {
                    toast.error('Failed to add NFT', {
                      description: err.message,
                    })
                  }
                }
              }}
              className="flex items-center gap-1 text-[10px] font-medium text-[#0EA5E9] hover:underline"
            >
              <Wallet className="w-3 h-3" /> Add to Wallet
            </button>
          )}

          {rule.tokenId > 0n && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Deactivate this rule to free up a slot? This action cannot be undone.")) {
                  writeContract({
                    address: contracts.ruleItemERC721,
                    abi: ruleItemERC721Abi,
                    functionName: 'deactivateRule',
                    args: [rule.ruleId],
                  });
                }
              }}
              disabled={isPending || isConfirming}
              className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:text-red-400 hover:underline disabled:opacity-50"
              title="Deactivate to free slot"
            >
              {isPending || isConfirming ? (
                <Loader2 className="w-3 h-3 animate-spin text-red-500" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              {isPending ? 'Confirming...' : isConfirming ? 'Deactivating...' : 'Deactivate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Context field suggestions (datalist) ── */
const CTX_FIELDS = [
  'tx.amount',
  'tx.token',
  'tx.sender',
  'tx.receiver',
  'tx.data',
  'payId.owner',
  'payId.ruleHash',
  'intent.amount',
  'intent.currency',
  'intent.recipient',
  'env.chainId',
  'env.timestamp',
  'oracle.ethUsd',
  'oracle.kycLevel',
  'oracle.country',
  'risk.score',
  'risk.category',
  'state.spentToday',
  'state.dailyLimit',
]

const TRANSFORMS = [
  { label: '— none —', value: '' },
  { label: 'div:N (divide)', value: 'div' },
  { label: 'mod:N (modulo)', value: 'mod' },
  { label: 'abs (absolute)', value: 'abs' },
  { label: 'hour (of day)', value: 'hour' },
  { label: 'day (of week)', value: 'day' },
  { label: 'date (of month)', value: 'date' },
  { label: 'month (of year)', value: 'month' },
  { label: 'len (str length)', value: 'len' },
  { label: 'lower (lowercase)', value: 'lower' },
  { label: 'upper (uppercase)', value: 'upper' },
]

const OPS = [
  { v: '>=', label: '>=' },
  { v: '<=', label: '<=' },
  { v: '>', label: '>' },
  { v: '<', label: '<' },
  { v: '==', label: '==' },
  { v: '!=', label: '!=' },
  { v: 'in', label: 'in (set)' },
  { v: 'not_in', label: 'not_in (set)' },
  { v: 'between', label: 'between (range)' },
  { v: 'not_between', label: 'not_between' },
  { v: 'mod_eq', label: 'mod_eq' },
  { v: 'mod_ne', label: 'mod_ne' },
  { v: 'contains', label: 'contains' },
  { v: 'not_contains', label: 'not_contains' },
  { v: 'starts_with', label: 'starts_with' },
  { v: 'ends_with', label: 'ends_with' },
  { v: 'exists', label: 'exists' },
  { v: 'not_exists', label: 'not_exists' },
  { v: 'regex', label: 'regex' },
  { v: 'not_regex', label: 'not_regex' },
]
const NO_VAL = new Set(['exists', 'not_exists'])
const ARR_OPS = new Set([
  'in',
  'not_in',
  'between',
  'not_between',
  'mod_eq',
  'mod_ne',
])
const NO_ARG = new Set([
  'abs',
  'hour',
  'day',
  'date',
  'month',
  'len',
  'lower',
  'upper',
])


const UNAVAILABLE_TEMPLATES = new Set([
  'KYC Required',
  'Low Risk Only',
  'Indonesia Only',
  'USD Minimum',
  'Daily Budget',
])

export default function RulesPage() {
  const {
    isConnected, nativeSymbol, p, contracts, ethUsdPrice,
    myRules, activeCombined, sub, activeCount, refetchMyRules, refetchSub,
    conds, setConds, format, setFormat, logic, setLogic, ruleName, setRuleName,
    ruleComment, setRuleComment, denyMsg, setDenyMsg, simpleMode, setSimpleMode,
    selectedTemplate, setSelectedTemplate, openPipes, setOpenPipes, showJson, setShowJson,
    copied, copyJson, deployStage, setDeployStage, deployMsg, setDeployMsg,
    nftName, setNftName, nftDesc, setNftDesc, imgDataUrl, setImgDataUrl, fileRef,
    activateId, setActivateId, activateRule, activating, activatingPending, activatingConfirming, activateStatus, setActivateStatus,
    activateMsg, setActivateMsg,
    subscribe, subPending, subConfirming, subPrice, is0G,
    ruleJson, ruleHash, summary,
    updateCond, handleFileChange, handleDeploy,
  } = useRuleBuilder()

  const { writeContract } = useWriteContract()

  const card = `rounded-2xl border ${p.cardBorder}`
  const inp = `px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (deployStage === 'done') {
      setActiveStep(2);
    }
  }, [deployStage]);

  const stepBadge = (n: number, label: string, done: boolean) => {
    const isActive = activeStep === n;
    return (
      <button
        key={n}
        onClick={() => setActiveStep(n)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
          isActive
            ? 'border-[#00D084]/50 bg-[#00D084]/15 text-[#00D084] shadow-[0_0_12px_rgba(0,208,132,0.1)]'
            : done
            ? 'border-[#00D084]/30 bg-[#00D084]/5 text-[#00D084]/80 hover:bg-[#00D084]/10'
            : `${p.cardBorder} ${p.textMuted} hover:bg-black/5 dark:hover:bg-white/5`
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
            isActive || done
              ? 'bg-[#00D084] text-[#0B0F1A]'
              : 'bg-current/20'
          }`}
        >
          {n}
        </span>
        {label}
      </button>
    );
  };

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <Wallet className="w-10 h-10 text-[#64748B] mx-auto mb-4" />
        <h2 className={`text-lg font-semibold ${p.textMain} mb-1`}>
          Connect Wallet
        </h2>
        <p className={`text-xs ${p.textMuted}`}>
          Link your wallet to send payments with policy enforcement.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-5"
    >
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${p.textMain}`}>Rule Builder</h1>
            <p className={`text-sm ${p.textMuted} mt-0.5`}>
              Build, deploy, and activate payment policies
            </p>
          </div>
          {isConnected && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${p.cardBorder} text-xs ${p.textMuted}`}
              style={{ backgroundColor: p.cardBg }}
            >
              <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                {sub?.isActive
                  ? `Pro · ${myRules.length}/${sub.maxSlots} slots`
                  : `Free · ${myRules.length}/1 slot`}
              </span>
              {!sub?.isActive && (
                <button
                  onClick={() => subscribe((subPrice as bigint | undefined) ?? parseEther('0.001'))}
                  disabled={subPending || subConfirming}
                  className="ml-1 px-2.5 py-0.5 rounded-lg bg-[#F59E0B] text-black font-semibold disabled:opacity-50 text-[11px]"
                >
                  {subPending || subConfirming ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Upgrade'
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step flow */}
        {isConnected && (
          <div className="flex flex-wrap gap-2">
            {stepBadge(
              1,
              'Build Rule',
              conds.some((c) => c.field && c.value),
            )}
            {stepBadge(2, 'Deploy NFT', myRules.length > 0)}
            {stepBadge(
              3,
              'Activate',
              myRules.some((r) => r.tokenId > 0n),
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Active Rules',
              value: activeCount.toString(),
              color: '#00D084',
            },
            {
              label: 'Total Rules',
              value: myRules.length.toString(),
              color: '#0EA5E9',
            },
            {
              label: 'Policy',
              value: activeCombined?.hash ? 'Live' : 'Off',
              color: activeCombined?.hash ? '#00D084' : '#F59E0B',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${card} p-3 sm:p-4`}
              style={{ backgroundColor: p.cardBg }}
            >
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
              <p className={`text-[11px] mt-0.5 ${p.textMuted}`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ───── STEP 1: BUILD RULE ───── */}
      {activeStep === 1 && (
      <div
        className={`${card} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        {/* Section header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{
            borderColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            background: p.dark
              ? 'rgba(0,208,132,0.06)'
              : 'rgba(0,208,132,0.04)',
          }}
        >
          <span className="w-7 h-7 rounded-full bg-[#00D084] text-[#0B0F1A] font-bold text-sm flex items-center justify-center shrink-0">
            1
          </span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${p.textMain}`}>
              Build Your Rule
            </p>
            <p className={`text-[11px] ${p.textMuted}`}>
              Define the conditions that guard your payments
            </p>
          </div>
          <button
            onClick={() => setSimpleMode((v) => !v)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-colors shrink-0 ${
              simpleMode
                ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/30'
                : `${p.cardBorder} ${p.textMuted}`
            }`}
          >
            {simpleMode ? 'Simple' : 'Advanced'}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Templates */}
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${p.textMuted} mb-2.5`}
            >
              {simpleMode
                ? 'What do you want to guard against?'
                : 'Start from a template'}
            </p>
            <div
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {TEMPLATES.map((t) => {
                const isSelected = selectedTemplate === t.label
                const isUnavailable = UNAVAILABLE_TEMPLATES.has(t.label)

                return (
                  <div key={t.label} className="relative">
                    <button
                      disabled={isUnavailable}
                      onClick={() => {
                        setSelectedTemplate(t.label)
                        setConds(t.conds.map((c) => ({ ...c })))
                        setFormat(t.fmt)
                        setRuleName(t.label.toLowerCase().replace(/ /g, '_'))
                        setOpenPipes(new Set())
                      }}
                      className={`w-full h-full flex flex-col items-start gap-1.5 rounded-xl border text-left transition-all ${
                        simpleMode ? 'p-4' : 'px-2 py-3 items-center text-center'
                      } ${
                        isSelected
                          ? 'border-[#00D084]/50 bg-[#00D084]/5'
                          : `${p.cardBorder} ${p.textMain} ${
                              isUnavailable
                                ? 'bg-black/5 dark:bg-white/5 border-dashed border-gray-500/30'
                                : 'hover:border-[#00D084]/30 hover:bg-[#00D084]/3'
                            }`
                      }`}
                      style={{
                        filter: 'none',
                      }}
                    >
                      <span className={simpleMode ? 'text-3xl' : 'text-xl'}>
                        {t.icon}
                      </span>
                      <span
                        className={`font-semibold truncate w-full block ${simpleMode ? 'text-sm' : 'text-[11px]'} ${isUnavailable ? 'pr-12' : ''}`}
                      >
                        {t.label}
                      </span>
                      {simpleMode && (
                        <span className="text-[11px] opacity-70 leading-relaxed truncate w-full block">
                          {t.desc}
                        </span>
                      )}
                    </button>

                    {isUnavailable && (
                      <>
                        {/* Fully transparent overlay to capture clicks and trigger toast */}
                        <div
                          className="absolute inset-0 bg-transparent cursor-not-allowed z-10"
                          title="Not available because oracle data is being prepared"
                          onClick={(e) => {
                            e.stopPropagation()
                            toast.info('Oracle Preparing', {
                              description:
                                'This template is currently unavailable because on-chain oracle data feeds are still being prepared.',
                            })
                          }}
                        />
                        {/* Sleek top-right badge */}
                        <div
                          className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/35 select-none pointer-events-none z-20"
                        >
                          <Shield className="w-2.5 h-2.5 text-[#F59E0B] animate-pulse" />
                          <span className="text-[8px] font-bold text-[#F59E0B] tracking-wider uppercase">
                            Preparing
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {!simpleMode && (
            <>
              {/* ID + Comment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                  >
                    ID *
                  </label>
                  <input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="rule_001"
                    className={`${inp} w-full font-mono`}
                  />
                </div>
                <div>
                  <label
                    className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                  >
                    Comment
                  </label>
                  <input
                    value={ruleComment}
                    onChange={(e) => setRuleComment(e.target.value)}
                    placeholder="What this rule does"
                    className={`${inp} w-full`}
                  />
                </div>
              </div>

              {/* Format tabs */}
              <div
                className={`flex rounded-xl overflow-hidden border ${p.cardBorder}`}
              >
                {(['simple', 'multi', 'nested'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFormat(f)
                      if (f === 'simple')
                        setConds((prev) => [prev[0] ?? makeBlank()])
                    }}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      format === f
                        ? 'bg-[#00D084] text-[#0B0F1A]'
                        : p.dark
                          ? 'bg-white/5 text-white/40 hover:text-white/70'
                          : 'bg-black/3 text-black/30 hover:text-black/60'
                    }`}
                  >
                    {f === 'simple'
                      ? 'Simple (IF)'
                      : f === 'multi'
                        ? 'Multi (AND/OR)'
                        : 'Nested'}
                  </button>
                ))}
              </div>

              {/* Logic — multi only */}
              {format === 'multi' && (
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-medium ${p.textMuted}`}>
                    Logic:
                  </span>
                  {(['AND', 'OR'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLogic(l)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        logic === l
                          ? 'bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]'
                          : `${p.cardBorder} ${p.textMuted}`
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                  <span className={`text-[11px] ${p.textMuted}`}>
                    {logic === 'AND' ? '— all must pass' : '— any one passes'}
                  </span>
                </div>
              )}

              {/* Conditions */}
              {format !== 'nested' ? (
                <div className="space-y-3">
                  <datalist id="v4-ctx-fields">
                    {CTX_FIELDS.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                  {conds.map((c, i) => {
                    const isNoVal = NO_VAL.has(c.op)
                    const isArr = ARR_OPS.has(c.op)
                    const pipeOpen = openPipes.has(i)
                    const needsArg = c.transform && !NO_ARG.has(c.transform)
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${p.cardBorder} space-y-2`}
                        style={{
                          backgroundColor: p.dark
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.015)',
                        }}
                      >
                        {/* Field + |pipe + remove */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono ${p.textMuted} w-6 shrink-0 text-center`}
                          >
                            {format === 'multi'
                              ? i === 0
                                ? 'IF'
                                : logic
                              : 'IF'}
                          </span>
                          <input
                            list="v4-ctx-fields"
                            value={c.field}
                            onChange={(e) =>
                              updateCond(i, { field: e.target.value })
                            }
                            placeholder="tx.amount"
                            className={`flex-1 ${inp} font-mono text-xs`}
                          />
                          <button
                            onClick={() =>
                              setOpenPipes((prev) => {
                                const n = new Set(prev)
                                n.has(i) ? n.delete(i) : n.add(i)
                                return n
                              })
                            }
                            className={`px-2 py-1.5 rounded-lg text-xs font-mono border transition-colors shrink-0 ${
                              pipeOpen || c.transform
                                ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]'
                                : `${p.cardBorder} ${p.textMuted} hover:border-[#00D084]/30`
                            }`}
                          >
                            |pipe
                          </button>
                          {(format === 'multi' || conds.length > 1) && (
                            <button
                              onClick={() => {
                                setConds((prev) =>
                                  prev.filter((_, x) => x !== i),
                                )
                                setOpenPipes(
                                  (prev) =>
                                    new Set(
                                      [...prev]
                                        .filter((x) => x !== i)
                                        .map((x) => (x > i ? x - 1 : x)),
                                    ),
                                )
                              }}
                              className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Transform (collapsible) */}
                        <AnimatePresence>
                          {pipeOpen && (
                            <motion.div
                              key="pipe"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-2 pt-1">
                                <select
                                  value={c.transform}
                                  onChange={(e) =>
                                    updateCond(i, {
                                      transform: e.target.value,
                                      transformArg: '',
                                    })
                                  }
                                  className={`${inp} text-xs font-mono`}
                                >
                                  {TRANSFORMS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                                {needsArg && (
                                  <input
                                    value={c.transformArg}
                                    onChange={(e) =>
                                      updateCond(i, {
                                        transformArg: e.target.value,
                                      })
                                    }
                                    placeholder="N"
                                    className={`w-16 ${inp} text-xs font-mono`}
                                  />
                                )}
                              </div>
                              {c.transform && (
                                <p
                                  className={`text-[10px] font-mono mt-1 ${p.textMuted}`}
                                >
                                  → {buildFieldExpr(c)}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {/* OP + Value */}
                        <div className="flex gap-2">
                          <select
                            value={c.op}
                            onChange={(e) =>
                              updateCond(i, { op: e.target.value, value: '' })
                            }
                            className={`${inp} text-xs font-mono`}
                          >
                            {OPS.map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {!isNoVal && (
                            <input
                              value={c.value}
                              onChange={(e) =>
                                updateCond(i, { value: e.target.value })
                              }
                              placeholder={isArr ? '[9,17] or a,b,c' : '0'}
                              className={`flex-1 ${inp} text-xs font-mono`}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {format === 'multi' && (
                    <button
                      onClick={() => setConds((prev) => [...prev, makeBlank()])}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#00D084] hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add condition
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`p-4 rounded-xl border border-dashed ${p.cardBorder} text-center space-y-1`}
                >
                  <p className={`text-sm ${p.textMuted}`}>
                    Nested rules combine multiple rule groups with AND/OR logic.
                  </p>
                  <p className={`text-[11px] ${p.textMuted}`}>
                    Use Simple or Multi for visual building, then edit the JSON
                    directly.
                  </p>
                </div>
              )}

              {/* Deny Message */}
              <div>
                <label
                  className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                >
                  Deny Message
                </label>
                <input
                  value={denyMsg}
                  onChange={(e) => setDenyMsg(e.target.value)}
                  placeholder="Transaction rejected by policy"
                  className={`${inp} w-full`}
                />
              </div>
            </>
          )}

          {/* Simple mode: single friendly input */}
          {simpleMode && selectedTemplate && (
            <div className="space-y-4">
              <p className={`text-sm font-medium ${p.textMain}`}>
                Set your limit
              </p>
              {(() => {
                const t = TEMPLATES.find((x) => x.label === selectedTemplate)
                const c = conds[0]
                if (!t || !c) return null

                if (t.label === 'Spending Limit') {
                  const usdc = c.value
                    ? (Number(c.value) / 1_000_000).toString()
                    : ''
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Maximum amount (USDC)
                      </label>
                      <input
                        type="number"
                        value={usdc}
                        onChange={(e) => {
                          const val = e.target.value
                          updateCond(0, {
                            value: val
                              ? (Number(val) * 1_000_000).toString()
                              : '',
                          })
                        }}
                        placeholder="1000"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Any payment above this amount will be blocked.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Business Hours') {
                  const [from = 9, to = 17] = JSON.parse(c.value || '[9,17]')
                  return (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label
                          className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                        >
                          From (hour)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={from}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            updateCond(0, { value: `[${v},${to}]` })
                          }}
                          className={`${inp} w-full`}
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                        >
                          To (hour)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={to}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            updateCond(0, { value: `[${from},${v}]` })
                          }}
                          className={`${inp} w-full`}
                        />
                      </div>
                    </div>
                  )
                }

                if (t.label === 'Weekdays Only') {
                  const days = new Set<number>(
                    JSON.parse(c.value || '[1,2,3,4,5]'),
                  )
                  const dayLabels = [
                    { d: 1, label: 'Mon' },
                    { d: 2, label: 'Tue' },
                    { d: 3, label: 'Wed' },
                    { d: 4, label: 'Thu' },
                    { d: 5, label: 'Fri' },
                    { d: 6, label: 'Sat' },
                    { d: 7, label: 'Sun' },
                  ]
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-2`}
                      >
                        Allowed days
                      </label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
                        {dayLabels.map(({ d, label }) => (
                          <button
                            key={d}
                            onClick={() => {
                              const cur = new Set<number>(
                                JSON.parse(c.value || '[]'),
                              )
                              cur.has(d) ? cur.delete(d) : cur.add(d)
                              updateCond(0, {
                                value: `[${[...cur].sort((a, b) => a - b).join(',')}]`,
                              })
                            }}
                            className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                              days.has(d)
                                ? 'bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]'
                                : `${p.cardBorder} ${p.textMuted}`
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                if (t.label === 'KYC Required') {
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Required KYC level
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={3}
                        value={c.value}
                        onChange={(e) =>
                          updateCond(0, { value: e.target.value })
                        }
                        placeholder="1"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        1 = basic, 2 = verified, 3 = institutional
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Low Risk Only') {
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Maximum risk score (0–100)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.value}
                        onChange={(e) =>
                          updateCond(0, { value: e.target.value })
                        }
                        placeholder="50"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Lower is safer. Transactions above this score will be
                        blocked.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Indonesia Only') {
                  return (
                    <div
                      className={`p-4 rounded-xl border ${p.cardBorder}`}
                      style={{
                        backgroundColor: p.dark
                          ? 'rgba(0,208,132,0.04)'
                          : 'rgba(0,208,132,0.04)',
                      }}
                    >
                      <p className={`text-sm ${p.textMain}`}>
                        This rule is set. Only payments from Indonesia will be
                        allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'USD Minimum') {
                  const usd = c.value ? (Number(c.value) / 1e8).toString() : ''
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Minimum USD value
                      </label>
                      <input
                        type="number"
                        value={usd}
                        onChange={(e) => {
                          const val = e.target.value
                          updateCond(0, { value: val ? (Number(val) * 1e8).toString() : '' })
                        }}
                        placeholder="45"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Any payment below this USD value will be blocked (regardless of token).
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Whitelist Sender') {
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Allowed sender address
                      </label>
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => updateCond(0, { value: e.target.value })}
                        placeholder="0x..."
                        className={`${inp} w-full font-mono`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Only payments from this address will be allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Chain Guard') {
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Allowed chain ID
                      </label>
                      <input
                        type="number"
                        value={c.value}
                        onChange={(e) => updateCond(0, { value: e.target.value })}
                        placeholder="31337"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Only payments on this chain will be allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'QR Payments Only') {
                  return (
                    <div
                      className={`p-4 rounded-xl border ${p.cardBorder}`}
                      style={{
                        backgroundColor: p.dark
                          ? 'rgba(0,208,132,0.04)'
                          : 'rgba(0,208,132,0.04)',
                      }}
                    >
                      <p className={`text-sm ${p.textMain}`}>
                        This rule is set. Only QR code payments will be allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Daily Budget') {
                  const limit = conds[0]?.value ?? '50000000'
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Daily spending limit (USDC)
                      </label>
                      <input
                        type="number"
                        value={limit ? (Number(limit) / 1_000_000).toString() : ''}
                        onChange={(e) => {
                          const val = e.target.value
                          updateCond(0, { value: val ? (Number(val) * 1_000_000).toString() : '' })
                        }}
                        placeholder="50"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Payments that would exceed this daily limit will be blocked.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'PayID Owner') {
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Allowed PayID owner
                      </label>
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => updateCond(0, { value: e.target.value })}
                        placeholder="0x..."
                        className={`${inp} w-full font-mono`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Only payments to this PayID owner will be allowed.
                      </p>
                    </div>
                  )
                }

                return null
              })()}
            </div>
          )}

          {/* Plain English Preview */}
          <div
            className={`p-4 rounded-xl border border-dashed ${p.cardBorder}`}
            style={{
              backgroundColor: p.dark
                ? 'rgba(0,208,132,0.04)'
                : 'rgba(0,208,132,0.04)',
            }}
          >
            <p className={`text-[11px] font-medium text-[#00D084] mb-1`}>
              What this rule does:
            </p>
            <p className={`text-sm ${p.textMain}`}>
              {simpleMode && selectedTemplate
                ? (() => {
                    const c = conds[0]
                    if (!c?.field) return 'Pick a template above to get started'
                    if (c.field === 'tx.amount' && c.op === '<=') {
                      const usdc = Number(c.value) / 1_000_000
                      return `Block any payment over ${usdc.toLocaleString()} USDC`
                    }
                    if (
                      c.field === 'env.timestamp' &&
                      c.transform === 'hour' &&
                      c.op === 'between'
                    ) {
                      const [from, to] = JSON.parse(c.value || '[9,17]')
                      return `Only allow payments between ${from}:00 and ${to}:00`
                    }
                    if (
                      c.field === 'env.timestamp' &&
                      c.transform === 'day' &&
                      c.op === 'in'
                    ) {
                      const days: Array<number> = JSON.parse(
                        c.value || '[1,2,3,4,5]',
                      )
                      if (days.length === 5 && days.every((d) => d <= 5))
                        return 'Block payments on weekends (Sat & Sun)'
                      return `Allow payments on: ${days.map((d) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}`
                    }
                    if (c.field === 'oracle.kycLevel' && c.op === '>=')
                      return `Require identity verification (KYC level ${c.value}+)`
                    if (c.field === 'risk.score' && c.op === '<=')
                      return `Block transactions with risk score above ${c.value}`
                    if (c.field === 'oracle.country' && c.op === '==')
                      return `Only allow payments from ${c.value.toUpperCase()}`
                    if (c.field === 'oracle.txValueUsd' && c.op === '>=') {
                      const usd = Number(c.value) / 1e8;
                      return `Block any payment below ${usd.toLocaleString()} USD value`;
                    }
                    if (c.field === 'tx.sender' && c.op === '==')
                      return `Only allow payments sent from ${c.value}`;
                    if (c.field === 'tx.chainId' && c.op === '==')
                      return `Only allow payments on chain ID ${c.value}`;
                    if (c.field === 'intent.type' && c.op === '==')
                      return `Only allow payments initiated via QR code`;
                    if (c.field === 'state.spentToday' && c.op === '<=') {
                      const usdc = Number(c.value) / 1_000_000;
                      return `Block payments if daily spending exceeds ${usdc.toLocaleString()} USDC`;
                    }
                    if (c.field === 'payId.owner' && c.op === '==')
                      return `Only allow payments to PayID owner ${c.value}`;
                    return summary
                  })()
                : summary}
            </p>
          </div>

          {!simpleMode && (
            <>
              {/* JSON + Hash */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowJson((v) => !v)}
                  className={`flex items-center gap-1.5 text-[11px] font-medium ${p.textMuted} hover:${p.textMain} transition-colors`}
                >
                  {showJson ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {showJson ? 'Hide' : 'Show'} generated JSON (upload this to
                  IPFS)
                </button>
                <AnimatePresence>
                  {showJson && (
                    <motion.div
                      key="json"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div
                        className={`relative rounded-xl border ${p.cardBorder} overflow-hidden`}
                        style={{
                          backgroundColor: p.dark
                            ? 'rgba(0,0,0,0.3)'
                            : 'rgba(0,0,0,0.03)',
                        }}
                      >
                        <button
                          onClick={copyJson}
                          className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-[#00D084]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                          )}
                        </button>
                        <pre
                          className={`text-[11px] font-mono p-4 pr-10 overflow-x-auto ${p.textMuted}`}
                        >
                          {ruleJson}
                        </pre>
                      </div>
                      <p
                        className={`text-[10px] font-mono mt-2 ${p.textMuted} truncate`}
                      >
                        Hash: {ruleHash}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* NFT Metadata */}
              <div
                className={`rounded-xl border ${p.cardBorder} overflow-hidden`}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3 border-b"
                  style={{
                    borderColor: p.dark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.06)',
                    background: p.dark
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(0,0,0,0.015)',
                  }}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#0EA5E9]" />
                  <span className={`text-xs font-semibold ${p.textMain}`}>
                    NFT Metadata
                  </span>
                  <span className={`ml-auto text-[10px] ${p.textMuted}`}>
                    Step 1b — before deploying
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        NFT Name
                      </label>
                      <input
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        placeholder="PAY.ID Rule NFT"
                        className={`${inp} w-full text-xs`}
                      />
                    </div>
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Description
                      </label>
                      <input
                        value={nftDesc}
                        onChange={(e) => setNftDesc(e.target.value)}
                        placeholder="PAY.ID programmable payment policy"
                        className={`${inp} w-full text-xs`}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                    >
                      Image
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {imgDataUrl ? (
                      <div
                        className={`relative rounded-xl overflow-hidden border ${p.cardBorder}`}
                      >
                        <img
                          src={imgDataUrl}
                          alt="preview"
                          className="w-full h-32 object-cover"
                        />
                        <button
                          onClick={() => setImgDataUrl(null)}
                          className="absolute top-2 right-2 p-1 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => fileRef.current?.click()}
                          className={`flex-1 py-5 rounded-xl border border-dashed ${p.cardBorder} ${p.textMuted} text-xs font-medium hover:border-[#00D084]/40 hover:text-[#00D084] transition-colors flex flex-col items-center justify-center gap-1.5`}
                        >
                          <Upload className="w-4 h-4" />
                          Drop or click to upload
                        </button>
                        <button
                          onClick={() =>
                            setImgDataUrl(genImage(ruleName, ruleHash))
                          }
                          className={`flex-1 py-5 rounded-xl border border-dashed ${p.cardBorder} ${p.textMuted} text-xs font-medium hover:border-[#00D084]/40 hover:text-[#00D084] transition-colors flex flex-col items-center justify-center gap-1.5`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Auto-generate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Deploy */}
          <div className="space-y-2">
            {!simpleMode && (
              <>
                {is0G ? (
                  <div className="rounded-xl px-3 py-2 text-[11px] border border-[#00D084]/30 bg-[#00D084]/5 text-[#00D084] flex items-center gap-2">
                    <span className="font-bold">0G</span>
                    <span>
                      Connected to 0G Newton Testnet — metadata will be stored
                      on <strong>0G Storage</strong> instead of IPFS.
                    </span>
                  </div>
                ) : (
                  !getPinataJWT() && (
                    <div className="rounded-xl px-3 py-2 text-[11px] border border-amber-500/30 bg-amber-500/8 text-amber-400">
                      ⚠ Add <code className="font-mono">VITE_PINATA_JWT</code>{' '}
                      to your <code className="font-mono">.env</code> for auto
                      IPFS upload.
                    </div>
                  )
                )}
              </>
            )}
            <PremiumButton
              onClick={handleDeploy}
              disabled={
                deployStage === 'uploading' ||
                deployStage === 'creating' ||
                !isConnected
              }
              isLoading={deployStage === 'uploading' || deployStage === 'creating'}
              icon={<Upload className="w-4 h-4" />}
              className="w-full"
            >
              {deployStage === 'uploading'
                ? 'Preparing rule…'
                : deployStage === 'creating'
                  ? 'Confirm in wallet…'
                  : simpleMode
                    ? 'Deploy Rule'
                    : is0G
                      ? 'Upload to 0G & Deploy NFT'
                      : 'Upload to IPFS & Deploy NFT'}
            </PremiumButton>
            {deployMsg && (
              <p
                className={`text-xs text-center ${
                  deployStage === 'done'
                    ? 'text-[#00D084]'
                    : deployStage === 'error'
                      ? 'text-[#EF4444]'
                      : p.textMuted
                }`}
              >
                {deployMsg}
              </p>
            )}
            {deployStage === 'done' && (
              <button
                onClick={() => {
                  setDeployStage('idle')
                  setDeployMsg('')
                  setSelectedTemplate(null)
                  setConds([makeBlank()])
                  setActiveStep(1)
                }}
                className={`w-full py-2 rounded-xl text-xs ${p.textMuted} border ${p.cardBorder} hover:bg-black/5 transition-colors`}
              >
                Build Another Rule
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ───── MY RULES ───── */}
      {activeStep === 2 && (
      <div
        className={`${card} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            background: p.dark
              ? 'rgba(14,165,233,0.06)'
              : 'rgba(14,165,233,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#0EA5E9] text-white font-bold text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className={`text-sm font-semibold ${p.textMain}`}>My Rules</p>
              <p className={`text-[11px] ${p.textMuted}`}>
                {myRules.length} rule{myRules.length !== 1 ? 's' : ''} created
              </p>
            </div>
          </div>
          <Shield className="w-4 h-4 text-[#0EA5E9]" />
        </div>

        <div className="p-5">
          {myRules.length === 0 ? (
            <div className="py-10 text-center">
              <Shield
                className={`w-10 h-10 mx-auto mb-3 ${p.textMuted} opacity-30`}
              />
              <p className={`text-sm font-medium ${p.textMuted}`}>
                No rules yet
              </p>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                Build and deploy your first rule above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myRules.map((rule) => (
                <RuleCardItem key={rule.ruleId.toString()} rule={rule} p={p} contracts={contracts} refetchMyRules={refetchMyRules} refetchSub={refetchSub} />
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ───── STEP 3: ACTIVATE ───── */}
      {activeStep === 3 && (
      <div
        className={`${card} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{
            borderColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            background: p.dark
              ? 'rgba(245,158,11,0.06)'
              : 'rgba(245,158,11,0.04)',
          }}
        >
          <span className="w-7 h-7 rounded-full bg-[#F59E0B] text-black font-bold text-sm flex items-center justify-center shrink-0">
            3
          </span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${p.textMain}`}>
              Activate Rule
            </p>
            <p className={`text-[11px] ${p.textMuted}`}>
              Mint an on-chain NFT license — required for policy enforcement
            </p>
          </div>
          <Zap className="w-4 h-4 text-[#F59E0B]" />
        </div>

        <div className="p-5 space-y-4">
          {(sub?.logicalRuleCount ?? 0) >= (sub?.maxSlots ?? 1) ? (
            <div className="rounded-xl p-4 border border-amber-500/30 bg-amber-500/8 space-y-3">
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">
                    Slot limit reached
                  </p>
                  <p className="text-[11px] text-amber-400/70 mt-0.5">
                    You've used all your rule slots. Subscribe to unlock up to 3 slots.
                  </p>
                </div>
              </div>
              <button
                onClick={() => subscribe((subPrice as bigint | undefined) ?? parseEther('0.001'))}
                disabled={subPending || subConfirming}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {subPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirm in
                    wallet…
                  </>
                ) : subConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for
                    block…
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" /> Subscribe — {formatPriceWithUSD((subPrice as bigint | undefined) ?? parseEther('0.001'), nativeSymbol, ethUsdPrice)} / 30
                    days
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRules.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myRules.map((r) => {
                    const isActivated = r.tokenId > 0n
                    const isSelected = activateId === r.ruleId.toString()
                    return (
                      <motion.button
                        key={r.ruleId.toString()}
                        onClick={() => setActivateId(r.ruleId.toString())}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`
                          relative group p-4 rounded-2xl border-2 transition-all text-left overflow-hidden
                          ${isSelected
                            ? 'border-[#F59E0B] shadow-lg shadow-[#F59E0B]/20'
                            : isActivated
                              ? 'border-[#00D084]/40 bg-[#00D084]/5 opacity-70'
                              : `${p.cardBorder} hover:border-[#F59E0B]/40 hover:shadow-lg hover:shadow-[#F59E0B]/10`}
                        `}
                        style={{ 
                          backgroundColor: isSelected 
                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)'
                            : p.cardBg 
                        }}
                      >
                        {/* Background gradient overlay */}
                        <div className={`
                          absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity
                          ${isSelected ? 'opacity-100' : ''}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, transparent 100%)'
                              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)'
                          }}
                        `} />

                        {/* Content */}
                        <div className="relative z-10">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center
                                ${isSelected 
                                  ? 'bg-[#F59E0B] text-black' 
                                  : isActivated 
                                    ? 'bg-[#00D084] text-black' 
                                    : `${p.cardBorder} bg-[#F59E0B]/10`}
                              `}>
                                {isActivated ? (
                                  <Check className="w-4 h-4" />
                                ) : isSelected ? (
                                  <Zap className="w-4 h-4" />
                                ) : (
                                  <Shield className="w-4 h-4 text-[#F59E0B]" />
                                )}
                              </div>
                              <div>
                                <span className={`text-sm font-bold ${isSelected ? 'text-[#F59E0B]' : isActivated ? 'text-[#00D084]' : p.textMain}`}>
                                  Rule #{r.ruleId.toString()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Deactivate button for active rules */}
                            {isActivated && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Deactivate this rule to free up a slot? This action cannot be undone.")) {
                                    writeContract({
                                      address: contracts.ruleItemERC721,
                                      abi: ruleItemERC721Abi,
                                      functionName: 'deactivateRule',
                                      args: [r.ruleId],
                                    });
                                  }
                                }}
                                className={`p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors tooltip-trigger`}
                                title="Deactivate to free slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Status badge */}
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium">
                            {isActivated ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse" />
                                <span className="text-[#00D084]">Active</span>
                              </>
                            ) : isSelected ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                <span className="text-[#F59E0B]">Selected</span>
                              </>
                            ) : (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                                <span className={p.textMuted}>Inactive</span>
                              </>
                            )}
                          </div>

                          {/* Rule hash preview */}
                          <div className={`mt-3 pt-3 border-t ${p.cardBorder}`}>
                            <div className={`text-[9px] font-mono ${p.textMuted} truncate`}>
                              {r.ruleHash.slice(0, 16)}...
                            </div>
                          </div>
                        </div>

                        {/* Glow effect */}
                        {isSelected && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl"
                            style={{
                              boxShadow: '0 0 20px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(245, 158, 11, 0.1)'
                            }}
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <input
                  type="number"
                  placeholder="Rule ID"
                  value={activateId}
                  onChange={(e) => setActivateId(e.target.value)}
                  className={`${inp} w-full`}
                />
              )}
              <button
                onClick={() => {
                  if (!activateId) return
                  setActivateStatus('idle')
                  setActivateMsg('')
                  activateRule(BigInt(activateId))
                }}
                disabled={activating || !activateId}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-semibold text-sm hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/20 transition-all"
              >
                {activatingPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirm in
                    wallet…
                  </>
                ) : activatingConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for
                    block…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Activate Rule NFT
                  </>
                )}
              </button>
              {activateMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs text-center font-medium ${activateStatus === 'done' ? 'text-[#00D084]' : 'text-[#EF4444]'}`}
                >
                  {activateMsg}
                </motion.div>
              )}
            </div>
          )}
          {activeCombined?.hash && (
            <div className="rounded-xl px-3 py-2.5 border border-[#00D084]/20 bg-[#00D084]/5">
              <p className={`text-[10px] font-medium ${p.textMuted} mb-0.5`}>
                Enforced policy hash
              </p>
              <p className="text-[11px] font-mono text-[#00D084] truncate">
                {activeCombined.hash}
              </p>
            </div>
          )}
        </div>
      </div>
      )}
    </motion.div>
  )
}
