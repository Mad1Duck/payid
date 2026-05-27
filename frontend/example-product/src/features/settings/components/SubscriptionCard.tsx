import { motion } from 'framer-motion'
import { Crown, Zap } from 'lucide-react'
import PremiumButton from '@/components/v4/PremiumButton'

interface Props {
  p: any
  sub: any
  daysLeft: string
  price: any
  subscribe: (price: any) => void
  subPending: boolean
}

export function SubscriptionCard({ p, sub, daysLeft, price, subscribe, subPending }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      whileHover={{ scale: 1.01 }}
      className="rounded-2xl p-5 relative backdrop-blur-20 overflow-hidden"
      style={{
        background: sub?.isActive
          ? 'rgba(0,208,132,0.08)'
          : p.glass.bg,
        border: p.glass.border,
      }}
    >
      <div className="relative flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sub?.isActive ? 'bg-[#00D084]/10' : 'bg-[#F59E0B]/10'}`}
        >
          {sub?.isActive ? (
            <Crown className="w-6 h-6 text-[#00D084]" />
          ) : (
            <Zap className="w-6 h-6 text-[#F59E0B]" />
          )}
        </div>
        <div className="flex-1">
          <div className={`text-sm font-semibold ${p.textMain}`}>
            {sub?.isActive ? 'Pro Subscription' : 'Free Tier'}
          </div>
          <div className={`text-xs ${p.textMuted}`}>
            {sub?.isActive
              ? `${daysLeft} days remaining · ${sub.logicalRuleCount} / ${sub.maxSlots} slots`
              : `${sub?.logicalRuleCount ?? 0} / 1 slot · upgrade for 3 slots`}
          </div>
        </div>
        {!sub?.isActive ? (
          <PremiumButton
            onClick={() => subscribe(price)}
            disabled={subPending}
            isLoading={subPending}
            size="sm"
          >
            Upgrade
          </PremiumButton>
        ) : (
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00D084]/10 text-[#00D084]">
            Active
          </span>
        )}
      </div>
    </motion.div>
  )
}
