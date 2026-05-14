import { motion } from 'framer-motion'
import { Shield, AlertTriangle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useActiveCombinedRule, useMyRules } from 'payid-react'
import { useV4Palette } from './theme'

const cardBase = 'rounded-2xl relative overflow-hidden'

export default function RulesPage() {
  const { address } = useAccount()
  const { data: myRules = [] } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const p = useV4Palette()
  const cardBorder = `absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`
  const cardBg = { background: p.cardBg }

  const demoRules = [
    { id: 'business_hours', name: 'Business Hours', detail: '09:00 — 17:00 UTC' },
    { id: 'limit', name: 'Daily Limit', detail: '$500 / day' },
    { id: 'kyc', name: 'KYC Verified', detail: 'Level 2 required' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-lg font-semibold ${p.textMain}`}>Policy Engine</h1>
          <p className={`text-xs ${p.textMuted} mt-0.5`}>Active rule set for your PAY.ID</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#00D084]/10 text-[#00D084]">WASM v4</span>
      </div>

      {/* Combined rule */}
      <div className={`${cardBase} p-5`} style={{ background: p.dark ? 'linear-gradient(160deg, rgba(0,208,132,0.06) 0%, rgba(11,15,26,0.5) 50%, rgba(11,15,26,0.3) 100%)' : 'linear-gradient(160deg, rgba(0,208,132,0.10) 0%, rgba(241,245,249,0.9) 50%, rgba(241,245,249,0.8) 100%)' }}>
        <div className={cardBorder} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#00D084]/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#00D084]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-medium ${p.textMain}`}>Combined Rule Set</div>
              <div className={`text-[11px] ${p.textMuted} font-mono truncate`}>
                {activeCombined?.hash ? activeCombined.hash.slice(0, 24) + '...' : 'No active rule'}
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#64748B]">{myRules.length} rules</span>
          </div>

          <div className="space-y-2">
            {demoRules.map((rule) => (
              <div key={rule.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D084] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] ${p.textMain}`}>{rule.name}</div>
                  <div className={`text-[11px] ${p.textMuted} font-mono`}>{rule.detail}</div>
                </div>
                <span className="text-[10px] font-mono text-[#00D084]">PASS</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test panel */}
      <div className={`${cardBase} p-5`} style={cardBg}>
        <div className={cardBorder} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <span className={`text-[13px] font-medium ${p.textMain}`}>Test Policy</span>
          </div>
          <p className={`text-[11px] ${p.textMuted} mb-4`}>Simulate a transaction to preview evaluation.</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Amount (e.g. 100 USDC)"
              className={`flex-1 px-4 py-2.5 rounded-xl ${p.inputBg} border ${p.inputBorder} text-[13px] ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors`}
            />
            <button className="px-5 py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-[13px] font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer">
              Evaluate
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
