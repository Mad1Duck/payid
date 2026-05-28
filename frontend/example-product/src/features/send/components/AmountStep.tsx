import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatUnits } from 'viem'
import { formatNumber } from '@/lib/utils'
import TransactionSimulation from '@/components/v4/TransactionSimulation'
import TargetPolicyInfo from './TargetPolicyInfo'
import type { CurrencyCode } from '../../../hooks/useMultiCurrency'

interface Props {
  p: any
  amount: string
  setAmount: (val: string) => void
  setDenyReason: (val: string) => void
  asset: string
  setAsset: (val: string) => void
  balanceValue: number
  balance: any
  displayCurrency: CurrencyCode
  convert: (val: number, currency: CurrencyCode) => number
  format: (val: number, currency: CurrencyCode) => string
  toggle: () => void
  nativeSymbol: string
  resolvedName: string | null
  targetPolicy: any
  onBack: () => void
  onNext: () => void
}

export function AmountStep({
  p, amount, setAmount, setDenyReason, asset, setAsset,
  balanceValue, balance, displayCurrency, convert, format, toggle,
  nativeSymbol, resolvedName, targetPolicy,
  onBack, onNext,
}: Props) {
  const percentages = [
    { label: 'Max', value: 1 },
    { label: '50%', value: 0.5 },
    { label: '30%', value: 0.3 },
    { label: '10%', value: 0.1 },
    { label: '5%', value: 0.05 },
  ]

  const applyPercent = (pct: number) => {
    if (!balance?.value || balance.value <= 0n) return
    if (pct === 1) {
      setAmount(formatUnits(balance.value, balance.decimals))
      setDenyReason('')
      return
    }
    const basis = BigInt(Math.round(pct * 1_000_000))
    const val = (balance.value * basis) / 1_000_000n
    setAmount(formatUnits(val, balance.decimals))
    setDenyReason('')
  }
  return (
    <motion.div
      key="amount"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-5"
    >
      <div className="text-center">
        <h2 className={`text-xl font-bold ${p.textMain}`}>How much?</h2>
        <p className={`text-xs ${p.textMuted} mt-1`}>
          Sending to <span className={`${p.textMain} font-mono font-medium`}>{resolvedName}</span>
        </p>
      </div>

      {targetPolicy && <TargetPolicyInfo policy={targetPolicy} p={p} />}

      <div
        className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative z-10 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <label className={`text-[11px] font-medium ${p.textMuted} block mb-1.5`}>Amount</label>
              <input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setDenyReason('');
                }}
                type="number"
                placeholder="0.00"
                className={`w-full px-4 py-3.5 rounded-xl border ${p.inputBorder} ${p.inputBg} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all font-mono text-xl`}
              />
              {amount && parseFloat(amount) > 0 && (
                <div className={`mt-1.5 text-xs ${p.textMuted} font-mono`}>
                  ≈{' '}
                  {format(
                    convert(parseFloat(amount), displayCurrency),
                    displayCurrency,
                  )}
                </div>
              )}

              {/* Percentage quick-select */}
              <div className="flex gap-1.5 mt-2">
                {percentages.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => applyPercent(value)}
                    disabled={!balance?.value || balance.value <= 0n}
                    className={`flex-1 px-2 py-1.5 rounded-lg border ${p.glass.border} ${p.textMuted} hover:${p.textMain} hover:bg-black/5 transition-colors cursor-pointer text-[10px] font-medium disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <label className={`text-[11px] font-medium ${p.textMuted} block mb-1.5`}>Token</label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className={`px-4 py-3.5 rounded-xl border ${p.inputBorder} ${p.inputBg} ${p.textMain} font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#00D084]/30`}
              >
                <option>{nativeSymbol}</option>
                <option>USDC</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className={`text-[11px] ${p.textMuted} font-mono`}>
              Balance: {balance ? formatNumber(balanceValue, 4) : '--'}{' '}
              {asset}
            </div>
            <button
              onClick={toggle}
              className={`text-[11px] px-3 py-1.5 rounded-lg border ${p.glass.border} ${p.textMain} hover:bg-black/5 transition-colors cursor-pointer`}
            >
              {displayCurrency}
            </button>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <TransactionSimulation
              amount={amount}
              asset={asset}
              currentBalance={formatNumber(balanceValue, 4)}
              onComplete={() => {}}
            />
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onBack}
              className={`px-4 py-3 rounded-xl border ${p.glass.border} ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer text-sm font-medium`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
