import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  useAgentCombinedRule,
  useIsSubscribedToAgent,
  useAgentSubscription,
} from 'payid-react'
import {
  Brain,
  ChevronRight,
  Cpu,
  Plug,
  Shield,
  Star,
} from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { shortAddr } from '@/features/shared/utils/address'
import type { Agent } from '../types/agent'

interface AgentCardProps {
  agent: Agent
  onSelect: () => void
  isSelected: boolean
}

export function AgentCard({ agent, onSelect, isSelected }: AgentCardProps) {
  const p = useV4Palette()
  const { address } = useAccount()
  const { data: ruleInfo } = useAgentCombinedRule(agent.owner as `0x${string}`)
  const { data: isSubscribed } = useIsSubscribedToAgent(
    address,
    agent.owner as `0x${string}`,
  )
  const { data: subInfo } = useAgentSubscription(
    address,
    agent.owner as `0x${string}`,
  )
  const isOwner = address?.toLowerCase() === agent.owner.toLowerCase()

  const card = `rounded-2xl border ${p.cardBorder} transition-all cursor-pointer hover:shadow-lg`

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`${card} p-5 ${isSelected ? 'ring-2 ring-[#00D084]/50' : ''}`}
      style={{ backgroundColor: p.cardBg }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#00D084]/10 flex items-center justify-center shrink-0">
          <Brain className="w-6 h-6 text-[#00D084]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${p.textMain}`}>{agent.name}</h3>
            {agent.verified && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium">
                VERIFIED
              </span>
            )}
            {isOwner && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium">
                YOU
              </span>
            )}
            {!agent.active && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">
                INACTIVE
              </span>
            )}
          </div>
          <p className={`text-xs ${p.textMuted} mt-0.5`}>
            @{agent.handle} · {shortAddr(agent.owner)}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[#F59E0B]" />
              <span className={`text-xs ${p.textMuted}`}>
                {Number(agent.reputationScore)}
              </span>
            </div>
            {Number(agent.totalInferences) > 0 && (
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-[#0EA5E9]" />
                <span className={`text-xs ${p.textMuted}`}>
                  {Number(agent.totalInferences)} inferences
                </span>
              </div>
            )}
            {ruleInfo?.active && (
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#00D084]" />
                <span className={`text-xs ${p.textMuted}`}>Has Rule</span>
              </div>
            )}
            {isSubscribed && (
              <div className="flex items-center gap-1">
                <Plug className="w-3 h-3 text-[#00D084]" />
                <span className={`text-xs ${p.textMuted}`}>
                  {subInfo?.active && !!subInfo?.expiry && subInfo.expiry > BigInt(Math.floor(Date.now() / 1000))
                    ? 'Active'
                    : 'Expired'}
                </span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#00D084]' : p.textMuted}`}
        />
      </div>
    </motion.div>
  )
}
