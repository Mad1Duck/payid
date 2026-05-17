import { Bot, ShieldCheck } from 'lucide-react'
import { zeroHash } from 'viem'
import { useV4Palette } from '../theme'
import { shortHash, shortAddr } from '@/features/agent/utils/format'
import type { AgentPayIDState } from './useAgentPayID'

interface Props {
  s: AgentPayIDState
}

export default function AgentInfoBar({ s }: Props) {
  const p = useV4Palette()
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{ background: p.cardBg, border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}` }}
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#8B5CF620' }}>
        <Bot className="w-5 h-5 text-[#8B5CF6]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${p.textMain}`}>
          {s.selectedAgent ? s.selectedAgent.displayName : 'Qwen-2.5-7B-Instruct'}
        </div>
        <div className={`text-xs ${p.textMuted}`}>
          {s.selectedAgent
            ? `AI Agent · ${shortAddr(s.selectedAgent.agentWallet)}`
            : `by 0G Foundation · TeeML · Agent NFT #${s.tokenId}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-[10px] font-mono ${p.textMuted}`}>On-chain policy</div>
        <div className="text-xs text-[#00D084] font-mono">
          {s.agentRuleInfo?.active
            ? shortHash(s.agentRuleInfo.ruleSetHash)
            : s.currentRuleHash && s.currentRuleHash !== zeroHash
            ? shortHash(s.currentRuleHash as string)
            : 'Not linked'}
        </div>
      </div>
    </div>
  )
}
