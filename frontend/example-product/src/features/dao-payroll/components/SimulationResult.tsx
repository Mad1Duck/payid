import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Loader2, Wallet, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  p: any
  simulationResult: any
  isCreating: boolean
  isBatching: boolean
  createSubscriptions: () => void
}

export function SimulationResult({ p, simulationResult, isCreating, isBatching, createSubscriptions }: Props) {
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
      style={{ backgroundColor: p.cardBg }}
    >
      <div className="p-5 border-b border-dashed border-[#E5E7EB]/30">
        <div className="flex items-center gap-2 mb-3">
          {simulationResult.decision === 'ALLOW' ? (
            <CheckCircle2 className="w-5 h-5 text-[#00D084]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
          )}
          <span className={`text-sm font-semibold ${simulationResult.decision === 'ALLOW' ? 'text-[#00D084]' : 'text-[#F59E0B]'}`}>
            {simulationResult.decision === 'ALLOW' ? 'Payroll Approved' : 'Payroll Blocked'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Total</p>
            <p className={`text-lg font-bold font-mono ${p.textMain}`}>{simulationResult.total} ETH</p>
          </div>
          <div>
            <p className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Gas Est.</p>
            <p className={`text-lg font-bold font-mono ${p.textMain}`}>{simulationResult.gasEstimate} ETH</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-1">
        {simulationResult.policyCheck.map((check: string, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3 h-3 text-[#00D084]" />
            <span className={p.textMuted}>{check}</span>
          </div>
        ))}
      </div>
      {simulationResult.decision === 'ALLOW' && (
        <div className="p-5 border-t border-dashed border-[#E5E7EB]/30 space-y-4">
          <button
            onClick={createSubscriptions}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Subscriptions...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Create Recurring Subscriptions
              </>
            )}
          </button>
          <p className={`text-[11px] ${p.textMuted}`}>
            Sets up automatic recurring payments for all contributors. First payment sent immediately, then based on schedule (weekly/monthly).
          </p>
          <button
            onClick={() => {
              toast.info('Batch payment requires DecisionProofs - integrate SDK to generate proofs')
            }}
            disabled={isBatching}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold hover:bg-[#8B5CF6]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBatching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Batch...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Execute One-Time Batch Payment
              </>
            )}
          </button>
          <p className={`text-[11px] ${p.textMuted}`}>
            Sends a one-time payment to all recipients in a single transaction using PayWithPayIDBatch contract. Requires DecisionProofs for each recipient.
          </p>
        </div>
      )}
    </motion.div>
  )
}
