import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

interface Props {
  isSufficient: boolean
  recipients: any[]
  simulate: () => void
}

export function ActionBar({ isSufficient, recipients, simulate }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex gap-3"
    >
      <button
        onClick={simulate}
        disabled={recipients.length === 0}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
          isSufficient
            ? 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
            : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
        }`}
      >
        <Shield className="w-4 h-4" />
        {isSufficient ? 'Simulate Payroll' : 'Simulate (Insufficient Funds)'}
      </button>
    </motion.div>
  )
}
