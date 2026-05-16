import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

export function BatchPay() {
  const p = useV4Palette()
  const [recipients, setRecipients] = useState([{ address: '', amount: '' }])
  const [asset, setAsset] = useState('ETH')

  const addRecipient = () => setRecipients([...recipients, { address: '', amount: '' }])
  const removeRecipient = (i: number) => setRecipients(recipients.filter((_, idx) => idx !== i))
  const updateRecipient = (i: number, field: 'address' | 'amount', value: string) => {
    const next = [...recipients]
    next[i][field] = value
    setRecipients(next)
  }

  const total = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${p.textMain}`}>Batch Payment</h3>
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border ${p.cardBorder} ${p.textMain} ${p.inputBg}`}
        >
          <option>ETH</option>
          <option>USDC</option>
        </select>
      </div>

      <div className="space-y-2">
        {recipients.map((r, i) => (
          <div key={i} className={`flex gap-2 p-3 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.cardBg }}>
            <input
              value={r.address}
              onChange={(e) => updateRecipient(i, 'address', e.target.value)}
              placeholder="0x..."
              className={`flex-1 px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
            />
            <input
              value={r.amount}
              onChange={(e) => updateRecipient(i, 'amount', e.target.value)}
              placeholder="0.00"
              type="number"
              className={`w-24 px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono text-right`}
            />
            <button
              onClick={() => removeRecipient(i)}
              disabled={recipients.length === 1}
              className="px-2 py-2 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addRecipient}
        className={`flex items-center gap-1 text-xs font-medium text-[#00D084] hover:underline cursor-pointer`}
      >
        <Plus className="w-3 h-3" /> Add recipient
      </button>

      <div className={`flex justify-between text-sm ${p.textMain} pt-2 border-t ${p.cardBorder}`}>
        <span className={p.textMuted}>Total</span>
        <span className="font-mono font-semibold">{total.toFixed(4)} {asset}</span>
      </div>

      <button disabled title="Batch payment contract not yet deployed" className="w-full py-2.5 rounded-xl bg-[#64748B]/10 text-[#64748B] text-sm font-semibold border border-dashed border-[#64748B]/20 cursor-not-allowed opacity-70">
        Execute Batch (Contract Not Deployed)
      </button>
    </div>
  )
}
