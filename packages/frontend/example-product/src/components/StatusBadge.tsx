import { Check, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'allowed' | 'rejected' | 'pending'

interface StatusBadgeProps {
  status: Status
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const statusConfig = {
  allowed: {
    label: 'Allowed',
    className: 'status-allowed',
    icon: Check,
  },
  rejected: {
    label: 'Rejected',
    className: 'status-rejected',
    icon: X,
  },
  pending: {
    label: 'Pending',
    className: 'status-pending',
    icon: Clock,
  },
}

const sizeConfig = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
}

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        config.className,
        sizeConfig[size],
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            size === 'sm'
              ? 'w-3 h-3'
              : size === 'md'
                ? 'w-3.5 h-3.5'
                : 'w-4 h-4',
          )}
        />
      )}
      {config.label}
    </span>
  )
}
