import { useState } from 'react'
import { Bot, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { shortHash, shortAddr } from '@/features/agent/utils/format'
import { detectStorageProvider, resolveStorageURI } from '@/lib/storage'
import type { AdminAgent } from 'payid-react'
import type { AgentPayIDState } from '../hooks/useAgentPayID'

interface Props {
  s: AgentPayIDState
}

export default function AgentSelector({ s }: Props) {
  const p = useV4Palette()
  const [loadedMetadata, setLoadedMetadata] = useState<string | null>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  if (!s.isConnected) return null

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: p.cardBg, border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-semibold ${p.textMuted}`}>MY AI AGENTS</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.slotsUsed >= s.slotsMax ? 'bg-red-500/10 text-red-500' : 'bg-[#00D084]/10 text-[#00D084]'}`}>
            Slots: {s.slotsUsed}/{s.slotsMax}
          </span>
          {s.subInfo?.expiry != null && s.subInfo.expiry > 0n && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.subInfo.isActive ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
              Exp: {new Date(Number(s.subInfo.expiry) * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        {s.isAdmin && (
          <button
            onClick={() => s.setShowAgentRegister(!s.showAgentRegister)}
            disabled={s.slotsUsed >= s.slotsMax}
            className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-40"
          >
            {s.showAgentRegister ? 'Cancel' : 'Register New'}
          </button>
        )}
      </div>

      {s.showAgentRegister && s.isAdmin && <AgentRegisterForm s={s} />}

      {(s.adminAgents ?? []).length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {(s.adminAgents ?? []).map((agent: AdminAgent, i: number) => (
            <button
              key={agent.agentWallet + i}
              onClick={() => s.setSelectedAgent(agent)}
              className={`shrink-0 w-48 rounded-xl p-3 text-left transition-all border ${
                s.selectedAgent?.agentWallet === agent.agentWallet
                  ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10'
                  : `border-transparent ${p.dark ? 'bg-white/5 hover:bg-white/8' : 'bg-slate-50 hover:bg-slate-100'}`
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8B5CF620' }}>
                  <Bot className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${p.textMain}`}>{agent.displayName}</div>
                  <div className={`text-[10px] font-mono truncate ${p.textMuted}`}>{shortAddr(agent.agentWallet)}</div>
                </div>
              </div>
              <div className={`text-[10px] ${p.textMuted}`}>{shortAddr(agent.publicEndpoint)}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-[#00D084]' : 'bg-amber-500'}`} />
                <span className={`text-[10px] ${agent.active ? 'text-[#00D084]' : 'text-amber-500'}`}>{agent.active ? 'Active' : 'Inactive'}</span>
                {s.selectedAgent?.agentWallet === agent.agentWallet && s.agentRuleInfo?.active && (
                  <span className="ml-auto flex items-center gap-0.5 text-[#00D084]" title="Policy set">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className={`text-xs ${p.textMuted}`}>No admin AI agents registered yet.</p>
      )}

      {/* Selected Agent Detail */}
      {s.selectedAgent && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
          <div className="flex items-center justify-between text-xs">
            <span className={p.textMuted}>Agent Wallet</span>
            <span className={`font-mono font-medium ${p.textMain}`}>{shortAddr(s.selectedAgent.agentWallet)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={p.textMuted}>Display Name</span>
            <span className={`font-medium ${p.textMain}`}>{s.selectedAgent.displayName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={p.textMuted}>Endpoint</span>
            <span className={`font-medium ${p.textMain}`}>{s.selectedAgent.publicEndpoint}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={p.textMuted}>Metadata Hash</span>
            <span className={`font-mono ${p.textMain}`}>{shortHash(s.selectedAgent.metadataHash)}</span>
          </div>
          {s.selectedAgent.encryptedURI && (
            <AgentMetadataLoader agent={s.selectedAgent} loadedMetadata={loadedMetadata} setLoadedMetadata={setLoadedMetadata} isLoadingMetadata={isLoadingMetadata} setIsLoadingMetadata={setIsLoadingMetadata} />
          )}
          <div className="flex items-center justify-between text-xs">
            <span className={p.textMuted}>Published Rule</span>
            <span className={`font-mono ${s.agentRuleInfo?.active ? 'text-[#00D084]' : p.textMuted}`}>
              {s.agentRuleInfo?.active ? shortHash(s.agentRuleInfo.ruleSetHash) : 'Not set'}
            </span>
          </div>
          {s.selectedAgent.owner?.toLowerCase() === s.address?.toLowerCase() && s.activeRuleHash && s.activeRuleHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <button
              onClick={async () => await s.setAgentCombinedRule(s.selectedAgent!.agentWallet, s.activeRuleHash! as `0x${string}`)}
              disabled={s.isSettingRule}
              className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#00D084]/30 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/10 transition-colors disabled:opacity-50"
            >
              {s.isSettingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              Publish Active Combined Rule as Agent Policy
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AgentMetadataLoader({ agent, loadedMetadata, setLoadedMetadata, isLoadingMetadata, setIsLoadingMetadata }: {
  agent: AdminAgent
  loadedMetadata: string | null
  setLoadedMetadata: (s: string | null) => void
  isLoadingMetadata: boolean
  setIsLoadingMetadata: (v: boolean) => void
}) {
  const p = useV4Palette()
  const provider = detectStorageProvider(agent.encryptedURI)
  const providerLabel = provider === '0g' ? '0G Storage' : provider === 'ipfs' ? 'IPFS' : 'External URL'
  const providerColor = provider === '0g' ? 'text-[#8B5CF6]' : provider === 'ipfs' ? 'text-[#00B4D8]' : 'text-orange-400'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={p.textMuted}>Metadata Source</span>
        <span className={`font-mono text-[10px] ${providerColor}`}>{providerLabel}</span>
      </div>
      {(provider === '0g' || provider === 'ipfs') && !loadedMetadata && (
        <button
          onClick={async () => {
            setIsLoadingMetadata(true)
            try {
              const data = await resolveStorageURI(agent.encryptedURI)
              setLoadedMetadata(data)
            } catch (err: any) {
              const msg = err.message || 'Failed to load metadata'
              const isCors = msg.includes('CORS') || msg.includes('Failed to fetch')
              if (isCors && provider === '0g') {
                const rootHash = agent.encryptedURI.replace('0g://', '')
                setLoadedMetadata(`CORS_BLOCKED|https://indexer-storage-testnet-turbo.0g.ai/blob/${rootHash}`)
              } else {
                setLoadedMetadata(`Error: ${msg}`)
              }
            } finally {
              setIsLoadingMetadata(false)
            }
          }}
          disabled={isLoadingMetadata}
          className="text-[10px] px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 transition-colors"
        >
          {isLoadingMetadata ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          Load Metadata
        </button>
      )}
      {loadedMetadata && !loadedMetadata.startsWith('CORS_BLOCKED|') && (
        <div className={`p-2 rounded-lg text-[10px] font-mono overflow-x-auto max-h-32 overflow-y-auto ${p.dark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-slate-600'}`}>
          <pre className="whitespace-pre-wrap break-all">{loadedMetadata}</pre>
        </div>
      )}
      {loadedMetadata && loadedMetadata.startsWith('CORS_BLOCKED|') && (
        <div className={`p-2 rounded-lg text-[10px] font-mono ${p.dark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-slate-600'}`}>
          <p className="mb-1">Metadata URL (CORS blocked, open manually):</p>
          <a href={loadedMetadata.replace('CORS_BLOCKED|', '')} target="_blank" rel="noreferrer" className="font-mono break-all underline opacity-90 hover:opacity-100">
            {loadedMetadata.replace('CORS_BLOCKED|', '')}
          </a>
        </div>
      )}
    </div>
  )
}

function AgentRegisterForm({ s }: { s: AgentPayIDState }) {
  const p = useV4Palette()
  return (
    <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted}`}>Agent Wallet</label>
            <span className={`text-[10px] ${p.textMuted}`}>Wallet milik AI Agent (bukan user)</span>
          </div>
          <input
            type="text"
            value={s.regAgentWallet}
            onChange={(e) => s.setRegAgentWallet(e.target.value)}
            placeholder="0x... (wallet AI agent untuk terima payment)"
            className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
          />
          <p className={`text-[10px] mt-1 ${p.textMuted}`}>Gunakan wallet baru / terpisah untuk AI Agent. Jangan pakai wallet admin/user.</p>
        </div>

        <div>
          <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>Display Name *</label>
          <input
            type="text"
            value={s.regDisplayName}
            onChange={(e) => s.setRegDisplayName(e.target.value)}
            placeholder="e.g. Gift Bot, AlphaTrader..."
            className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>AI Model</label>
            <input
              list="model-list"
              value={s.regModel}
              onChange={(e) => {
                const model = e.target.value
                s.setRegModel(model)
                if (model.startsWith('qwen/')) s.setRegEndpoint('https://compute-network-6.integratenetwork.work/v1/proxy')
                else if (model === 'gpt-4' || model === 'gpt-4o') s.setRegEndpoint('https://api.openai.com/v1/chat/completions')
                else if (model === 'claude-3' || model.startsWith('claude')) s.setRegEndpoint('https://api.anthropic.com/v1/messages')
                else if (model === 'gemini-pro' || model.startsWith('gemini')) s.setRegEndpoint('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent')
              }}
              placeholder="qwen/qwen-2.5-7b-instruct"
              className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
            />
            <datalist id="model-list">
              <option value="qwen/qwen-2.5-7b-instruct" />
              <option value="qwen/qwen-2.5-14b-instruct" />
              <option value="qwen/qwen-2.5-32b-instruct" />
              <option value="qwen/qwen-2.5-72b-instruct" />
              <option value="gpt-4" />
              <option value="gpt-4o" />
              <option value="claude-3" />
              <option value="claude-3-5-sonnet" />
              <option value="gemini-pro" />
              <option value="gemini-1.5-pro" />
              <option value="llama-3-8b" />
              <option value="llama-3-70b" />
              <option value="mistral-7b" />
            </datalist>
          </div>
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>Endpoint (auto)</label>
            <input
              type="text"
              value={s.regEndpoint}
              onChange={(e) => s.setRegEndpoint(e.target.value)}
              placeholder="https://..."
              className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
            />
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>System Prompt (opsional)</label>
          <textarea
            value={s.regSystemPrompt}
            onChange={(e) => s.setRegSystemPrompt(e.target.value)}
            placeholder="You are a helpful AI payment assistant..."
            rows={3}
            className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40 resize-none`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className={`text-[10px] font-medium uppercase tracking-wider ${p.textMuted}`}>Storage Provider</p>
        <div className="flex gap-2">
          {(['0g', 'ipfs'] as const).map((prov) => (
            <button
              key={prov}
              type="button"
              onClick={() => s.setStorageProvider(prov)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                s.storageProvider === prov
                  ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]'
                  : p.dark ? 'border-white/10 text-slate-400 hover:border-white/20' : 'border-black/10 text-slate-500 hover:border-black/20'
              }`}
            >
              {prov === '0g' ? '0G Storage' : 'IPFS'}
            </button>
          ))}
        </div>
        <div className={`p-2 rounded-lg text-[10px] font-mono ${p.dark ? 'bg-white/3 text-slate-500' : 'bg-black/3 text-slate-500'}`}>
          <p>{s.storageProvider === '0g' ? 'Metadata akan di-upload ke 0G Storage lalu di-hash (perlu wallet + A0GI)' : 'Metadata akan di-upload ke IPFS via Pinata (perlu VITE_PINATA_JWT)'}</p>
        </div>
      </div>

      <button
        onClick={s.handleRegister}
        disabled={s.isRegisteringAgent || s.isUploading || !s.regAgentWallet.trim() || !s.regDisplayName.trim() || !s.regEndpoint.trim()}
        className="w-full px-3 py-2 rounded-xl bg-[#00D084] text-white text-xs font-medium hover:bg-[#00D084]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {s.isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : s.isRegisteringAgent ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Register Admin Agent'}
      </button>
    </div>
  )
}
