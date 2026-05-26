import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Hash, Link2, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { zeroHash } from 'viem'
import { useV4Palette } from '@/components/v4/theme'
import { shortHash } from '@/features/agent/utils/format'
import { PRESET_TEMPLATES } from '@/features/agent/data/presets'
import type { AgentPayIDState } from '../hooks/useAgentPayID'

interface Props {
  s: AgentPayIDState
}

export default function AgentPolicyPanel({ s }: Props) {
  const p = useV4Palette()
  const isOwner = s.selectedAgent?.owner?.toLowerCase() === s.address?.toLowerCase()

  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{ background: p.cardBg, border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}` }}
    >
      {isOwner ? (
        <OwnerPolicyView s={s} />
      ) : (
        <ReadOnlyPolicyView s={s} />
      )}
    </div>
  )
}

function OwnerPolicyView({ s }: { s: AgentPayIDState }) {
  const p = useV4Palette()
  return (
    <>
      <button onClick={() => s.setShowRuleSection(!s.showRuleSection)} className="w-full flex items-center justify-between mb-2 group">
        <p className={`text-xs font-semibold ${p.textMuted}`}>SET AGENT POLICY</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium">Admin</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium">Only Owner</span>
          {s.showRuleSection ? (
            <ChevronUp className={`w-3.5 h-3.5 ${p.textMuted} group-hover:text-[#8B5CF6] transition-colors`} />
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 ${p.textMuted} group-hover:text-[#8B5CF6] transition-colors`} />
          )}
        </div>
      </button>

      {s.showRuleSection && (
        <div className="space-y-2">
          <p className={`text-[11px] ${p.textMuted} mb-2`}>
            Select or create a rule to enforce for this AI agent. This policy will be evaluated on-chain for every payment.
          </p>

          {s.myActiveRule?.hash && s.myActiveRule.hash !== zeroHash && (
            <button
              onClick={async () => { if (s.myActiveRule!.hash && s.selectedAgent) await s.setAgentCombinedRule(s.selectedAgent.agentWallet, s.myActiveRule!.hash) }}
              disabled={s.isSettingRule}
              className="w-full mb-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#00D084]/10 border border-[#00D084]/30 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/20 transition-colors disabled:opacity-50"
            >
              {s.isSettingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Use My Active Combined Rule ({shortHash(s.myActiveRule.hash)})
            </button>
          )}

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => s.setExistingRuleMode(false)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                !s.existingRuleMode
                  ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/30'
                  : `${p.dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`
              }`}
            >
              Create New Rule
            </button>
            <button
              onClick={() => { s.setExistingRuleMode(true); s.setSelectedExistingRule(null) }}
              disabled={!s.myRuleSets || s.myRuleSets.length === 0}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40 ${
                s.existingRuleMode
                  ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/30'
                  : `${p.dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`
              }`}
            >
              Use Existing ({s.myRuleSets?.length ?? 0})
            </button>
          </div>

          {s.existingRuleMode ? (
            <ExistingRuleView s={s} />
          ) : (
            <NewRuleView s={s} />
          )}
        </div>
      )}

      {s.agentRuleInfo?.active && (
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
          <div className="flex items-center gap-2 text-[10px] text-[#00D084]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Current policy: {shortHash(s.agentRuleInfo.ruleSetHash)}</span>
          </div>
          <button
            onClick={() => {
              if (s.selectedAgent) s.unsetAgentCombinedRule(s.selectedAgent.agentWallet)
            }}
            disabled={s.isUnsettingRule}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 ${
              p.dark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'
            } disabled:opacity-50`}
          >
            {s.isUnsettingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Unlink Policy
          </button>
        </div>
      )}
    </>
  )
}

function ExistingRuleView({ s }: { s: AgentPayIDState }) {
  const p = useV4Palette()
  return (
    <div className="space-y-2">
      <p className={`text-[11px] ${p.textMuted}`}>
        Select a combined rule you have already registered. This links it to the current agent without creating a new one.
      </p>
      <div className="flex gap-2 flex-wrap">
        {s.myRuleSets?.map((rs: any, i: number) => (
          <button
            key={i}
            onClick={() => s.setSelectedExistingRule(rs)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              s.selectedExistingRule?.hash === rs.hash
                ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/40'
                : `${p.dark ? 'bg-white/6 text-slate-400 hover:bg-white/10' : 'bg-black/6 text-slate-500 hover:bg-black/10'}`
            }`}
          >
            {shortHash(rs.hash)}
          </button>
        ))}
        {(!s.myRuleSets || s.myRuleSets.length === 0) && (
          <p className={`text-xs ${p.textMuted}`}>No existing combined rules found. Create one first.</p>
        )}
      </div>
      {s.selectedExistingRule && (
        <div className="flex items-center gap-2 text-[10px] text-[#00D084]">
          <CheckCircle2 className="w-3 h-3" />
          <span>Selected: {shortHash(s.selectedExistingRule.hash)}</span>
        </div>
      )}
      <button
        onClick={async () => {
          if (s.selectedExistingRule?.hash && s.selectedAgent) {
            await s.setAgentCombinedRule(s.selectedAgent.agentWallet, s.selectedExistingRule.hash)
          }
        }}
        disabled={s.isSettingRule || !s.selectedExistingRule}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-medium hover:bg-[#8B5CF6]/90 transition-colors disabled:opacity-50"
      >
        {s.isSettingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
        Link to Agent
      </button>
    </div>
  )
}

