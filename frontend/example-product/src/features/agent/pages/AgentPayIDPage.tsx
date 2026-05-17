import {
  AgentHeader,
  AgentStatusAlerts,
  AgentInfoBar,
  AgentSelector,
  AgentPolicyPanel,
  AgentChatPanel,
  AgentDecisionPanel,
  useAgentPayID,
} from './agent'

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
