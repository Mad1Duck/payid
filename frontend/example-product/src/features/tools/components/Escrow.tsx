import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

export function Escrow() {
  const p = useV4Palette()
  const [freelancer, setFreelancer] = useState('')
  const [asset, setAsset] = useState('ETH')
  const [deadline, setDeadline] = useState('30')
  const [milestones, setMilestones] = useState([{ desc: '', amount: '' }])

  const addMilestone = () => setMilestones([...milestones, { desc: '', amount: '' }])
  const updateMilestone = (i: number, field: 'desc' | 'amount', value: string) => {
    const next = [...milestones]
    next[i][field] = value
    setMilestones(next)
  }
  const total = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)

  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-semibold ${p.textMain}`}>Create Escrow</h3>

      <div className="space-y-3">
        <input
          value={freelancer}
          onChange={(e) => setFreelancer(e.target.value)}
          placeholder="Freelancer address (0x...)"
          className={`w-full px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
        />
        <div className="flex gap-3">
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className={`flex-1 px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} focus:outline-none focus:border-[#00D084]/40 font-mono`}
          >
            <option>ETH</option>
            <option>USDC</option>
          </select>
          <input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            type="number"
            placeholder="Deadline (days)"
            className={`w-32 px-3 py-2.5 rounded-xl text-sm ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono text-center`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className={`text-xs ${p.textMuted} font-medium`}>Milestones</p>
        {milestones.map((m, i) => (
          <div key={i} className={`flex gap-2 p-2 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.cardBg }}>
            <input
              value={m.desc}
              onChange={(e) => updateMilestone(i, 'desc', e.target.value)}
              placeholder={`Milestone ${i + 1}`}
              className={`flex-1 px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40`}
            />
            <input
              value={m.amount}
              onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
              placeholder="0.00"
              type="number"
              className={`w-20 px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono text-right`}
            />
          </div>
        ))}
        <button onClick={addMilestone} className="flex items-center gap-1 text-xs font-medium text-[#00D084] hover:underline cursor-pointer">
          <Plus className="w-3 h-3" /> Add milestone
        </button>
      </div>

      <div className={`flex justify-between text-sm ${p.textMain} pt-2 border-t ${p.cardBorder}`}>
        <span className={p.textMuted}>Total Locked</span>
        <span className="font-mono font-semibold">{total.toFixed(4)} {asset}</span>
      </div>

      <button disabled title="Escrow contract not yet deployed" className="w-full py-2.5 rounded-xl bg-[#64748B]/10 text-[#64748B] text-sm font-semibold border border-dashed border-[#64748B]/20 cursor-not-allowed opacity-70">
        Create Escrow (Contract Not Deployed)
      </button>
    </div>
  )
}
