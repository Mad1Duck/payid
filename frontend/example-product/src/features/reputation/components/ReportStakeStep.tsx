import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { useVranConfig } from 'payid-react'

interface Props {
  stakeAmount: string
  setStakeAmount: (amount: string) => void
  onBack: () => void
  onSubmit: () => void
  isPending: boolean
  canSubmit: boolean
}

export function ReportStakeStep({ stakeAmount, setStakeAmount, onBack, onSubmit, isPending, canSubmit }: Props) {
  const p = useV4Palette()
  const { minStake } = useVranConfig({})
  const minStakeEth = (Number(minStake) / 1e18).toFixed(4)
  const isValidStake = stakeAmount !== '' && parseFloat(stakeAmount) >= Number(minStake) / 1e18

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-4"
    >
      <div>
        <div className={`text-base font-semibold ${p.textMain} mb-1`}>Stake Amount</div>
        <div className={`text-sm ${p.textMuted}`}>
          Stake tokens to prevent false reports. Minimum: {minStakeEth} ETH
        </div>
      </div>

      <div>
        <input
          type="number"
          placeholder={`Min ${minStakeEth} ETH`}
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl bg-transparent ${p.textMain} placeholder-gray-500 focus:outline-none border ${p.cardBorder} text-sm font-mono`}
        />
        {stakeAmount && !isValidStake && (
          <p className="text-[#EF4444] text-xs mt-1">Must be at least {minStakeEth} ETH</p>
        )}
      </div>

      <div className={`p-3 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.cardBgSolid }}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <p className={`text-xs ${p.textMuted}`}>
            If your report is confirmed as valid, you earn rewards. If it's rejected, your stake is burned.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#E2E8F0] text-sm font-bold text-[#64748B] hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#EF4444] text-white text-sm font-bold hover:bg-[#DC2626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4" /> Submit Report</>}
        </button>
      </div>
    </motion.div>
  )
}
