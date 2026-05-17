import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Link, useLocation } from '@tanstack/react-router'
import {
  CheckCircle2,
  Clock,
  Cpu,
  Crown,
  DollarSign,
  FlaskConical,
  Info,
  Loader2,
  Play,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { GameConsole } from '../components/GameConsole'
import { CartridgeTray } from '../components/CartridgeTray'
import { RuleCartridge } from '../components/RuleCartridge'
import { formatPriceWithUSD } from '@/features/rules/utils/pricing'
import { evalRule, type DemoCtx, type MiniRule, type MiniCond } from '@/features/rules/utils/miniEvaluator'
import { useRulesConsole } from '../hooks/useRulesConsole'

export default function RulesConsolePage() {
  const location = useLocation()
  const currentPath = location.pathname
  const {
    p, chainId, nativeSymbol, address, isConnected, myRules, activeCombined, sub,
    effectiveAgentRule, preferredAgent, preferredAgentInfo,
    isRegistering, isConfirming, registerStage,
    subscribe, subPending, subConfirming, price,
    ethUsdPrice, usdcPriceHook, usdtPriceHook, daiPriceHook, wbtcPriceHook, linkPriceHook, uniPriceHook,
    highlightedSlot, direction, setDirection, version, setVersion,
    txLog,
    demoAmount, setDemoAmount, demoReceiver, setDemoReceiver, demoTxValueUsd, setDemoTxValueUsd,
    demoKycLevel, setDemoKycLevel, demoCountry, setDemoCountry, demoRiskScore, setDemoRiskScore,
    demoDailyLimit, setDemoDailyLimit, demoSpentToday, setDemoSpentToday,
    demoResult, setDemoResult, demoReason, setDemoReason, showDemo, setShowDemo,
    ruleDetails,
    slots, trayCartridges, selectedSlots, canRegister,
    handleSlotClick, handleCartridgeEject, handleCartridgeClick,
    handleDragStart, handleDragOver, handleDragEnd, handleRegister,
    activeCartridge, activeCount,
  } = useRulesConsole()

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const card = `rounded-2xl border ${p.cardBorder}`
  const inp = `px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40`
  const stepBadge = (n: number, label: string, done: boolean) => (
    <div key={n} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${done ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]' : `${p.cardBorder} ${p.textMuted}`}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-[#00D084] text-[#0B0F1A]' : 'bg-current/20'}`}>{n}</span>
      {label}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl space-y-6"
    >
      {/* ── Sub Navigation Tabs ── */}
      <div className={`flex items-center gap-2 border-b ${p.cardBorder} pb-3`}>
        <Link
          to="/v4/app/rules"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            currentPath === '/v4/app/rules'
              ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 shadow-[0_0_12px_rgba(0,208,132,0.08)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent cursor-pointer'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Policy Console & Enforcer
        </Link>
        <Link
          to="/v4/app/rules/builder"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            currentPath === '/v4/app/rules/builder'
              ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 shadow-[0_0_12px_rgba(0,208,132,0.08)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent cursor-pointer'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Custom Rule Builder
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1
              className={`text-2xl font-bold ${p.textMain} flex items-center gap-2`}
            >
              <Cpu className="w-6 h-6 text-[#8B5CF6]" />
              Rule Console
            </h1>
            <div className="flex items-center justify-between grow w-full">
              <p className={`text-sm ${p.textMuted} mt-0.5`}>
                Drag &amp; drop rules into slots and register your live payment
                policy
              </p>
             
            </div>
          </div>
          {isConnected && (
            <div className='flex flex-col gap-2 items-center justify-center'>
            <div
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border ${p.cardBorder} text-xs ${p.textMuted}`}
              style={{ backgroundColor: p.cardBg }}
            >
              <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                {sub?.isActive
                  ? `Pro · ${myRules.length}/${sub.maxSlots}`
                  : `Free · ${myRules.length}/1`}
              </span>
              
            </div>
             <Link
                to="/v4/app/rules/builder"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-white text-xs font-semibold hover:bg-[#8B5CF6]/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Rule
              </Link>
              </div>
          )}
        </div>

        {/* Step badges */}
        {isConnected && (
          <div className="flex flex-wrap gap-2">
            {stepBadge(1, 'Build Rule', true)}
            {stepBadge(2, 'Deploy NFT', myRules.length > 0)}
            {stepBadge(
              3,
              'Activate',
              myRules.some((r) => r.tokenId > 0n),
            )}
            {stepBadge(4, 'Go Live', !!activeCombined?.hash)}
          </div>
        )}

        {/* Stats row */}
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
                className={`${card} p-4`}
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
      </div>

      {/* ── AI Agent Policy Banner ── */}
      {isConnected && effectiveAgentRule?.ruleSetHash && effectiveAgentRule.ruleSetHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
        <div className={`${card} p-4 flex items-center gap-3`} style={{ backgroundColor: p.cardBg, borderColor: '#00D08440' }}>
          <Cpu className="w-5 h-5 text-[#00D084]" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${p.textMain} font-medium`}>
              Using AI Agent Policy: @{preferredAgentInfo?.handle ?? (preferredAgent ? preferredAgent.slice(0, 6) + '...' + preferredAgent.slice(-4) : '')}
            </p>
            <p className={`text-xs ${p.textMuted}`}>
              Rule: {effectiveAgentRule.ruleSetHash.slice(0, 6) + '...' + effectiveAgentRule.ruleSetHash.slice(-4)} · Subscribed to agent combined rule
            </p>
          </div>
          <Link
            to="/v4/app/ai-agents"
            className="shrink-0 text-xs font-medium text-[#00D084] hover:underline"
          >
            Manage
          </Link>
        </div>
      )}

      {/* ── Connect wallet prompt ── */}
      {!isConnected && (
        <div
          className={`${card} p-6 flex items-center gap-3`}
          style={{ backgroundColor: p.cardBg }}
        >
          <Info className={`w-5 h-5 shrink-0 ${p.textMuted}`} />
          <p className={`text-sm ${p.textMuted}`}>
            Connect your wallet to load rules and manage your policy.
          </p>
        </div>
      )}

      {/* ── MAIN: Two-column layout ── */}
      {isConnected && (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            {/* LEFT: Console + Tray */}
            <div className="flex flex-col items-center gap-2">
              {/* v4 card shell around the console */}
              <div
                className={`${card} p-4 w-full flex flex-col items-center gap-3`}
                style={{ backgroundColor: p.cardBg }}
              >
                <p
                  className={`text-[10px] font-mono uppercase tracking-widest ${p.textMuted} self-start`}
                >
                  Policy Engine · 3-Slot
                </p>
                <GameConsole
                  slots={slots}
                  highlightedSlot={highlightedSlot}
                  txLog={txLog}
                  onSlotClick={handleSlotClick}
                  onCartridgeEject={handleCartridgeEject}
                />
                <p
                  className={`text-[9px] font-mono uppercase tracking-wider ${p.textMuted} opacity-50`}
                >
                  drag to slot · drop on tray to eject · tap to quick-insert
                </p>
              </div>

              {/* Tray */}
              <div className="w-full">
                <CartridgeTray
                  cartridges={trayCartridges}
                  onCartridgeClick={handleCartridgeClick}
                  dark={p.dark}
                />
              </div>

              {/* Token Price Info — Multi-Token Pricing */}
              <div
                className={`${card} p-4 w-full space-y-3`}
                style={{ backgroundColor: p.cardBg }}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#00D084]" />
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${p.textMuted}`}
                  >
                    Token Prices (USD)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className="flex justify-between items-center p-2 rounded"
                    style={{ background: p.bgElevated }}
                  >
                    <span className={p.textMuted}>USDC</span>
                    <span className={p.textMain}>
                      {usdcPriceHook.priceInUsd
                        ? usdcPriceHook.formatUsd(usdcPriceHook.priceInUsd)
                        : 'Loading...'}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center p-2 rounded"
                    style={{ background: p.bgElevated }}
                  >
                    <span className={p.textMuted}>USDT</span>
                    <span className={p.textMain}>
                      {usdtPriceHook.priceInUsd
                        ? usdtPriceHook.formatUsd(usdtPriceHook.priceInUsd)
                        : 'Loading...'}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center p-2 rounded"
                    style={{ background: p.bgElevated }}
                  >
                    <span className={p.textMuted}>DAI</span>
                    <span className={p.textMain}>
                      {daiPriceHook.priceInUsd
                        ? daiPriceHook.formatUsd(daiPriceHook.priceInUsd)
                        : 'Loading...'}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center p-2 rounded"
                    style={{ background: p.bgElevated }}
                  >
                    <span className={p.textMuted}>WBTC</span>
                    <span className={p.textMain}>
                      {wbtcPriceHook.priceInUsd
                        ? wbtcPriceHook.formatUsd(wbtcPriceHook.priceInUsd)
                        : 'Loading...'}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center p-2 rounded"
                    style={{ background: p.bgElevated }}
                  >
                    <span className={p.textMuted}>LINK</span>
                    <span className={p.textMain}>
                      {linkPriceHook.priceInUsd
                        ? linkPriceHook.formatUsd(linkPriceHook.priceInUsd)
                        : 'Loading...'}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center p-2 rounded"
                    style={{ background: p.bgElevated }}
                  >
                    <span className={p.textMuted}>UNI</span>
                    <span className={p.textMain}>
                      {uniPriceHook.priceInUsd
                        ? uniPriceHook.formatUsd(uniPriceHook.priceInUsd)
                        : 'Loading...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Slots — Subscription Manager */}
              <div
                className={`${card} p-4 w-full space-y-3`}
                style={{ backgroundColor: p.cardBg }}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#F59E0B]" />
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${p.textMuted}`}
                  >
                    Additional Slots
                  </p>
                  <span
                    className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      sub?.isActive
                        ? 'bg-[#00D084]/10 text-[#00D084]'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {sub?.isActive ? 'Pro' : 'Free'}
                  </span>
                </div>

                {/* Slot usage */}
                <div className="flex items-center gap-3">
                  {[...Array(sub?.maxSlots ?? 1)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        i < myRules.length ? 'bg-[#00D084]' : 'bg-[#00D084]/20'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] ${p.textMuted}`}>
                    {myRules.length} of {sub?.maxSlots ?? 1} slot
                    {sub?.maxSlots !== 1 ? 's' : ''} used
                  </p>
                  {!sub?.isActive && (
                    <p className="text-[10px] text-amber-400">
                      Free tier = 1 slot
                    </p>
                  )}
                </div>

                {/* Upgrade / Extend */}
                {!sub?.isActive ? (
                  <button
                    onClick={() => subscribe(price)}
                    disabled={subPending || subConfirming}
                    className="w-full py-2.5 rounded-xl bg-[#F59E0B] text-black text-xs font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {subPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirm
                        in wallet…
                      </>
                    ) : subConfirming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                        Waiting…
                      </>
                    ) : (
                      <>
                        <Crown className="w-3.5 h-3.5" /> Unlock 3 Slots —{' '}
                        {formatPriceWithUSD(price, nativeSymbol, ethUsdPrice)} /
                        30d
                      </>
                    )}
                  </button>
                ) : (
                  <div
                    className={`p-3 rounded-xl border ${p.cardBorder} space-y-1`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-[11px] ${p.textMuted}`}>
                        Subscription active
                      </p>
                      <span className="text-[10px] text-[#00D084] font-medium">
                        {sub.maxSlots} slots
                      </span>
                    </div>
                    {sub.expiry ? (
                      <p className={`text-[10px] ${p.textMuted}`}>
                        Expires{' '}
                        {new Date(
                          Number(sub.expiry) * 1000,
                        ).toLocaleDateString()}
                      </p>
                    ) : null}
                    <button
                      onClick={() => subscribe(price)}
                      disabled={subPending || subConfirming}
                      className="w-full mt-1 py-2 rounded-lg border border-[#00D084]/30 text-[#00D084] text-[11px] font-semibold hover:bg-[#00D084]/5 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {subPending || subConfirming ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Renew Subscription
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Policy info + Register panel */}
            <div className="space-y-4">
              {/* Active policy detail */}
              {activeCombined?.hash ? (
                <div
                  className={`${card} overflow-hidden border-[#00D084]/30`}
                  style={{ backgroundColor: 'rgba(0,208,132,0.03)' }}
                >
                  <div className="px-4 py-3 border-b border-[#00D084]/15">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
                      <span className="text-sm font-semibold text-[#00D084]">
                        Active Policy
                      </span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/15 text-[#00D084] font-semibold">
                        ● Live
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Policy hash */}
                    <div>
                      <p
                        className={`text-[10px] font-medium ${p.textMuted} mb-0.5`}
                      >
                        Policy hash
                      </p>
                      <p className="text-[11px] font-mono text-[#00D084] truncate">
                        {activeCombined.hash}
                      </p>
                    </div>
                    {/* Direction */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${p.textMuted}`}>
                        Direction:
                      </span>
                      <span className="text-[11px] font-medium text-[#00D084]">
                        {activeCombined.direction === 0
                          ? 'Inbound'
                          : activeCombined.direction === 1
                            ? 'Outbound'
                            : 'Both'}
                      </span>
                    </div>
                    {/* Rules list */}
                    <div className="space-y-1.5">
                      <p className={`text-[10px] font-medium ${p.textMuted}`}>
                        {activeCombined.ruleRefs.length} rule
                        {activeCombined.ruleRefs.length !== 1 ? 's' : ''}{' '}
                        enforced:
                      </p>
                      {activeCombined.ruleRefs.map((ref, idx) => {
                        const rule = myRules.find(
                          (r) => r.tokenId === ref.tokenId,
                        )
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${p.cardBorder}`}
                            style={{
                              backgroundColor: p.dark
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.02)',
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-[#00D084]/10 text-[#00D084] flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              {rule ? (
                                <>
                                  <p
                                    className={`text-[11px] font-medium ${p.textMain}`}
                                  >
                                    Rule #{rule.ruleId.toString()}
                                  </p>
                                  <p className="text-[10px] font-mono text-[#00D084]/70 truncate">
                                    {rule.ruleHash.slice(0, 20)}…
                                  </p>
                                </>
                              ) : (
                                <p
                                  className={`text-[11px] font-mono ${p.textMuted}`}
                                >
                                  Token #{ref.tokenId.toString()}
                                </p>
                              )}
                            </div>
                            {rule?.active && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className={`text-[10px] ${p.textMuted}`}>
                      v{activeCombined.version.toString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={`${card} p-4`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className={`text-sm font-semibold ${p.textMain}`}>
                      No Active Policy
                    </span>
                  </div>
                  <p className={`text-[11px] ${p.textMuted} mt-1`}>
                    Load rules into the console and register to go live.
                  </p>
                </div>
              )}

              {/* Loaded slots summary */}
              <div
                className={`${card} p-4 space-y-3`}
                style={{ backgroundColor: p.cardBg }}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wide ${p.textMuted}`}
                >
                  Loaded Slots
                  {selectedSlots.length > 0 && (
                    <span className="ml-1 text-[#8B5CF6]">
                      ({selectedSlots.length}/3)
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors ${
                        slot.cartridge
                          ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/5'
                          : `${p.cardBorder}`
                      }`}
                    >
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider w-10 shrink-0 ${
                          slot.cartridge ? 'text-[#8B5CF6]' : p.textMuted
                        }`}
                      >
                        {slot.label}
                      </span>
                      {slot.cartridge ? (
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[12px] font-medium ${p.textMain} truncate`}
                          >
                            {slot.cartridge.name}
                          </p>
                          <p
                            className={`text-[10px] font-mono ${p.textMuted} truncate`}
                          >
                            {slot.cartridge.ruleHash?.slice(0, 20)}…
                          </p>
                          {(() => {
                            const d = ruleDetails[slot.cartridge.id]
                            console.log(
                              `[RulesConsole] render slot ${slot.label}, cartridge.id=${slot.cartridge.id}, detail=`,
                              d,
                              'ruleDetails keys=',
                              Object.keys(ruleDetails),
                            )
                            if (!d) return null
                            const simple = d.if as
                              | { field?: string; op?: string; value?: unknown }
                              | undefined
                            const cond = simple?.field
                              ? `${simple.field} ${simple.op} ${JSON.stringify(simple.value)}`
                              : d.conditions && d.conditions.length > 0
                                ? d.conditions
                                    .map(
                                      (c: MiniCond) =>
                                        `${c.field} ${c.op} ${JSON.stringify(c.value)}`,
                                    )
                                    .join(` ${d.logic || 'AND'} `)
                                : d.message || null
                            console.log(
                              `[RulesConsole] cond for ${slot.label}:`,
                              cond,
                            )
                            return cond ? (
                              <p className="text-[10px] font-mono text-[#8B5CF6] truncate mt-0.5">
                                {cond}
                              </p>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        <p className={`text-[11px] ${p.textMuted} italic`}>
                          empty
                        </p>
                      )}
                      {slot.cartridge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium shrink-0">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Register panel — shown only when slots have cartridges */}
              {selectedSlots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${card} overflow-hidden`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <div
                    className="flex items-center gap-3 px-5 py-4 border-b"
                    style={{
                      borderColor: p.dark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.06)',
                      background: p.dark
                        ? 'rgba(139,92,246,0.06)'
                        : 'rgba(139,92,246,0.04)',
                    }}
                  >
                    <span className="w-7 h-7 rounded-full bg-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${p.textMain}`}>
                        Register Policy
                      </p>
                      <p className={`text-[11px] ${p.textMuted}`}>
                        {selectedSlots.length} rule(s) selected
                      </p>
                    </div>
                    <Zap className="w-4 h-4 text-[#8B5CF6]" />
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Direction + Version */}
                    <div className="flex gap-2">
                      <select
                        value={direction}
                        onChange={(e) =>
                          setDirection(
                            e.target.value as 'none' | 'inbound' | 'outbound',
                          )
                        }
                        className={`flex-1 ${inp}`}
                      >
                        <option value="none">Both directions</option>
                        <option value="inbound">Inbound only</option>
                        <option value="outbound">Outbound only</option>
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] ${p.textMuted}`}>v</span>
                        <input
                          type="number"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          min={1}
                          className={`w-14 ${inp} text-center`}
                        />
                      </div>
                    </div>

                    {/* ── Demo / Test Rules ── */}
                    <div
                      className={`rounded-xl border ${p.cardBorder} overflow-hidden`}
                    >
                      <button
                        onClick={() => setShowDemo((v) => !v)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${p.dark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-[#8B5CF6]" />
                          <span
                            className={`text-xs font-semibold ${p.textMain}`}
                          >
                            Test Rules Before Registering
                          </span>
                        </div>
                        <span className={`text-[10px] ${p.textMuted}`}>
                          {showDemo ? 'Hide' : 'Show'}
                        </span>
                      </button>

                      {showDemo && (
                        <div
                          className="px-4 pb-4 space-y-3 border-t"
                          style={{
                            borderColor: p.dark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.06)',
                          }}
                        >
                          <p className={`text-[11px] ${p.textMuted} pt-3`}>
                            Simulate a transaction to preview how your selected
                            rules would evaluate.
                          </p>

                          {/* Selected rules summary */}
                          <div className="space-y-1.5">
                            {selectedSlots.map((s) => (
                              <div
                                key={s.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] border ${p.cardBorder}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
                                <span className={`font-medium ${p.textMain}`}>
                                  {s.cartridge!.name}
                                </span>
                                <span className={`${p.textMuted} ml-auto`}>
                                  {s.cartridge!.summary}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Test inputs */}
                          <div className="grid grid-cols-3 gap-2">
                            {/* tx namespace */}
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>tx.amount</label>
                              <input type="text" value={demoAmount} onChange={(e) => setDemoAmount(e.target.value)} className={`w-full ${inp}`} placeholder="100" />
                            </div>
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>tx.receiver</label>
                              <input type="text" value={demoReceiver} onChange={(e) => setDemoReceiver(e.target.value)} className={`w-full ${inp}`} placeholder="0x..." />
                            </div>
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>tx.chainId</label>
                              <input type="text" value={String(chainId)} disabled className={`w-full ${inp} opacity-60`} />
                            </div>

                            {/* oracle namespace */}
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>oracle.txValueUsd</label>
                              <input type="text" value={demoTxValueUsd} onChange={(e) => setDemoTxValueUsd(e.target.value)} className={`w-full ${inp}`} placeholder="4500000000" />
                            </div>
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>oracle.kycLevel</label>
                              <input type="text" value={demoKycLevel} onChange={(e) => setDemoKycLevel(e.target.value)} className={`w-full ${inp}`} placeholder="1" />
                            </div>
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>oracle.country</label>
                              <input type="text" value={demoCountry} onChange={(e) => setDemoCountry(e.target.value)} className={`w-full ${inp}`} placeholder="id" />
                            </div>

                            {/* risk + state namespace */}
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>risk.score</label>
                              <input type="text" value={demoRiskScore} onChange={(e) => setDemoRiskScore(e.target.value)} className={`w-full ${inp}`} placeholder="30" />
                            </div>
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>state.dailyLimit</label>
                              <input type="text" value={demoDailyLimit} onChange={(e) => setDemoDailyLimit(e.target.value)} className={`w-full ${inp}`} placeholder="50000000" />
                            </div>
                            <div>
                              <label className={`block text-[10px] font-medium ${p.textMuted} mb-1`}>state.spentToday</label>
                              <input type="text" value={demoSpentToday} onChange={(e) => setDemoSpentToday(e.target.value)} className={`w-full ${inp}`} placeholder="0" />
                            </div>
                          </div>

                          {/* Run test button */}
                          <button
                            onClick={() => {
                              setDemoResult('running')
                              setTimeout(() => {
                                const amt = parseFloat(demoAmount) || 0
                                const txValueUsd = parseFloat(demoTxValueUsd) || 0
                                const kycLevel = demoKycLevel
                                const country = demoCountry
                                const riskScore = parseFloat(demoRiskScore) || 0
                                const dailyLimit = parseFloat(demoDailyLimit) || 0
                                const spentToday = parseFloat(demoSpentToday) || 0
                                const nowSec = Math.floor(Date.now() / 1000)
                                const ctx: DemoCtx = {
                                  tx: {
                                    sender: address ?? '0x0000000000000000000000000000000000000000',
                                    receiver: demoReceiver,
                                    asset: '0x0000000000000000000000000000000000000000',
                                    amount: amt,
                                    chainId,
                                  },
                                  payId: { id: 'demo@pay.id', owner: demoReceiver },
                                  intent: { type: 'DIRECT', expiresAt: nowSec + 300, nonce: 'demo-nonce', issuer: 'demo' },
                                  env: { timestamp: nowSec },
                                  oracle: { txValueUsd, kycLevel, country },
                                  risk: { score: riskScore },
                                  state: { spentToday, dailyLimit, period: new Date().toISOString().slice(0, 10) },
                                }
                                let rejected = false
                                let rejectReason = ''
                                for (const s of selectedSlots) {
                                  const d = ruleDetails[s.cartridge!.id] as
                                    | MiniRule
                                    | undefined
                                  if (!d) continue
                                  const { pass, reason } = evalRule(d, ctx)
                                  if (!pass) {
                                    rejected = true
                                    rejectReason = reason
                                    break
                                  }
                                }
                                if (rejected) {
                                  setDemoResult('REJECT')
                                  setDemoReason(rejectReason)
                                } else {
                                  setDemoResult('ALLOW')
                                  setDemoReason(
                                    'All selected rules passed (simulated)',
                                  )
                                }
                              }, 300)
                            }}
                            disabled={demoResult === 'running'}
                            className="w-full py-2 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#8B5CF6] text-xs font-semibold hover:bg-[#8B5CF6]/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {demoResult === 'running' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                                Evaluating…
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" /> Run Test
                              </>
                            )}
                          </button>

                          {/* Result */}
                          {demoResult === 'ALLOW' && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00D084]/10 border border-[#00D084]/30">
                              <ShieldCheck className="w-4 h-4 text-[#00D084] shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-[#00D084]">
                                  ALLOW
                                </p>
                                <p className="text-[10px] text-[#00D084]/80">
                                  {demoReason}
                                </p>
                              </div>
                            </div>
                          )}
                          {demoResult === 'REJECT' && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">
                              <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-[#EF4444]">
                                  REJECT
                                </p>
                                <p className="text-[10px] text-[#EF4444]/80">
                                  {demoReason}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status message */}
                    {registerStage !== 'idle' && (
                      <p
                        className={`text-xs text-center font-medium ${
                          registerStage === 'done'
                            ? 'text-[#00D084]'
                            : registerStage === 'error'
                              ? 'text-[#EF4444]'
                              : p.textMuted
                        }`}
                      >
                        {registerStage === 'registering' &&
                          'Registering on-chain…'}
                        {registerStage === 'done' && '✓ Policy registered!'}
                        {registerStage === 'error' && '✗ Registration failed'}
                      </p>
                    )}

                    <button
                      onClick={handleRegister}
                      disabled={!canRegister}
                      className="w-full py-3 rounded-xl bg-[#8B5CF6] text-white font-semibold text-sm hover:bg-[#8B5CF6]/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isRegistering || isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />{' '}
                          Registering…
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" /> Register Combined Policy
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* My Rules list */}
              {myRules.length > 0 && (
                <div
                  className={`${card} p-4 space-y-3`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wide ${p.textMuted}`}
                  >
                    My Rules ({myRules.length})
                  </p>
                  <div className="space-y-2">
                    {myRules.map((r) => {
                      const d = ruleDetails[`rule_${r.ruleId.toString()}`];
                      let cond: string | null = null;
                      if (d) {
                        const simple = d.if as { field?: string; op?: string; value?: unknown } | undefined;
                        cond = simple?.field
                          ? `${simple.field} ${simple.op} ${JSON.stringify(simple.value)}`
                          : d.conditions && d.conditions.length > 0
                            ? d.conditions
                                .map((c: MiniCond) => `${c.field} ${c.op} ${JSON.stringify(c.value)}`)
                                .join(` ${d.logic || 'AND'} `)
                            : d.message || null;
                      }

                      return (
                        <div
                          key={r.ruleId.toString()}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${p.cardBorder}`}
                          style={{ backgroundColor: p.cardBg }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-medium ${p.textMain}`}>
                              Rule #{r.ruleId.toString()}
                            </p>
                            <p className={`text-[10px] font-mono ${p.textMuted} truncate`}>
                              {r.ruleHash.slice(0, 28)}…
                            </p>
                            {cond && (
                              <p className="text-[10px] font-mono text-[#8B5CF6] truncate mt-0.5">
                                {cond}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              r.tokenId > 0n
                                ? 'bg-[#00D084]/10 text-[#00D084]'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {r.tokenId > 0n ? '✓ Active' : 'Not activated'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DragOverlay */}
          <DragOverlay dropAnimation={null}>
            {activeCartridge ? (
              <div
                style={{
                  transform: 'scale(1.08)',
                  filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.55))',
                }}
              >
                <RuleCartridge
                  id={activeCartridge.id}
                  type={activeCartridge.type}
                  name={activeCartridge.name}
                  summary={activeCartridge.summary}
                  image={activeCartridge.image}
                  isActive
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </motion.div>
  )
}
