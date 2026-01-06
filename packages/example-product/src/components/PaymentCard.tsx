import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'

interface PaymentCardProps {
  id: string
  amount: number
  token: string
  status: 'allowed' | 'rejected' | 'pending'
  type: 'incoming' | 'outgoing'
  sender?: string
  recipient?: string
  timestamp: Date
  onClick?: () => void
}

export function PaymentCard({
  amount,
  token,
  status,
  type,
  sender,
  recipient,
  timestamp,
  onClick,
}: PaymentCardProps) {
  const isIncoming = type === 'incoming'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50',
        'transition-all duration-200 hover:shadow-soft-md hover:border-border',
        'text-left group',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          isIncoming ? 'bg-success-muted' : 'bg-secondary',
        )}
      >
        {isIncoming ? (
          <ArrowDownLeft className="w-5 h-5 text-success" />
        ) : (
          <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">
            {isIncoming ? sender : recipient}
          </span>
          <StatusBadge status={status} size="sm" />
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex items-center gap-2">
        <div>
          <p
            className={cn(
              'font-semibold',
              isIncoming ? 'text-success' : 'text-foreground',
            )}
          >
            {isIncoming ? '+' : '-'}
            {amount} {token}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}
