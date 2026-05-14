import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  Fingerprint,
  Globe,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { useActiveCombinedRule, useMyRules } from 'payid-react'
import { useV4Palette } from './theme'
import PolicyCard from './PolicyCard'
import type { PolicyCardData } from './PolicyCard'

const cardBase = 'rounded-2xl relative overflow-hidden'

const DEMO_POLICIES: PolicyCardData[] = [
  {
    id: '0x7a3f...e91b',
    name: 'Premium Spending Policy',
    subtitle: 'Daily limits with business hours',
    tier: 'premium',
    stats: [
      { label: 'Limit', value: '$500' },
      { label: 'Window', value: '9-17' },
      { label: 'KYC', value: 'L2+' },
    ],
    rules: ['Daily Limit', 'Business Hours', 'KYC Verified'],
    active: true,
    owner: '0x1234...5678',
    expiry: '2026-12-31',
  },
  {
    id: '0x9b2a...c45d',
    name: 'DAO Executive Card',
    subtitle: 'Multi-sig governance policy',
    tier: 'executive',
    stats: [
      { label: 'Signers', value: '3/5' },
      { label: 'Max', value: '$50K' },
      { label: 'Delay', value: '24h' },
    ],
    rules: ['Multisig', 'Timelock', 'DAO Vote'],
    active: true,
    owner: '0xabcd...ef01',
    expiry: '2027-06-30',
  },
  {
    id: '0x3f11...a781',
    name: 'Legendary Gamer Vault',
    subtitle: 'Esports tournament escrow',
    tier: 'legendary',
    stats: [
      { label: 'Pool', value: '100 ETH' },
      { label: 'Players', value: '64' },
      { label: 'Fee', value: '1%' },
    ],
    rules: ['Escrow', 'Auto-Split', 'VRAN Check'],
    active: false,
    owner: '0xdead...beef',
  },
]

export default function RulesPage() {
  const { address } = useAccount()
  const { data: myRules = [] } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const p = useV4Palette()

  const [testAmount, setTestAmount] = useState('')
  const [testResult, setTestResult] = useState<'ALLOW' | 'REJECT' | null>(null)

  const activeCount = DEMO_POLICIES.filter((p) => p.active).length
  const cardBorder = `absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`

  const runTest = () => {
    const val = parseFloat(testAmount.replace(/[^0-9.]/g, ''))
    if (Number.isNaN(val)) return
    setTestResult(val <= 500 ? 'ALLOW' : 'REJECT')
  }

  const demoRules = [
    { id: 'business_hours', name: 'Business Hours', detail: '09:00 — 17:00 UTC', icon: Clock },
    { id: 'limit', name: 'Daily Limit', detail: '$500 / day', icon: Activity },
    { id: 'kyc', name: 'KYC Verified', detail: 'Level 2 required', icon: Fingerprint },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-6">
      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${p.textMain}`}>Policy Engine</h1>
          <p className={`text-sm ${p.textMuted} mt-1`}>Active rule set for your PAY.ID</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00D084]/10 text-[#00D084]">WASM v4</span>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">EIP-712</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Policies', value: activeCount.toString(), icon: Shield, color: '#00D084' },
          { label: 'Total Rules', value: myRules.length.toString(), icon: Globe, color: '#0EA5E9' },
          { label: 'Status', value: activeCombined?.hash ? 'Enforced' : 'Idle', icon: Zap, color: activeCombined?.hash ? '#00D084' : '#F59E0B' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`rounded-xl p-4 border ${p.cardBorder}`}
            style={{ backgroundColor: p.cardBg }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
              <span className={`text-[11px] ${p.textMuted}`}>{s.label}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${p.textMain}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Combined Rule Set — Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${cardBase} p-5 border ${p.cardBorder}`}
        style={{
          background: p.dark
            ? 'linear-gradient(160deg, rgba(0,208,132,0.06) 0%, rgba(11,15,26,0.5) 50%, rgba(11,15,26,0.3) 100%)'
            : 'linear-gradient(160deg, rgba(0,208,132,0.10) 0%, rgba(241,245,249,0.9) 50%, rgba(241,245,249,0.8) 100%)',
        }}
      >
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#00D084]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#00D084]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${p.textMain}`}>Combined Rule Set</div>
              <div className={`text-[11px] ${p.textMuted} font-mono truncate`}>
                {activeCombined?.hash ? activeCombined.hash.slice(0, 28) + '...' : 'No active rule hash'}
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#64748B]">{myRules.length} rules loaded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {demoRules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${p.cardBorder}`}
                style={{ backgroundColor: p.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-[#00D084]/10 flex items-center justify-center shrink-0">
                  <rule.icon className="w-3.5 h-3.5 text-[#00D084]" />
                </div>
                <div className="min-w-0">
                  <div className={`text-[13px] font-medium ${p.textMain}`}>{rule.name}</div>
                  <div className={`text-[11px] ${p.textMuted} font-mono`}>{rule.detail}</div>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084] shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Two Column Layout: Cards + Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-semibold ${p.textMain}`}>My Policy Cards</h2>
            <span className={`text-[11px] ${p.textMuted}`}>{DEMO_POLICIES.length} cards</span>
          </div>
          <div className="space-y-3">
            {DEMO_POLICIES.map((policy, i) => (
              <PolicyCard key={policy.id} policy={policy} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Test Panel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-semibold ${p.textMain}`}>Test Policy</h2>
            <span className={`text-[11px] ${p.textMuted}`}>Simulation</span>
          </div>

          <div className={`${cardBase} p-5 border ${p.cardBorder}`} style={{ backgroundColor: p.cardBg }}>
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${p.textMain}`}>Transaction Simulator</p>
                  <p className={`text-[11px] ${p.textMuted}`}>Preview rule evaluation before execution</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[11px] font-medium ${p.textMuted}`}>Amount</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runTest()}
                    placeholder="e.g. 100 USDC"
                    className={`flex-1 px-4 py-2.5 rounded-xl ${p.inputBg} border ${p.inputBorder} text-[13px] ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors`}
                  />
                  <button
                    onClick={runTest}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-[13px] font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" /> Run
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[11px] font-medium ${p.textMuted}`}>Context</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Time', value: '14:30 UTC' },
                    { label: 'Chain', value: 'Sepolia' },
                    { label: 'KYC', value: 'L2 Verified' },
                    { label: 'Risk', value: 'Low (12)' },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className={`px-3 py-2 rounded-lg border ${p.cardBorder} text-[11px]`}
                      style={{ backgroundColor: p.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                    >
                      <span className={`${p.textMuted}`}>{c.label}:</span>{' '}
                      <span className={`font-mono ${p.textMain}`}>{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {testResult && (
                  <motion.div
                    key={testResult}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      testResult === 'ALLOW'
                        ? 'border-[#00D084]/20 bg-[#00D084]/5'
                        : 'border-[#EF4444]/20 bg-[#EF4444]/5'
                    }`}
                  >
                    {testResult === 'ALLOW' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00D084]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#EF4444]" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          testResult === 'ALLOW' ? 'text-[#00D084]' : 'text-[#EF4444]'
                        }`}
                      >
                        {testResult === 'ALLOW' ? 'Transaction Approved' : 'Transaction Blocked'}
                      </p>
                      <p className={`text-[11px] ${p.textMuted}`}>
                        {testResult === 'ALLOW'
                          ? 'All policy checks passed'
                          : 'Amount exceeds daily limit ($500)'}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${testResult === 'ALLOW' ? 'text-[#00D084]' : 'text-[#EF4444]'}`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
