import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl module-card btn-tactile',
        'text-left group relative overflow-hidden',
      )}
    >
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-full group-hover:translate-x-full" />

      {/* Icon */}
      <div
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
          isIncoming
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-slate-100 border border-slate-200',
        )}
      >
        {isIncoming ? (
          <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
        ) : (
          <ArrowUpRight className="w-5 h-5 text-slate-600" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground text-sm truncate">
            {isIncoming ? sender : recipient}
          </span>
          <StatusBadge status={status} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex items-center gap-2 shrink-0">
        <div>
          <p
            className={cn(
              'font-bold text-sm',
              isIncoming ? 'text-emerald-600' : 'text-foreground',
            )}
          >
            {isIncoming ? '+' : '-'}
            {amount} {token}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
      </div>
    </motion.button>
  )
}
