import AgentHeader from '../components/AgentHeader'
import AgentStatusAlerts from '../components/AgentStatusAlerts'
import AgentInfoBar from '../components/AgentInfoBar'
import AgentSelector from '../components/AgentSelector'
import AgentPolicyPanel from '../components/AgentPolicyPanel'
import AgentChatPanel from '../components/AgentChatPanel'
import AgentDecisionPanel from '../components/AgentDecisionPanel'
import { useAgentPayID } from '../hooks/useAgentPayID'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentPayIDPage() {
  const s = useAgentPayID()

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <AgentHeader />
      <AgentStatusAlerts hasApiKey={s.hasApiKey} isConnected={s.isConnected} isWrongChain={s.isWrongChain} />
      <AgentInfoBar s={s} />
      <AgentSelector s={s} />
      <AgentPolicyPanel s={s} />
      <AgentChatPanel s={s} />
      <AgentDecisionPanel s={s} />
    </div>
  )
}
