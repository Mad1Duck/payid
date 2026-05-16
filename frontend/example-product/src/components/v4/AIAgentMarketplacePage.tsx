import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import {
  useAllUserAIAgents,
  useUserAIAgent,
  useIsUserAIAgent,
  useRegisterUserAIAgent,
  useAgentCombinedRule,
  useIsSubscribedToAgent,
  useAgentSubscription,
  usePreferredAgent,
  useEffectiveAgentRule,
  useAgentSubscriptionPrice,
  useSubscribeToAgent,
  useSetPreferredAgent,
  useActiveCombinedRule,
} from 'payid-react'
import { toast } from 'sonner'
import {
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Crown,
  Loader2,
  Plug,
  Shield,
  Star,
  User,
  XCircle,
  Zap,
} from 'lucide-react'
import { useV4Palette } from './theme'

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

/* ── Agent Card ─────────────────────────────────────────────────────── */

function AgentCard({
  agent,
  onSelect,
  isSelected,
}: {
  agent: {
    owner: string
    handle: string
    name: string
    metadataURI: string
    modelType: string
    computeProvider: string
    computeEndpoint: string
    registeredAt: bigint
    active: boolean
    verified: boolean
    reputationScore: bigint
    totalInferences: bigint
    lastActiveAt: bigint
  }
  onSelect: () => void
  isSelected: boolean
}) {
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

/* ── Subscribe Modal ──────────────────────────────────────────────── */

function SubscribeModal({
  agent,
  onClose,
}: {
  agent: {
    owner: string
    handle: string
    name: string
    metadataURI: string
    modelType: string
    computeProvider: string
    computeEndpoint: string
    registeredAt: bigint
    active: boolean
    verified: boolean
    reputationScore: bigint
    totalInferences: bigint
    lastActiveAt: bigint
  }
  onClose: () => void
}) {
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

/* ── Register Agent Form ──────────────────────────────────────────── */

function RegisterAgentForm({ onDone }: { onDone: () => void }) {
  const p = useV4Palette()
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [metadataURI, setMetadataURI] = useState('')
  const [modelType, setModelType] = useState('llama-3')
  const [computeProvider, setComputeProvider] = useState('0g-compute')
  const [computeEndpoint, setComputeEndpoint] = useState('')

  const { registerAgent, isPending, isSuccess } = useRegisterUserAIAgent()

  const handleSubmit = () => {
    if (!handle.trim()) {
      toast.error('Handle is required')
      return
    }
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    registerAgent({
      handle: handle.trim().toLowerCase(),
      name: name.trim(),
      metadataURI: metadataURI.trim() || 'ipfs://placeholder',
      modelType,
      computeProvider,
      computeEndpoint: computeEndpoint.trim() || 'https://compute.0g.ai',
    })
  }

  if (isSuccess) {
    toast.success('Agent registered!')
    onDone()
  }

  const input = `w-full px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${p.cardBorder} border rounded-2xl p-6 space-y-4`}
      style={{ backgroundColor: p.cardBg }}
    >
      <h3 className={`font-semibold ${p.textMain} flex items-center gap-2`}>
        <Bot className="w-5 h-5 text-[#00D084]" />
        Register as AI Agent
      </h3>
      <div className="space-y-3">
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Handle * (unique ID)</label>
          <input className={input} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="e.g. giftbot.0g" maxLength={32} />
        </div>
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Agent Name *</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AlphaTrader" maxLength={64} />
        </div>
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Metadata URI</label>
          <input className={input} value={metadataURI} onChange={(e) => setMetadataURI(e.target.value)} placeholder="ipfs://... or https://..." />
        </div>
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Compute Endpoint (0G Compute URL)</label>
          <input className={input} value={computeEndpoint} onChange={(e) => setComputeEndpoint(e.target.value)} placeholder="https://compute.0g.ai/v1/inference" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Model Type</label>
            <select className={input} value={modelType} onChange={(e) => setModelType(e.target.value)}>
              <option value="llama-3">Llama 3</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude">Claude</option>
              <option value="mistral">Mistral</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Compute Provider</label>
            <select className={input} value={computeProvider} onChange={(e) => setComputeProvider(e.target.value)}>
              <option value="0g-compute">0G Compute</option>
              <option value="replicate">Replicate</option>
              <option value="self-hosted">Self-hosted</option>
              <option value="aws">AWS</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D084] text-white font-medium text-sm hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          Register Agent
        </button>
        <button onClick={onDone} className={`px-4 py-2.5 rounded-xl border ${p.cardBorder} text-sm font-medium ${p.textMuted} hover:${p.textSecondary}`}>
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */

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
