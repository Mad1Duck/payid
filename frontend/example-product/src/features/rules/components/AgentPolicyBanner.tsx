import { Crown, Zap } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

interface Props {
  effectiveAgentRuleHash: string
  preferredAgentInfo: { agent: string; ruleSetHash: string } | null
}

export function AgentPolicyBanner({ effectiveAgentRuleHash, preferredAgentInfo }: Props) {
  const p = useV4Palette()
  const card = `rounded-2xl border ${p.cardBorder}`

  if (!effectiveAgentRuleHash || effectiveAgentRuleHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return null
  }

  return (
    <div className={`${card} p-4`} style={{ backgroundColor: p.cardBg }}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-[#8B5CF6]" />
        <span className={`text-sm font-semibold ${p.textMain}`}>AI Agent Policy Active</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span className={`text-xs ${p.textMuted}`}>
            Preferred Agent: <span className={`font-mono ${p.textMain}`}>{preferredAgentInfo?.agent.slice(0, 10)}…</span>
          </span>
        </div>
        <div className={`text-[10px] font-mono ${p.textMuted} break-all`}>
          Rule: {effectiveAgentRuleHash.slice(0, 20)}…
        </div>
      </div>
    </div>
  )
}
