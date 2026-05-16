import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import {
  useAgentSubscriptionPrice,
  useIsSubscribedToAgent,
  useAgentSubscription,
  useSubscribeToAgent,
  useSetPreferredAgent,
  usePreferredAgent,
} from 'payid-react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  XCircle,
  Zap,
} from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import type { Agent } from '../types/agent'

interface SubscribeModalProps {
  agent: Agent
  onClose: () => void
}

export function SubscribeModal({ agent, onClose }: SubscribeModalProps) {
  const p = useV4Palette()
  const { address } = useAccount()
  const { data: price } = useAgentSubscriptionPrice()
  const { data: isSubscribed } = useIsSubscribedToAgent(
    address,
    agent.owner as `0x${string}`,
  )
  const { data: subInfo } = useAgentSubscription(
    address,
    agent.owner as `0x${string}`,
  )
  const { subscribeToAgent, isPending, isSuccess } = useSubscribeToAgent()
  const { setPreferredAgent } = useSetPreferredAgent()
  const { data: preferredAgent } = usePreferredAgent(address)

  const isPreferred = preferredAgent?.toLowerCase() === agent.owner.toLowerCase()

  const handleSubscribe = () => {
    if (!price) return
    subscribeToAgent({
      agent: agent.owner as `0x${string}`,
      value: price,
    })
  }

  const handleSetPreferred = () => {
    setPreferredAgent(agent.owner as `0x${string}`)
  }

  if (isSuccess) {
    toast.success('Subscribed!', {
      description: `You are now subscribed to ${agent.name}`,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${p.cardBorder} border rounded-2xl p-6 space-y-4`}
      style={{ backgroundColor: p.cardBg }}
    >
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${p.textMain}`}>Subscribe to {agent.name}</h3>
        <button onClick={onClose} className={`p-1 rounded-lg ${p.cardHover}`}>
          <XCircle className={`w-5 h-5 ${p.textMuted}`} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: p.bgElevated }}>
          <span className={`text-sm ${p.textMuted}`}>Price</span>
          <span className={`font-medium ${p.textMain}`}>
            {price ? `${formatEther(price)} ETH` : 'Loading...'}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: p.bgElevated }}>
          <span className={`text-sm ${p.textMuted}`}>Duration</span>
          <span className={`font-medium ${p.textMain}`}>30 Days</span>
        </div>
        {isSubscribed && !!subInfo?.expiry && (
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: p.bgElevated }}>
            <span className={`text-sm ${p.textMuted}`}>Current Expiry</span>
            <span className={`font-medium ${p.textMain}`}>
              {new Date(Number(subInfo.expiry) * 1000).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubscribe}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D084] text-white font-medium text-sm hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CircleDollarSign className="w-4 h-4" />
          )}
          {isSubscribed ? 'Extend Subscription' : 'Subscribe'}
        </button>
        {isSubscribed && !isPreferred && (
          <button
            onClick={handleSetPreferred}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#00D084]/30 text-[#00D084] font-medium text-sm hover:bg-[#00D084]/10 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Set Preferred
          </button>
        )}
        {isPreferred && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D084]/10 text-[#00D084] font-medium text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Preferred
          </div>
        )}
      </div>
    </motion.div>
  )
}
