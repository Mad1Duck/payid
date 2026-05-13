import { ArrowLeft, Filter, Search } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Link } from '@tanstack/react-router'
import { PaymentCard } from '@/components/PaymentCard'
import { WalletButton } from '@/components/WalletButton'
import { MobileLayout } from '@/components/Layouts/MobileLayout'
import { cn } from '@/lib/utils'

// Mock history data grouped by date
const historyData = [
  {
    date: new Date(),
    payments: [
      {
        id: '1',
        amount: 250,
        token: 'USDC',
        status: 'allowed' as const,
        type: 'incoming' as const,
        sender: 'alice.pay.id',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        id: '2',
        amount: 50,
        token: 'USDC',
        status: 'rejected' as const,
        type: 'incoming' as const,
        sender: 'unknown.sender',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ],
  },
  {
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    payments: [
      {
        id: '3',
        amount: 1000,
        token: 'USDC',
        status: 'allowed' as const,
        type: 'incoming' as const,
        sender: 'company.pay.id',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: '4',
        amount: 75,
        token: 'ETH',
        status: 'rejected' as const,
        type: 'incoming' as const,
        sender: 'random.pay.id',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
    ],
  },
  {
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    payments: [
      {
        id: '5',
        amount: 500,
        token: 'USDC',
        status: 'allowed' as const,
        type: 'incoming' as const,
        sender: 'friend.pay.id',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
      {
        id: '6',
        amount: 2000,
        token: 'USDT',
        status: 'allowed' as const,
        type: 'incoming' as const,
        sender: 'business.pay.id',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50),
      },
    ],
  },
]

type FilterType = 'all' | 'allowed' | 'rejected'

export default function History() {
  const { address, isConnected } = useAccount()
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredData =
    filter === 'all'
      ? historyData
      : historyData.map((group) => ({
          ...group,
          payments: group.payments.filter((p) => p.status === filter),
        }))

  const filterOptions: Array<{ label: string; value: FilterType }> = [
    { label: 'All', value: 'all' },
    { label: 'Allowed', value: 'allowed' },
    { label: 'Rejected', value: 'rejected' },
  ]

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 py-4"
        >
          <Link to="/">
            <button className="btn-tactile p-2.5 -ml-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Activity History
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet'}
            </p>
          </div>
          <WalletButton />
        </motion.header>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-2 relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by sender or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-12 pl-12 pr-4 rounded-xl',
              'bg-white border border-slate-200',
              'text-foreground placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
              'transition-all duration-200',
            )}
          />
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-4 flex gap-2"
        >
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 btn-tactile',
                filter === option.value
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {option.label}
            </button>
          ))}
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6 space-y-6 pb-6"
        >
          {filteredData.length > 0 ? (
            filteredData.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="text-sm font-semibold text-slate-600">
                    {format(group.date, 'EEEE, MMM d')}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Payments */}
                <div className="space-y-3 ml-4 pl-4 border-l border-slate-200">
                  {group.payments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      {...payment}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Filter className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No payments found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  )
}
