import { Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { shortHash } from '@/features/agent/utils/format'
import { useV4Palette } from '@/components/v4/theme'
import { useState, useEffect } from 'react'
import type { CombinedRule } from 'payid-react'
import { useRule } from 'payid-react'

interface Props {
  policy: CombinedRule | undefined
  p: ReturnType<typeof useV4Palette>
}

interface RuleDetailProps {
  ruleId: bigint
  p: ReturnType<typeof useV4Palette>
}

function RuleDetail({ ruleId, p }: RuleDetailProps) {
  const { data: rule, isLoading } = useRule(ruleId)
  const [ruleJson, setRuleJson] = useState<any>(null)

  useEffect(() => {
    if (rule?.uri) {
      fetch(rule.uri)
        .then(res => res.json())
        .then(data => setRuleJson(data))
        .catch(() => {})
    }
  }, [rule?.uri])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading rule details...</span>
      </div>
    )
  }

  if (!rule) {
    return (
      <div className="text-xs text-[#64748B]">Rule not found</div>
    )
  }

  return (
    <div className="space-y-2 mt-3 pl-3 border-l-2 border-[#8B5CF6]/30">
      <div className="flex justify-between items-center py-1">
        <span className={`text-[11px] ${p.textMuted}`}>Rule Hash</span>
        <span className={`text-[11px] font-mono ${p.textMain}`}>{shortHash(rule.ruleHash)}</span>
      </div>
      <div className="flex justify-between items-center py-1">
        <span className={`text-[11px] ${p.textMuted}`}>Version</span>
        <span className={`text-[11px] font-mono ${p.textMain}`}>v{rule.version}</span>
      </div>
      {ruleJson?.rule && (
        <div className="mt-2 space-y-2">
          <div>
            <span className={`text-[10px] ${p.textMuted} block mb-1`}>Rule ID</span>
            <span className={`text-[11px] font-mono ${p.textMain}`}>{ruleJson.rule.id}</span>
          </div>
          <div>
            <span className={`text-[10px] ${p.textMuted} block mb-1`}>Condition</span>
            <div className={`text-[11px] ${p.textMain}`}>
              <code className={`${p.dark ? 'bg-black/20' : 'bg-black/5'} px-1.5 py-0.5 rounded`}>
                {ruleJson.rule.if?.field} {ruleJson.rule.if?.op} {ruleJson.rule.if?.value}
              </code>
            </div>
          </div>
          {ruleJson.rule.message && (
            <div>
              <span className={`text-[10px] ${p.textMuted} block mb-1`}>Reject Message</span>
              <div className={`text-[11px] text-[#F59E0B]`}>{ruleJson.rule.message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TargetPolicyInfo({ policy, p }: Props) {
  const [expandedRule, setExpandedRule] = useState<number | null>(0)

  if (!policy) {
    return (
      <div className={`p-4 rounded-xl ${p.dark ? 'bg-white/4 border border-white/8' : 'bg-black/4 border border-black/8'}`}>
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>No active policy found for this recipient</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl ${p.dark ? 'bg-white/4 border border-white/8' : 'bg-black/4 border border-black/8'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00D084]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#00D084]">Recipient Policy</span>
        </div>
        {policy.direction !== undefined && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
            policy.direction === 0
              ? 'border-[#00D084]/30 text-[#00D084] bg-[#00D084]/10'
              : 'border-[#8B5CF6]/30 text-[#8B5CF6] bg-[#8B5CF6]/10'
          }`}>
            {policy.direction === 0 ? 'Inbound' : 'Outbound'}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center py-1">
          <span className={`text-[12px] ${p.textMuted}`}>Policy Hash</span>
          <span className={`text-[12px] font-mono ${p.textMain}`}>{shortHash(policy.hash)}</span>
        </div>
        
        <div className="flex justify-between items-center py-1">
          <span className={`text-[12px] ${p.textMuted}`}>Owner</span>
          <span className={`text-[12px] font-mono ${p.textMain}`}>{shortHash(policy.owner)}</span>
        </div>
        
        <div className="flex justify-between items-center py-1">
          <span className={`text-[12px] ${p.textMuted}`}>Version</span>
          <span className={`text-[12px] font-mono ${p.textMain}`}>v{String(policy.version)}</span>
        </div>
        
        <div className="flex justify-between items-center py-1">
          <span className={`text-[12px] ${p.textMuted}`}>Status</span>
          <div className="flex items-center gap-1.5">
            {policy.active ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" />
                <span className="text-[12px] font-medium text-[#00D084]">Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-[12px] font-medium text-[#F59E0B]">Inactive</span>
              </>
            )}
          </div>
        </div>
        
        {policy.ruleRefs && policy.ruleRefs.length > 0 && (
          <div className="pt-2 mt-2 border-t" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
            <span className={`text-[11px] ${p.textMuted} block mb-2`}>Rules ({policy.ruleRefs.length})</span>
            <div className="space-y-1.5">
              {policy.ruleRefs.map((ref, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => setExpandedRule(expandedRule === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                      <span className="text-[11px] font-mono text-[#64748B]">
                        Rule NFT: {shortHash(ref.ruleNFT)} (Token #{String(ref.tokenId)})
                      </span>
                    </div>
                    {expandedRule === idx ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#64748B]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                    )}
                  </button>
                  {expandedRule === idx && (
                    <RuleDetail ruleId={ref.tokenId} p={p} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
