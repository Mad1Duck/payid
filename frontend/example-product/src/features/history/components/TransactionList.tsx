import { motion, AnimatePresence } from 'framer-motion'
import { SkeletonCard } from '@/components/v4/Skeleton'
import { Avatar } from '@/features/shared/components/Avatar'

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
  p: any
  mounted: boolean
  filteredTxs: TxRecord[]
  activeTab: string
  search: string
  isConnected: boolean
  relativeTime: (ts: number) => string
}

export function TransactionList({ p, mounted, filteredTxs, activeTab, search, isConnected, relativeTime }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl p-5 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
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
  )
}
