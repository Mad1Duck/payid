import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface Props {
  p: any
  payId: string
  setPayId: (val: string) => void
  resolvePayId: () => void
}

export function RecipientStep({ p, payId, setPayId, resolvePayId }: Props) {
  return (
    <motion.div
      key="who"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-5"
    >
      <div className="text-center">
        <h2 className={`text-xl font-bold ${p.textMain}`}>Who are you sending to?</h2>
        <p className={`text-xs ${p.textMuted} mt-1`}>
          Enter a PAY.ID or wallet address
        </p>
      </div>
      <div
        className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative z-10 space-y-3">
          <label className={`text-[11px] font-medium ${p.textMuted} block`}>Recipient</label>
          <input
            value={payId}
            onChange={(e) => setPayId(e.target.value)}
            placeholder="pay.id/alice  or  0x1234..."
            className={`w-full px-4 py-3.5 rounded-xl border ${p.inputBorder} ${p.inputBg} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all font-mono text-sm`}
          />
          <button
            onClick={resolvePayId}
            disabled={!payId.trim()}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
