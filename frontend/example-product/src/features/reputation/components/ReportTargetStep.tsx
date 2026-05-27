import { motion } from 'framer-motion'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

interface Props {
  targetAddress: string
  setTargetAddress: (addr: string) => void
  onBack: () => void
  onNext: () => void
}

export function ReportTargetStep({ targetAddress, setTargetAddress, onBack, onNext }: Props) {
  const p = useV4Palette()
  const isValidAddress = targetAddress.startsWith('0x') && targetAddress.length === 42

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-4"
    >
      <div>
        <div className={`text-base font-semibold ${p.textMain} mb-1`}>Target Address</div>
        <div className={`text-sm ${p.textMuted}`}>
          The address you're reporting as a bad actor.
        </div>
      </div>

      <div>
        <input
          type="text"
          placeholder="0x..."
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl bg-transparent ${p.textMain} placeholder-gray-500 focus:outline-none border ${p.cardBorder} text-sm font-mono`}
        />
        {targetAddress && !isValidAddress && (
          <p className="text-[#EF4444] text-xs mt-1">Must be a valid 42-character 0x address</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#E2E8F0] text-sm font-bold text-[#64748B] hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValidAddress}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next: Stake <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}
