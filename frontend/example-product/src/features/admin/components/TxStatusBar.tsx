import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, AlertTriangle, Check } from 'lucide-react'

interface Props {
  p: any
  txBusy: boolean
  txError: string
  hash: string
}

export function TxStatusBar({ p, txBusy, txError, hash }: Props) {
  return (
    <AnimatePresence>
      {(txBusy || txError || hash) && (
        <motion.div
          key="tx"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={`p-4 rounded-2xl border flex items-start gap-3 ${txError ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}
        >
          {txBusy ? (
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
          ) : txError ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${txError ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {txError ??
                (txBusy ? 'Transaction pending…' : 'Transaction confirmed ✓')}
            </p>
            {hash && !txBusy && (
              <p
                className={`text-[10px] font-mono mt-1 break-all ${p.textMuted}`}
              >
                {hash}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
