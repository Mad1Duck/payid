import { useState } from 'react'
import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useV4Palette } from '@/components/v4/theme'
import { TABS, BatchPay, Recurring, Escrow, Vesting } from '@/features/tools'

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
        {activeTab === 'batch' && <BatchPay />}
        {activeTab === 'recurring' && <Recurring />}
        {activeTab === 'escrow' && <Escrow />}
        {activeTab === 'vesting' && <Vesting />}
      </motion.div>
    </div>
  )
}
