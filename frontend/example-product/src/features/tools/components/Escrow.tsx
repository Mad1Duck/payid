import { useState } from 'react'
import { Plus, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { useChainId, useChains, useAccount } from 'wagmi'
import { useUserEscrows, useCreateEscrow, useSubmitMilestone, useReleaseMilestone, useDisputeEscrow } from 'payid-react'
import { parseEther } from 'viem'

export function Escrow() {
  const p = useV4Palette()
  const chainId = useChainId()
  const chains = useChains()
  const { address } = useAccount()
  const nativeSymbol = chains.find(c => c.id === chainId)?.nativeCurrency.symbol ?? 'ETH'
  
  const { escrows, isLoading: loadingEscrows } = useUserEscrows()
  const { createEscrow, isPending: creating, isSuccess: created } = useCreateEscrow()
  const { submitMilestone, isPending: submitting } = useSubmitMilestone()
  const { releaseMilestone, isPending: releasing } = useReleaseMilestone()
  const { dispute, isPending: disputing } = useDisputeEscrow()

  const [freelancer, setFreelancer] = useState('')
  const [asset, setAsset] = useState(nativeSymbol)
  const [deadline, setDeadline] = useState('30')
  const [milestones, setMilestones] = useState([{ desc: '', amount: '' }])
  const [showCreate, setShowCreate] = useState(false)

  const addMilestone = () => setMilestones([...milestones, { desc: '', amount: '' }])
  const updateMilestone = (i: number, field: 'desc' | 'amount', value: string) => {
    const next = [...milestones]
    next[i][field] = value
    setMilestones(next)
  }
  const total = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)

  const handleCreate = async () => {
    if (!address || !freelancer) return
    
    const deadlineTs = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadline) * 86400)
    const milestoneDefs = milestones
      .filter(m => m.desc && m.amount)
      .map(m => ({
        description: m.desc,
        amount: parseEther(m.amount || '0'),
      }))

    if (milestoneDefs.length === 0) return

    const assetAddr = asset === nativeSymbol ? '0x0000000000000000000000000000000000000000' as `0x${string}` : freelancer // Simplified - should use real token address
    const value = asset === nativeSymbol ? parseEther(total.toString()) : undefined

    createEscrow(
      freelancer as `0x${string}`,
      assetAddr,
      milestoneDefs,
      deadlineTs,
      value
    )
  }

  const statusColors = {
    pending: 'text-yellow-500',
    active: 'text-blue-500',
    disputed: 'text-red-500',
    completed: 'text-green-500',
    refunded: 'text-gray-500',
  }

  const statusIcons = {
    pending: Clock,
    active: Clock,
    disputed: AlertTriangle,
    completed: CheckCircle,
    refunded: AlertTriangle,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${p.textMain}`}>Escrow Milestones</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`text-xs font-medium ${showCreate ? 'text-[#00D084]' : p.textMuted} hover:underline`}
        >
          {showCreate ? 'Cancel' : '+ Create New'}
        </button>
      </div>

      {showCreate && (
        <div className={`p-4 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.cardBg }}>
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
                <option>{nativeSymbol}</option>
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

          <div className="space-y-2 mt-3">
            <p className={`text-xs ${p.textMuted} font-medium`}>Milestones</p>
            {milestones.map((m, i) => (
              <div key={i} className={`flex gap-2 p-2 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.inputBg }}>
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

          <button
            onClick={handleCreate}
            disabled={creating || !freelancer || milestones.every(m => !m.desc || !m.amount)}
            className="w-full py-2.5 rounded-xl bg-[#00D084] text-white text-sm font-semibold hover:bg-[#00a86d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Creating...' : 'Create Escrow'}
          </button>
        </div>
      )}

      {loadingEscrows ? (
        <div className={`text-center py-8 ${p.textMuted}`}>Loading escrows...</div>
      ) : escrows.length === 0 ? (
        <div className={`text-center py-8 ${p.textMuted}`}>No escrows found</div>
      ) : (
        <div className="space-y-3">
          {escrows.map((escrow) => {
            const StatusIcon = statusIcons[escrow.status as keyof typeof statusIcons] || Clock
            return (
              <div key={escrow.id.toString()} className={`p-4 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.cardBg }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${statusColors[escrow.status as keyof typeof statusColors]}`} />
                    <span className={`text-xs font-medium uppercase ${statusColors[escrow.status as keyof typeof statusColors]}`}>
                      {escrow.status}
                    </span>
                  </div>
                  <span className={`text-xs ${p.textMuted} font-mono`}>#{escrow.id.toString()}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className={`flex justify-between ${p.textMain}`}>
                    <span className={p.textMuted}>Freelancer</span>
                    <span className="font-mono text-xs">{escrow.freelancer.slice(0, 6)}...{escrow.freelancer.slice(-4)}</span>
                  </div>
                  <div className={`flex justify-between ${p.textMain}`}>
                    <span className={p.textMuted}>Total</span>
                    <span className="font-mono">{escrow.total.toString()} wei</span>
                  </div>
                  <div className={`flex justify-between ${p.textMain}`}>
                    <span className={p.textMuted}>Released</span>
                    <span className="font-mono">{escrow.released.toString()} wei</span>
                  </div>
                  <div className={`flex justify-between ${p.textMain}`}>
                    <span className={p.textMuted}>Deadline</span>
                    <span className="font-mono text-xs">
                      {new Date(Number(escrow.deadline) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {escrow.status === 'active' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/30">
                    <button
                      onClick={() => submitMilestone(escrow.id, 0, '0x' + '0'.repeat(64))}
                      disabled={submitting}
                      className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => releaseMilestone(escrow.id, 0)}
                      disabled={releasing}
                      className="flex-1 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50"
                    >
                      Release
                    </button>
                    <button
                      onClick={() => dispute(escrow.id)}
                      disabled={disputing}
                      className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Dispute
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
