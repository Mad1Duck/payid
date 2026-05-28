import { motion } from 'framer-motion'
import { Check, Copy, RotateCcw } from 'lucide-react'

interface Props {
  p: any
  amount: string
  asset: string
  resolvedName: string | null
  txHash: string
  reset: () => void
}

export function SuccessStep({ p, amount, asset, resolvedName, txHash, reset }: Props) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5 text-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute left-1/2 top-24 -translate-x-1/2 w-20 h-20 rounded-full border-2 border-[#00D084] pointer-events-none"
      />
      <div className="py-6 relative">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            delay: 0.1,
          }}
          className="w-16 h-16 rounded-full bg-[#00D084]/15 border border-[#00D084]/30 flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-8 h-8 text-[#00D084]" strokeWidth={3} />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-[#00D084]"
        >
          Payment Sent
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className={`text-xs ${p.textMuted} mt-1`}
        >
          {amount} {asset} to {resolvedName}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-4 text-left relative overflow-hidden"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div
              className={`text-[10px] ${p.textMuted} font-mono uppercase tracking-wider mb-1`}
            >
              Transaction Hash
            </div>
            <div className={`text-[13px] font-mono ${p.textMain}`}>
              {txHash}
            </div>
          </div>
          <button
            className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
          >
            <Copy className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={reset}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] text-[#64748B] hover:${p.textMain} transition-colors`}
      >
        <RotateCcw className="w-3.5 h-3.5" /> Send Another
      </motion.button>
    </motion.div>
  )
}
