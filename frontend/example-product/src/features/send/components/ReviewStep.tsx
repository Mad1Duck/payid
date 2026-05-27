import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, X, Shield, Loader2 } from 'lucide-react'

interface Props {
  p: any
  resolvedName: string
  amount: string
  asset: string
  chainName: string
  chainId: number
  nativeSymbol: string
  preflightWarning: string
  denyReason: string
  flowIsPending: boolean
  onBack: () => void
  onRunPolicy: () => void
}

export function ReviewStep({
  p, resolvedName, amount, asset, chainName, chainId, nativeSymbol,
  preflightWarning, denyReason, flowIsPending, onBack, onRunPolicy
}: Props) {
  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-5"
    >
      <div className="text-center">
        <h2 className={`text-xl font-bold ${p.textMain}`}>Review & Send</h2>
        <p className={`text-xs ${p.textMuted} mt-1`}>
          Verify details before running policy check
        </p>
      </div>

      <div
        className="rounded-2xl p-5 space-y-3 relative overflow-hidden"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className={`text-[13px] ${p.textMuted}`}>Recipient</span>
            <span className={`text-[13px] ${p.textMain} font-mono font-medium`}>{resolvedName || ''}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className={`text-[13px] ${p.textMuted}`}>Amount</span>
            <span className={`text-[13px] ${p.textMain} font-mono font-medium`}>{`${amount} ${asset}`}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className={`text-[13px] ${p.textMuted}`}>Network</span>
            <span className={`text-[13px] ${p.textMain} font-mono font-medium`}>{`${chainName} · ${chainId}`}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className={`text-[13px] ${p.textMuted}`}>Est. Fee</span>
            <span className={`text-[13px] ${p.textMain} font-mono font-medium`}>{`~0.0001 ${nativeSymbol}`}</span>
          </div>
        </div>
      </div>

      {preflightWarning && !denyReason && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-medium text-[#F59E0B]">
              Warning: Policy May Reject This
            </div>
            <div className={`text-[11px] ${p.textMuted} mt-0.5`}>
              {preflightWarning}
            </div>
          </div>
        </motion.div>
      )}

      {denyReason && (
        <motion.div
          initial={{ opacity: 0, x: [0, -8, 8, -8, 8, 0] }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ x: { duration: 0.4 }, opacity: { duration: 0.2 } }}
          className="rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <X className="w-4 h-4 text-[#EF4444] shrink-0" />
          <div>
            <div className="text-[13px] font-medium text-[#EF4444]">
              Policy Denied
            </div>
            <div className={`text-[11px] ${p.textMuted} mt-0.5`}>
              {denyReason}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className={`px-4 py-3 rounded-xl border ${p.glass.border} ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer text-sm font-medium`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onRunPolicy}
          disabled={flowIsPending}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {flowIsPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Evaluating…
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" /> Run Policy Check
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
