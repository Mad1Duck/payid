import { motion } from 'framer-motion'
import { Link2, Copy, Check, Share2 } from 'lucide-react'

interface Props {
  p: any
  displayPayId: string
  payload: any
  expiryLabel: string
  copiedPayId: boolean
  handleCopyPayId: () => void
  handleShare: () => void
}

export function PaymentLink({ p, displayPayId, payload, expiryLabel, copiedPayId, handleCopyPayId, handleShare }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl p-4 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-3.5 h-3.5 text-[#00D084]" />
        <span className={`text-xs font-semibold ${p.textMain}`}>
          Payment Link
        </span>
        {payload && (
          <span className={`text-[10px] ${p.textMuted} ml-auto`}>
            {expiryLabel} remaining
          </span>
        )}
      </div>

      <div
        className={`flex items-center gap-2.5 p-3 rounded-xl ${p.dark ? 'bg-white/5' : 'bg-black/3'} border ${p.cardBorder}`}
      >
        <div className="w-8 h-8 rounded-full bg-[#00D084]/15 flex items-center justify-center shrink-0">
          <span className="text-[#00D084] font-bold text-xs">P</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-mono font-medium ${p.textMain} truncate`}>
            {displayPayId}
          </div>
          <div className={`text-[10px] ${p.textMuted}`}>
            {payload ? 'Anyone with this link can pay you' : 'Generate a QR to get a shareable link'}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopyPayId}
            className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
            title="Copy link"
          >
            {copiedPayId ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
          </button>
          <button
            onClick={handleShare}
            className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
            title="Share"
          >
            <Share2 className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
