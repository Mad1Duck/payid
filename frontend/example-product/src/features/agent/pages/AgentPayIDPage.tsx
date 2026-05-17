import { Wallet } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import AgentHeader from '../components/AgentHeader'
import AgentStatusAlerts from '../components/AgentStatusAlerts'
import AgentInfoBar from '../components/AgentInfoBar'
import AgentSelector from '../components/AgentSelector'
import AgentPolicyPanel from '../components/AgentPolicyPanel'
import AgentChatPanel from '../components/AgentChatPanel'
import AgentDecisionPanel from '../components/AgentDecisionPanel'
import AgentChatFlow from '../components/AgentChatFlow'
import { useAgentPayID } from '../hooks/useAgentPayID'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentPayIDPage() {
  const s = useAgentPayID()
  const p = useV4Palette()
  const card = `rounded-2xl border ${p.cardBorder}`

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <AgentHeader />
      
      {!s.isConnected ? (
        <div className={`${card} p-6 flex items-center gap-3`} style={{ backgroundColor: p.cardBg }}>
          <Wallet className={`w-5 h-5 shrink-0 ${p.textMuted}`} />
          <p className={`text-sm ${p.textMuted}`}>
            Connect your wallet to interact with your AI Agent and manage policy guardrails.
          </p>
        </div>
      ) : (
        <>
          <AgentStatusAlerts hasApiKey={s.hasApiKey} isConnected={s.isConnected} isWrongChain={s.isWrongChain} />
          <AgentInfoBar s={s} />
          <AgentSelector s={s} />
          <AgentPolicyPanel s={s} />
          <AgentChatPanel s={s} />
          <AgentChatFlow s={s} />
          <AgentDecisionPanel s={s} />
        </>
      )}
    </div>
  )
}
