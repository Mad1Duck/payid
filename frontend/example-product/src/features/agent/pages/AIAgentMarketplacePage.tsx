import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  useAllUserAIAgents,
  useUserAIAgent,
  useIsUserAIAgent,
  useEffectiveAgentRule,
  useActiveCombinedRule,
  usePreferredAgent,
} from 'payid-react'
import { Bot, Cpu, Crown, Loader2, Plug, User } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { shortAddr } from '@/features/shared/utils/address'
import { AgentCard, SubscribeModal, RegisterAgentForm } from '@/features/agent'

export default function UserAIAgentsPage() {
  const p = useV4Palette()
  const { address, isConnected } = useAccount()
  const { data: agents, isLoading } = useAllUserAIAgents()
  const { data: isAgent } = useIsUserAIAgent(address)
  const { data: myRule } = useActiveCombinedRule(address)
  const { data: effectiveAgentRule } = useEffectiveAgentRule(address)
  const { data: preferredAgent } = usePreferredAgent(address)
  const { data: preferredAgentData } = useUserAIAgent(preferredAgent)

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  const selected = agents?.find((a) => a.owner.toLowerCase() === selectedAgent?.toLowerCase())

  const card = `rounded-2xl border ${p.cardBorder}`

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className={`text-2xl font-bold ${p.textMain} flex items-center gap-2`}>
              <Cpu className="w-6 h-6 text-[#00D084]" />
              My AI Agents
            </h1>
            <p className={`text-sm ${p.textMuted} mt-0.5`}>
              Register and manage your own AI agents with PAY.ID policies.
            </p>
          </div>
          {isConnected && (
            <div className="flex flex-col gap-2 items-end">
              {!isAgent && (
                <button
                  onClick={() => setShowRegister(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D084] text-white text-xs font-semibold hover:bg-[#00D084]/90 transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Register Agent
                </button>
              )}
              {isAgent && (
                <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084] text-xs font-semibold">
                  <Crown className="w-3.5 h-3.5" />
                  You are an Agent
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Active Agents',
                value: agents?.length?.toString() ?? '0',
                color: '#00D084',
              },
              {
                label: 'My Policy',
                value: myRule?.hash ? 'Own' : effectiveAgentRule?.ruleSetHash ? 'Agent' : 'None',
                color: myRule?.hash || effectiveAgentRule?.ruleSetHash ? '#00D084' : '#F59E0B',
              },
              {
                label: 'Preferred Agent',
                value: preferredAgentData?.handle ?? 'None',
                color: preferredAgent ? '#00D084' : '#64748B',
              },
            ].map((s) => (
              <div key={s.label} className={`${card} p-4`} style={{ backgroundColor: p.cardBg }}>
                <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className={`text-[11px] mt-0.5 ${p.textMuted}`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect prompt */}
      {!isConnected && (
        <div className={`${card} p-6 flex items-center gap-3`} style={{ backgroundColor: p.cardBg }}>
          <User className={`w-5 h-5 shrink-0 ${p.textMuted}`} />
          <p className={`text-sm ${p.textMuted}`}>Connect your wallet to browse AI agents and manage subscriptions.</p>
        </div>
      )}

      {/* Register Form */}
      <AnimatePresence>
        {showRegister && (
          <RegisterAgentForm onDone={() => setShowRegister(false)} />
        )}
      </AnimatePresence>

      {/* Effective Rule Banner */}
      {isConnected && effectiveAgentRule?.ruleSetHash && effectiveAgentRule.ruleSetHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
        <div className={`${card} p-4 flex items-center gap-3`} style={{ backgroundColor: p.cardBg, borderColor: '#00D08440' }}>
          <Plug className="w-5 h-5 text-[#00D084]" />
          <div className="flex-1">
            <p className={`text-sm ${p.textMain} font-medium`}>
              Using agent rule from @{preferredAgentData?.handle ?? shortAddr(preferredAgent ?? '')}
            </p>
            <p className={`text-xs ${p.textMuted}`}>
              Rule: {shortAddr(effectiveAgentRule.ruleSetHash)}
            </p>
          </div>
        </div>
      )}

      {/* Agent List */}
      {isConnected && (
        <div className="space-y-3">
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${p.textMuted}`}>Available Agents</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-6 h-6 animate-spin ${p.textMuted}`} />
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="space-y-2">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.owner}
                  agent={agent}
                  onSelect={() =>
                    setSelectedAgent((prev) => (prev === agent.owner ? null : agent.owner))
                  }
                  isSelected={selectedAgent === agent.owner}
                />
              ))}
            </div>
          ) : (
            <div className={`${card} p-8 text-center`} style={{ backgroundColor: p.cardBg }}>
              <Bot className={`w-8 h-8 mx-auto mb-2 ${p.textMuted} opacity-50`} />
              <p className={`text-sm ${p.textMuted}`}>No AI agents registered yet.</p>
              <p className={`text-xs ${p.textMuted} mt-1`}>Be the first to register your agent.</p>
            </div>
          )}
        </div>
      )}

      {/* Subscribe Modal */}
      <AnimatePresence>
        {selected && (
          <SubscribeModal agent={selected} onClose={() => setSelectedAgent(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
