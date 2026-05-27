import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Link } from '@tanstack/react-router'
import { useReputation, useVranConfig, useCanReport } from 'payid-react'
import { shortAddr } from '@/features/shared'
import { useV4Palette } from '@/components/v4/theme'
import { Star, ShieldAlert, Search, Shield, ShieldCheck, ShieldX, Info, ChevronRight } from 'lucide-react'
import { ReportList } from '../components/ReportList'

export function ReputationPage() {
  const { address } = useAccount()
  const [searchInput, setSearchInput] = useState('')
  const [targetAddress, setTargetAddress] = useState<`0x${string}` | undefined>(address)
  const p = useV4Palette()

  const { score, isBlacklisted, isTrusted, isLoading } = useReputation({ target: targetAddress })
  const { minStake, consensusThreshold, minReporterReputation } = useVranConfig({})
  const { canReport, score: myScore } = useCanReport({})

  const isViewingOwn = targetAddress === address

  const handleSearch = () => {
    const val = searchInput.trim()
    if (val.startsWith('0x') && val.length === 42) {
      setTargetAddress(val as `0x${string}`)
      setSearchInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const resetToOwn = () => {
    setTargetAddress(address)
    setSearchInput('')
  }

  const tier = (() => {
    if (isBlacklisted) return { label: 'Blacklisted', color: '#EF4444', desc: 'Blocked from receiving payments', icon: ShieldX }
    if (isTrusted)     return { label: 'Trusted', color: '#00D084', desc: 'Verified trusted address', icon: ShieldCheck }
    if (score >= 700)  return { label: 'Excellent', color: '#0EA5E9', desc: 'Highly reputable', icon: ShieldCheck }
    if (score >= 500)  return { label: 'Good', color: '#F59E0B', desc: 'Established reputation', icon: Shield }
    if (score >= 100)  return { label: 'Active', color: '#64748B', desc: 'Building reputation', icon: Shield }
    return               { label: 'New', color: '#64748B', desc: 'No history yet', icon: Shield }
  })()

  const TierIcon = tier.icon

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Reputation</h1>
        <p className={`text-sm ${p.textMuted}`}>Check VRAN on-chain reputation scores</p>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-4"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${p.textMuted}`} />
            <input
              type="text"
              placeholder="Enter 0x address to look up..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full pl-10 pr-4 py-3 rounded-xl bg-transparent ${p.textMain} placeholder-gray-500 focus:outline-none text-sm`}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchInput.startsWith('0x') || searchInput.length !== 42}
            className="px-5 py-3 bg-[#00D084] hover:bg-[#00B86E] text-[#0B0F1A] rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
        {!isViewingOwn && address && (
          <button onClick={resetToOwn} className={`mt-2 text-xs ${p.textMuted} hover:text-[#00D084] transition-colors`}>
            ← Back to my address
          </button>
        )}
      </motion.div>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className={`text-xs font-medium ${p.textMuted} mb-1`}>
              {isViewingOwn ? 'Your Reputation Score' : `Score for ${targetAddress ? shortAddr(targetAddress) : '—'}`}
            </div>
            {isLoading ? (
              <div className={`text-5xl font-bold ${p.textMain}`}>…</div>
            ) : (
              <div className="text-5xl font-bold" style={{ color: tier.color }}>{score}</div>
            )}
            <div className={`text-xs ${p.textMuted} mt-1`}>out of 1000</div>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{ background: `${tier.color}18`, border: `1px solid ${tier.color}30` }}
          >
            <TierIcon className="w-4 h-4" style={{ color: tier.color }} />
            <div>
              <div className="text-sm font-bold" style={{ color: tier.color }}>{tier.label}</div>
              <div className={`text-xs ${p.textMuted}`}>{tier.desc}</div>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: `${tier.color}20` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((score / 1000) * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              className="h-full rounded-full"
              style={{ background: tier.color }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: `${tier.color}80` }}>
            <span>0</span>
            <span>100 can report</span>
            <span>700 can confirm</span>
            <span>1000</span>
          </div>
        </div>
      </motion.div>

      {/* My Status (only when viewing others) */}
      {!isViewingOwn && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-4"
          style={{ background: p.glass.bg, border: p.glass.border }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs ${p.textMuted}`}>Your Reputation</div>
              <div className={`text-xl font-bold ${p.textMain}`}>{myScore}</div>
            </div>
            <div
              className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                canReport ? 'bg-[#00D084]/10 text-[#00D084]' : 'bg-[#EF4444]/10 text-[#EF4444]'
              }`}
            >
              {canReport ? 'Can Report' : 'Need 100+ rep'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3"
      >
        <Link to="/v4/app/reputation/report" className="contents">
          <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-bold transition-colors cursor-pointer">
            <ShieldAlert className="w-4 h-4" />
            Report Address
          </button>
        </Link>
        <Link to="/v4/app/reputation/report" hash="confirm" className="contents">
          <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-bold transition-colors cursor-pointer">
            <ShieldCheck className="w-4 h-4" />
            Confirm Report
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
        </Link>
      </motion.div>

      {/* VRAN Config Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl p-5"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Info className={`w-4 h-4 ${p.textMuted}`} />
          <span className={`text-sm font-semibold ${p.textMain}`}>VRAN Network Rules</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-lg font-bold ${p.textMain}`}>{(Number(minStake) / 1e18).toFixed(3)}</div>
            <div className={`text-xs ${p.textMuted}`}>ETH to Report</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${p.textMain}`}>{Number(minReporterReputation)}</div>
            <div className={`text-xs ${p.textMuted}`}>Rep to Confirm</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${p.textMain}`}>{Number(consensusThreshold)}</div>
            <div className={`text-xs ${p.textMuted}`}>Confirms Needed</div>
          </div>
        </div>
      </motion.div>

      {/* Reports Against This Address */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <ReportList target={targetAddress} />
      </motion.div>
    </div>
  )
}
