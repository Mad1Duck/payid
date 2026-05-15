import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Search } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useV4Palette } from './theme'
import { SkeletonCard } from './Skeleton'
import { useTxHistory, relativeTime } from '@/hooks/useTxHistory'

/* Avatar with initials */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase()
  const bg = useMemo(() => {
    const colors = [
      '#00D084',
      '#0EA5E9',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }, [name])

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}

export default function HistoryPage() {
  const p = useV4Palette()
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all')
  const [search, setSearch] = useState('')
  const { txs } = useTxHistory()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 500)
    return () => clearTimeout(t)
  }, [])

  const filteredTxs = useMemo(() => {
    let filtered =
      activeTab === 'all' ? txs : txs.filter((tx) => tx.type === activeTab)
    if (search) {
      filtered = filtered.filter(
        (tx) =>
          (tx.to || tx.from).toLowerCase().includes(search.toLowerCase()) ||
          tx.id.toLowerCase().includes(search.toLowerCase()),
      )
    }
    return filtered
  }, [activeTab, search, txs])

  const totalSent = txs
    .filter((t) => t.type === 'sent')
    .reduce((a, t) => a + parseFloat(t.amount), 0)
  const totalReceived = txs
    .filter((t) => t.type === 'received')
    .reduce((a, t) => a + parseFloat(t.amount), 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>History</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          All transactions via PAY.ID
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          }}
        >
          <div className="relative z-10">
            <div className="text-white/80 text-xs font-medium mb-1">
              Total Sent
            </div>
            <div className="text-2xl font-bold text-white">
              ${totalSent.toFixed(2)}
            </div>
          </div>
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #00D084 0%, #00B86E 100%)',
          }}
        >
          <div className="relative z-10">
            <div className="text-white/80 text-xs font-medium mb-1">
              Total Received
            </div>
            <div className="text-2xl font-bold text-white">
              ${totalReceived.toFixed(2)}
            </div>
          </div>
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        </motion.div>
      </div>

      {/* Search + Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="space-y-3"
      >
        <div
          className={`flex items-center gap-2 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
        >
          <Search className="w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent text-sm ${p.textMain} placeholder-[#64748B] focus:outline-none`}
          />
        </div>

        <div className="flex items-center gap-1">
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'received' as const, label: 'Incoming' },
            { key: 'sent' as const, label: 'Outgoing' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#00D084]/10 text-[#00D084]'
                  : `${p.textMuted} hover:${p.textSecondary}`
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-black/5 transition-colors cursor-pointer">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </motion.div>

      {/* Transaction List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div
          className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`}
        />
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + search}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {!mounted && (
                <div className="space-y-1">
                  {[...Array(4)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}
              {mounted &&
                filteredTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${p.cardHover}`}
                  >
                    <Avatar
                      name={tx.type === 'sent' ? tx.to : tx.from}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${p.textMain}`}>
                        {tx.type === 'sent'
                          ? `Sent to ${tx.to}`
                          : `Received from ${tx.from}`}
                      </div>
                      <div className={`text-xs ${p.textMuted} font-mono`}>
                        {tx.id}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${tx.type === 'sent' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#00D084]/10 text-[#00D084]'}`}
                        >
                          {tx.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-mono font-semibold ${tx.type === 'sent' ? 'text-[#EF4444]' : 'text-[#00D084]'}`}
                      >
                        {tx.type === 'sent' ? '−' : '+'}
                        {tx.amount} {tx.asset}
                      </div>
                      <div className={`text-xs ${p.textMuted}`}>
                        {relativeTime(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              {mounted && filteredTxs.length === 0 && (
                <div className="text-center py-8">
                  <div className={`text-sm ${p.textMuted}`}>
                    {!isConnected
                      ? 'Connect your wallet to see transaction history.'
                      : search
                        ? 'No transactions match your search.'
                        : 'No transactions yet. Send your first payment!'}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
