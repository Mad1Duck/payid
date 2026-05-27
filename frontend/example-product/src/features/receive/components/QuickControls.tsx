import { motion } from 'framer-motion'
import { RefreshCw, Zap } from 'lucide-react'
import PremiumButton from '@/components/v4/PremiumButton'
import { Chip } from './Chip'

interface Props {
  p: any
  nativeSymbol: string
  maxAmount: string
  setMaxAmount: (val: string) => void
  expiryMin: string
  setExpiryMin: (val: string) => void
  handleGenerate: () => void
  reset: () => void
  isLoading: boolean
  hasSecureQr: boolean
  address: `0x${string}` | undefined
  payload: any
}

export function QuickControls({ p, nativeSymbol, maxAmount, setMaxAmount, expiryMin, setExpiryMin, handleGenerate, reset, isLoading, hasSecureQr, address, payload }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="rounded-2xl p-4 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className="space-y-3.5">
        <div>
          <label className={`text-[11px] font-medium ${p.textMuted} block mb-1.5`}>
            Max Amount ({nativeSymbol})
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="Unlimited"
              className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30`}
            />
            <div className="flex flex-wrap gap-1.5 items-center">
              {['5', '10', '50', '100'].map((v) => (
                <Chip key={v} label={v} active={maxAmount === v} onClick={() => setMaxAmount(v)} />
              ))}
              <Chip label="∞" active={!maxAmount} onClick={() => setMaxAmount('')} />
            </div>
          </div>
        </div>

        <div>
          <label className={`text-[11px] font-medium ${p.textMuted} block mb-1.5`}>
            Expires in
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: '15 min', val: '15' },
              { label: '1 hour', val: '60' },
              { label: '24 hours', val: '1440' },
              { label: '7 days', val: '10080' },
            ].map(({ label, val }) => (
              <Chip key={val} label={label} active={expiryMin === val} onClick={() => setExpiryMin(val)} />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <PremiumButton
            onClick={handleGenerate}
            disabled={!address || isLoading}
            isLoading={isLoading}
            icon={<Zap className="w-4 h-4" />}
            className="flex-1"
          >
            {hasSecureQr ? 'Regenerate Secure QR' : 'Create Secure QR'}
          </PremiumButton>
          {payload && (
            <button
              onClick={reset}
              className="px-3 py-2.5 rounded-xl border border-[#64748B]/20 text-[#64748B] hover:bg-[#64748B]/5 cursor-pointer transition-colors"
              title="Clear"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
