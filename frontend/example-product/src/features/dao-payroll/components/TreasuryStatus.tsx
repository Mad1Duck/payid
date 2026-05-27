import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { formatUnits } from 'viem'

interface Props {
  p: any
  balance: any
  nativeSymbol: string
  totalPayroll: string
  isSufficient: boolean
  recipients: any[]
}

export function TreasuryStatus({ p, balance, nativeSymbol, totalPayroll, isSufficient, recipients }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={`rounded-2xl p-5 border ${p.cardBorder}`}
      style={{ backgroundColor: p.cardBg }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className={`text-xs ${p.textMuted} mb-1`}>Treasury Balance</p>
          <p className={`text-xl font-bold font-mono ${p.textMain}`}>
            {balance ? formatUnits(balance.value, balance.decimals) : '12.50'} {balance?.symbol || nativeSymbol}
          </p>
        </div>
        <div>
          <p className={`text-xs ${p.textMuted} mb-1`}>Total Payroll</p>
          <p className={`text-xl font-bold font-mono ${isSufficient ? 'text-[#00D084]' : 'text-[#EF4444]'}`}>
            {totalPayroll} {nativeSymbol}
          </p>
        </div>
        <div>
          <p className={`text-xs ${p.textMuted} mb-1`}>Active Contributors</p>
          <p className={`text-xl font-bold font-mono ${p.textMain}`}>{recipients.length}</p>
        </div>
      </div>
      {!isSufficient && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#EF4444]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Insufficient treasury balance for this payroll run</span>
        </div>
      )}
    </motion.div>
  )
}
