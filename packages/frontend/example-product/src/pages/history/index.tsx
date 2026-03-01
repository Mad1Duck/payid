import { ArrowLeft, Filter, Search } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { PaymentCard } from '@/components/PaymentCard'
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
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredData = historyData
    .map((group) => ({
      ...group,
      payments: group.payments.filter((payment) => {
        const matchesFilter = filter === 'all' || payment.status === filter
        const matchesSearch =
          searchQuery === '' ||
          payment.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
          payment.amount.toString().includes(searchQuery)
        return matchesFilter && matchesSearch
      }),
    }))
    .filter((group) => group.payments.length > 0)

  const filterOptions: Array<{ value: FilterType; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'allowed', label: 'Allowed' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <header className="flex items-center gap-4 py-4">
          <button className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              Activity History
            </h1>
            <p className="text-sm text-muted-foreground">
              All payment attempts
            </p>
          </div>
        </header>

        {/* Search */}
        <div className="mt-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by sender or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-12 pl-12 pr-4 rounded-2xl',
              'bg-card border border-border/50',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
              'transition-all duration-200',
            )}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                filter === option.value
                  ? 'bg-primary text-primary-foreground shadow-soft-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="mt-6 space-y-6 pb-6">
          {filteredData.length > 0 ? (
            filteredData.map((group, groupIndex) => (
              <div key={groupIndex} className="animate-fade-in">
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {format(group.date, 'EEEE, MMM d')}
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Payments */}
                <div className="space-y-3 ml-4 pl-4 border-l border-border/50">
                  {group.payments.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <PaymentCard
                        {...payment}
                        // onClick={() => navigate(`/verify?id=${payment.id}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No payments found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}
