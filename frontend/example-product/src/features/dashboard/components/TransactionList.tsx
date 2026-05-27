import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { SkeletonCard } from '@/components/v4/Skeleton'
import { Avatar } from '@/features/shared/components/Avatar'
import { formatNumber } from '@/lib/utils'

interface TxRecord {
  id: string
  type: 'sent' | 'received'
  to: string
  from: string
  amount: string
  asset: string
  timestamp: number
}

interface Props {
  filteredTx: TxRecord[]
  txMounted: boolean
  isConnected: boolean
  activeTab: 'all' | 'incoming' | 'outgoing'
  setActiveTab: (tab: 'all' | 'incoming' | 'outgoing') => void
  relativeTime: (ts: number) => string
  p: any
}

const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'incoming' as const, label: 'Incoming' },
  { key: 'outgoing' as const, label: 'Outgoing' },
]

export function TransactionList({ filteredTx, txMounted, isConnected, activeTab, setActiveTab, relativeTime, p }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl p-5 relative"
      style={{ background: p.cardBg }}
    >
      <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#00D084]/10 text-[#00D084]'
                    : `${p.textMuted} hover:${p.textSecondary}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-black/5 transition-colors">
            Export CSV
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {!txMounted && (
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}
            {txMounted && filteredTx.length === 0 && (
              <div className={`text-center py-8 text-sm ${p.textMuted}`}>
                {isConnected ? 'No transactions yet. Send your first payment!' : 'Connect wallet to see transactions.'}
              </div>
            )}
            {filteredTx.map((tx) => (
              <div
                key={tx.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${p.cardHover}`}
              >
                <Avatar name={tx.type === 'sent' ? tx.to : tx.from} size={36} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${p.textMain}`}>
                    {tx.type === 'sent' ? `Sent to ${tx.to}` : `Received from ${tx.from}`}
                  </div>
                  <div className={`text-xs ${p.textMuted} font-mono`}>{tx.id}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        tx.type === 'sent' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#00D084]/10 text-[#00D084]'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-mono font-semibold ${
                      tx.type === 'sent' ? 'text-[#EF4444]' : 'text-[#00D084]'
                    }`}
                  >
                    {tx.type === 'sent' ? '−' : '+'}
                    {formatNumber(parseFloat(tx.amount), 4)} {tx.asset}
                  </div>
                  <div className={`text-xs ${p.textMuted}`}>{relativeTime(tx.timestamp)}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 text-center">
          <Link
            to="/v4/app/history"
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium ${p.textSecondary} hover:bg-black/5 transition-colors`}
          >
            See all activities
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
