import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { useChainId, useChains } from 'wagmi'

export function Recurring() {
  const p = useV4Palette()
  const chainId = useChainId()
  const chains = useChains()
  const nativeSymbol = chains.find(c => c.id === chainId)?.nativeCurrency.symbol ?? 'ETH'
  const [receiver, setReceiver] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [period, setPeriod] = useState('30')
  const [asset, setAsset] = useState(nativeSymbol)

  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-semibold ${p.textMain}`}>Create Subscription</h3>

      <div className="space-y-3">
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Receiver</label>
          <input
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            placeholder="0x..."
            className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Max Amount / Charge</label>
            <input
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              type="number"
              placeholder="0.00"
              className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
            />
          </div>
          <div className="w-28">
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Period (days)</label>
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              type="number"
              className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono text-center`}
            />
          </div>
        </div>

        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} focus:outline-none focus:border-[#00D084]/40 font-mono`}
          >
            <option>{nativeSymbol}</option>
            <option>USDC</option>
          </select>
        </div>
      </div>

      <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
          <p className={`text-xs ${p.textMuted}`}>
            You approve up to <span className={p.textMain}>{maxAmount || '0'} {asset}</span> every {period} days.
            The receiver can charge this amount with a valid Decision Proof.
          </p>
        </div>
      </div>

      <button disabled title="Recurring payment contract not yet deployed" className="w-full py-2.5 rounded-xl bg-[#64748B]/10 text-[#64748B] text-sm font-semibold border border-dashed border-[#64748B]/20 cursor-not-allowed opacity-70">
        Create Subscription (Contract Not Deployed)
      </button>
    </div>
  )
}
