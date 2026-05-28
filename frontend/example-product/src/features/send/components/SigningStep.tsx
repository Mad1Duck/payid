import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import type { Step } from '../types'

interface Props {
  p: any
  flowStatus: string
  denyReason: string
  flowError: any
  copy: (text: string) => void
  reset: () => void
  setStep: (step: Step) => void
  handleRunPolicy: () => void
}

export function SigningStep({ p, flowStatus, denyReason, flowError, copy, reset, setStep, handleRunPolicy }: Props) {
  return (
    <motion.div
      key="signing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${flowStatus === 'error' ? 'bg-red-500/10' : 'bg-[#00D084]/10'}`}
        >
          {flowStatus === 'error' ? (
            <X className="w-7 h-7 text-red-400" />
          ) : (
            <Loader2 className="w-7 h-7 text-[#00D084] animate-spin" />
          )}
        </motion.div>
        <h2
          className={`text-xl font-semibold ${flowStatus === 'error' ? 'text-red-400' : p.textMain}`}
        >
          {flowStatus === 'error'
            ? 'Transaction Failed'
            : flowStatus === 'confirming'
              ? 'Confirming…'
              : 'Awaiting Signature'}
        </h2>
        <p className={`text-xs ${p.textMuted} mt-1`}>
          {flowStatus === 'error'
            ? 'The transaction was rejected or reverted.'
            : flowStatus === 'confirming'
              ? 'Waiting for on-chain confirmation.'
              : 'Check your wallet — sign the EIP-712 Decision Proof.'}
        </p>
      </div>

      {flowStatus === 'error' && denyReason && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-red-400/60">
            Revert Reason
          </p>
          <p className="text-xs text-red-400 wrap-break-word leading-relaxed">
            {denyReason}
          </p>
          <button
            onClick={() => {
              copy(String(flowError ?? denyReason))
            }}
            className="text-[10px] text-red-400/50 hover:text-red-400 underline cursor-pointer transition-colors"
          >
            Copy full error
          </button>
        </div>
      )}

      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative z-10">
          <div
            className={`text-[10px] ${p.textMuted} font-mono uppercase tracking-wider mb-1`}
          >
            Status
          </div>
          <div className={`text-sm font-medium ${p.textMain}`}>
            {flowStatus === 'error'
              ? 'Transaction failed. You can retry or go back to edit.'
              : flowStatus === 'confirming'
                ? 'Transaction submitted — waiting for block confirmation.'
                : 'Please sign the EIP-712 typed data in your wallet extension.'}
          </div>
        </div>
      </div>

      {flowStatus === 'error' && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              reset()
              setStep('review')
            }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${p.cardBorder} ${p.textMuted}`}
          >
            ← Edit Payment
          </button>
          <button
            onClick={() => {
              reset()
              handleRunPolicy()
            }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#00D084]"
          >
            Retry
          </button>
        </div>
      )}
    </motion.div>
  )
}
