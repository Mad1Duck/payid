import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Layers,
  Repeat,
  ShieldCheck,
  Clock,
  Plus,
  Minus,
  AlertCircle,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { useV4Palette } from './theme'

const TABS = [
  { id: 'batch', label: 'Batch Pay', icon: Layers },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'escrow', label: 'Escrow', icon: ShieldCheck },
  { id: 'vesting', label: 'Vesting', icon: Clock },
] as const

function BatchPay({ p }: { p: ReturnType<typeof useV4Palette> }) {
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

      <button className="w-full py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer">
        Execute Batch
      </button>
    </div>
  )
}

function Recurring({ p }: { p: ReturnType<typeof useV4Palette> }) {
  const [receiver, setReceiver] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [period, setPeriod] = useState('30')
  const [asset, setAsset] = useState('ETH')

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
            <option>ETH</option>
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

      <button className="w-full py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer">
        Create Subscription
      </button>
    </div>
  )
}

function Escrow({ p }: { p: ReturnType<typeof useV4Palette> }) {
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

      <button className="w-full py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer">
        Create Escrow
      </button>
    </div>
  )
}

function Vesting({ p }: { p: ReturnType<typeof useV4Palette> }) {
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

      <button className="w-full py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer">
        Create Schedule
      </button>
    </div>
  )
}

export default function AdvancedTools() {
  const p = useV4Palette()
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('batch')

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <Layers className="w-10 h-10 text-[#64748B] mx-auto mb-4" />
        <h2 className={`text-lg font-semibold ${p.textMain} mb-1`}>Connect Wallet</h2>
        <p className={`text-xs ${p.textMuted}`}>Link your wallet to access advanced payment tools.</p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Advanced Tools</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>Batch, recurring, escrow, and vesting payments.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20'
                  : `${p.cardBg} ${p.cardBorder} ${p.textMuted} hover:bg-black/5 border`
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`${p.cardBg} rounded-2xl p-6 relative border ${p.cardBorder}`}
      >
        {activeTab === 'batch' && <BatchPay p={p} />}
        {activeTab === 'recurring' && <Recurring p={p} />}
        {activeTab === 'escrow' && <Escrow p={p} />}
        {activeTab === 'vesting' && <Vesting p={p} />}
      </motion.div>
    </div>
  )
}
