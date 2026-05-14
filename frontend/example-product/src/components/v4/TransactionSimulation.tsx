import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Loader2, Calculator } from 'lucide-react'
import { useV4Palette } from './theme'

interface SimulationResult {
  decision: 'ALLOW' | 'REJECT' | 'SIMULATING'
  newBalance: string
  fee: string
  total: string
  reason?: string
  ruleStatus: 'pending' | 'running' | 'done'
}

export default function TransactionSimulation({
  amount,
  asset,
  currentBalance,
  onComplete,
}: {
  amount: string
  asset: string
  currentBalance: string
  onComplete: (result: SimulationResult) => void
}) {
  const p = useV4Palette()
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(true)

  useEffect(() => {
    setIsSimulating(true)
    setResult(null)

    // Simulate evaluation delay
    const timer = setTimeout(() => {
      const amt = parseFloat(amount) || 0
      const bal = parseFloat(currentBalance) || 0
      const fee = 0.0001
      const total = amt + fee

      const simulated: SimulationResult =
        amt > 1000
          ? {
              decision: 'REJECT',
              newBalance: bal.toFixed(4),
              fee: fee.toFixed(4),
              total: total.toFixed(4),
              reason: 'Daily limit exceeded ($500 max)',
              ruleStatus: 'done',
            }
          : bal < total
            ? {
                decision: 'REJECT',
                newBalance: bal.toFixed(4),
                fee: fee.toFixed(4),
                total: total.toFixed(4),
                reason: 'Insufficient balance',
                ruleStatus: 'done',
              }
            : {
                decision: 'ALLOW',
                newBalance: (bal - total).toFixed(4),
                fee: fee.toFixed(4),
                total: total.toFixed(4),
                ruleStatus: 'done',
              }

      setResult(simulated)
      setIsSimulating(false)
      onComplete(simulated)
    }, 1500)

    return () => clearTimeout(timer)
  }, [amount, asset, currentBalance, onComplete])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-[#00D084]" />
        <h3 className={`text-sm font-semibold ${p.textMain}`}>Transaction Simulation</h3>
      </div>

      <AnimatePresence mode="wait">
        {isSimulating ? (
          <motion.div
            key="simulating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl p-4 border ${p.cardBorder}`}
            style={{ backgroundColor: p.cardBg }}
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#00D084] animate-spin" />
              <div>
                <p className={`text-sm ${p.textMain}`}>Simulating payment...</p>
                <p className={`text-xs ${p.textMuted}`}>Checking rules, balance, and fees</p>
              </div>
            </div>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border ${p.cardBorder}`}
            style={{ backgroundColor: p.cardBg }}
          >
            <div className="flex items-center gap-2 mb-3">
              {result.decision === 'ALLOW' ? (
                <CheckCircle className="w-5 h-5 text-[#00D084]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
              )}
              <span className={`text-sm font-semibold ${result.decision === 'ALLOW' ? 'text-[#00D084]' : 'text-[#F59E0B]'}`}>
                {result.decision === 'ALLOW' ? 'Transaction Allowed' : 'Transaction Rejected'}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={p.textMuted}>Amount</span>
                <span className={`${p.textMain} font-mono`}>{amount} {asset}</span>
              </div>
              <div className="flex justify-between">
                <span className={p.textMuted}>Network Fee</span>
                <span className={`${p.textMain} font-mono`}>{result.fee} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className={p.textMuted}>Total</span>
                <span className={`${p.textMain} font-mono font-semibold`}>{result.total} {asset === 'ETH' ? asset : 'ETH'}</span>
              </div>
              <div className="flex justify-between">
                <span className={p.textMuted}>New Balance</span>
                <span className={`${p.textMain} font-mono`}>{result.newBalance} {asset}</span>
              </div>
            </div>

            {result.reason && (
              <p className={`mt-3 text-xs ${p.textMuted}`}>{result.reason}</p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
