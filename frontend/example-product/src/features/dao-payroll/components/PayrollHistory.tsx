import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface Run {
  id: string
  date: string
  recipientCount: number
  totalAmount: string
  status: 'completed' | 'processing' | 'failed'
  txHash?: string
}

interface Props {
  p: any
  runs: Run[]
}

export function PayrollHistory({ p, runs }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
      style={{ backgroundColor: p.cardBg }}
    >
      <div className="p-5 border-b border-dashed border-[#E5E7EB]/30">
        <h2 className={`text-sm font-semibold ${p.textMain}`}>Payroll History</h2>
      </div>
      <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
        {runs.map((run) => (
          <div key={run.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    run.status === 'completed'
                      ? '#00D08415'
                      : run.status === 'processing'
                        ? '#F59E0B15'
                        : '#EF444415',
                }}
              >
                {run.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
                ) : run.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                )}
              </div>
              <div>
                <p className={`text-xs font-medium ${p.textMain}`}>{run.date}</p>
                <p className={`text-[10px] ${p.textMuted}`}>
                  {run.recipientCount} recipients · {run.totalAmount} ETH
                </p>
              </div>
            </div>
            {run.txHash && (
              <span className={`text-[10px] font-mono ${p.textMuted}`}>{run.txHash}</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