function NewRuleView({ s }: { s: AgentPayIDState }) {
  const p = useV4Palette()
  return (
    <div className="space-y-2">
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1.5`}>Quick Templates</p>
        <div className="flex gap-2 flex-wrap">
          {PRESET_TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                s.setSelectedTemplate(i)
                s.setRuleNameInput(t.name)
                s.setRuleDescInput(t.desc)
                if (t.json) {
                  const jsonStr = JSON.stringify(t.json, null, 2)
                  s.setRuleJsonInput(jsonStr.replace(/0xOWNER_ADDRESS/g, s.address ?? '0x0000000000000000000000000000000000000000'))
                }
                s.setJsonError('')
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                s.selectedTemplate === i
                  ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/40'
                  : `${p.dark ? 'bg-white/6 text-slate-400 hover:bg-white/10' : 'bg-black/6 text-slate-500 hover:bg-black/10'}`
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={s.ruleNameInput}
        onChange={(e) => { s.setRuleNameInput(e.target.value); s.setSelectedTemplate(-1) }}
        placeholder="Rule name (e.g. Spending Limit 500 USDC)"
        className={`w-full px-3 py-2 rounded-xl text-xs border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40`}
      />
      <input
        type="text"
        value={s.ruleDescInput}
        onChange={(e) => { s.setRuleDescInput(e.target.value); s.setSelectedTemplate(-1) }}
        placeholder="Short description..."
        className={`w-full px-3 py-2 rounded-xl text-xs border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40`}
      />
      <div className="relative">
        <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rule JSON</span>
        <textarea
          value={s.ruleJsonInput}
          onChange={(e) => { s.setRuleJsonInput(e.target.value); s.setSelectedTemplate(-1); s.setJsonError('') }}
          rows={8}
          className={`w-full mt-6 p-3 rounded-xl text-[10px] font-mono border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40 resize-y ${s.jsonError ? 'border-red-400' : ''}`}
          style={{ lineHeight: '1.5' }}
        />
      </div>
      {s.jsonError && (
        <div className="flex items-center gap-1.5 text-red-400 text-[10px]">
          <AlertTriangle className="w-3 h-3" />
          <span>{s.jsonError}</span>
        </div>
      )}

      {s.slotsUsed >= s.slotsMax ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-amber-500 text-[10px]">
            <AlertTriangle className="w-3 h-3" />
            <span>Slot limit reached ({s.slotsUsed}/{s.slotsMax}).</span>
          </div>
          <button
            onClick={() => { if (s.subPrice) s.subscribe(s.subPrice as bigint) }}
            disabled={s.isSubscribing || !s.subPrice}
            className="px-2 py-1 rounded-lg bg-[#8B5CF6] text-white text-[10px] font-medium hover:bg-[#8B5CF6]/90 transition-colors disabled:opacity-50"
          >
            {s.isSubscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Subscribe'}
          </button>
        </div>
      ) : null}

      <button
        onClick={s.handleCreateRule}
        disabled={s.isCreatingRule || !s.ruleNameInput.trim() || s.slotsUsed >= s.slotsMax}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00D084] text-white text-xs font-medium hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
      >
        {s.isCreatingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        Create Rule
      </button>

      {s.showCreateSuccess && (
        <div className="flex items-center gap-2 text-[10px] text-[#00D084]">
          <CheckCircle2 className="w-3 h-3" />
          <span>Rule created! Go to <a href="/v4/rules/console" className="underline">Rules Console</a> to activate & combine.</span>
        </div>
      )}
      <p className={`text-[10px] ${p.textMuted}`}>
        Prefer a guided UI? <a href="/v4/rule-builder" className="text-[#8B5CF6] hover:underline">Open Rule Builder</a> for step-by-step rule creation.
      </p>

      <div className="pt-2 border-t" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
        <p className={`text-[10px] ${p.textMuted} leading-relaxed`}>
          After creating a rule, go to{' '}
          <a href="/v4/app/rules" className="text-[#8B5CF6] hover:underline">Rules Console</a>{' '}
          to activate and combine it, then use the <strong>Use Existing</strong> tab above to link it as your agent policy.
        </p>
      </div>
    </div>
  )
}

function ReadOnlyPolicyView({ s }: { s: AgentPayIDState }) {
  const p = useV4Palette()
  
  const activeRuleJson = s.agentRuleJson;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold ${p.textMuted}`}>AGENT POLICY</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 font-medium">View Only</span>
      </div>

      {!s.selectedAgent ? (
        <p className={`text-xs ${p.textMuted}`}>Select an AI agent above to view its on-chain policy.</p>
      ) : s.agentRuleInfo?.active ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D084]" />
            <span className="font-semibold text-[#00D084] text-xs">Policy Active</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Hash className="w-3 h-3" />
            <span className="font-mono">{shortHash(s.agentRuleInfo.ruleSetHash)}</span>
          </div>
          <p className={`text-[11px] ${p.textMuted}`}>
            This AI agent enforces an on-chain policy. All payment requests will be evaluated against this rule set before approval.
          </p>
          
          {activeRuleJson && (
            <div className="mt-3">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1.5`}>Rule Logic Metadata</p>
              <div 
                className="p-2.5 rounded-xl overflow-x-auto" 
                style={{ background: p.dark ? '#00000040' : '#f8fafc', border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}` }}
              >
                <pre className="text-[9px] font-mono leading-relaxed" style={{ color: p.textMain }}>
                  {JSON.stringify(activeRuleJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-amber-500 text-xs">No Policy Configured</span>
          </div>
          <p className={`text-[11px] ${p.textMuted}`}>
            This AI agent does not have an active policy. The agent owner must set a rule before payments can be enforced.
          </p>
        </div>
      )}
    </>
  )
}
