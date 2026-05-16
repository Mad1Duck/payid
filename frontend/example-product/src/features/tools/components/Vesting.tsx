import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

export function Vesting() {
  const p = useV4Palette()
  const [beneficiary, setBeneficiary] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [cliff, setCliff] = useState('90')
  const [duration, setDuration] = useState('365')
  const [asset, setAsset] = useState('ETH')
  const [revocable, setRevocable] = useState(false)

  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-semibold ${p.textMain}`}>Create Vesting Schedule</h3>

      <div className="space-y-3">
        <input
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="Beneficiary address (0x...)"
          className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              type="number"
              placeholder="Total Amount"
              className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
            />
          </div>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className={`w-28 px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} focus:outline-none focus:border-[#00D084]/40 font-mono`}
          >
            <option>ETH</option>
            <option>USDC</option>
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Cliff (days)</label>
            <input
              value={cliff}
              onChange={(e) => setCliff(e.target.value)}
              type="number"
              className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono text-center`}
            />
          </div>
          <div className="flex-1">
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Duration (days)</label>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              type="number"
              className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono text-center`}
            />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={revocable}
          onChange={(e) => setRevocable(e.target.checked)}
          className="w-4 h-4 rounded accent-[#00D084]"
        />
        <span className={`text-xs ${p.textMuted}`}>Revocable (you can revoke remaining)</span>
      </label>

      <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-[#00D084] mt-0.5 shrink-0" />
          <p className={`text-xs ${p.textMuted}`}>
            Linear vesting after {cliff}-day cliff. Full unlock after {duration} days.
            Beneficiary can release pro-rata at any time.
          </p>
        </div>
      </div>

      <button disabled title="Vesting contract not yet deployed" className="w-full py-2.5 rounded-xl bg-[#64748B]/10 text-[#64748B] text-sm font-semibold border border-dashed border-[#64748B]/20 cursor-not-allowed opacity-70">
        Create Schedule (Contract Not Deployed)
      </button>
    </div>
  )
}
