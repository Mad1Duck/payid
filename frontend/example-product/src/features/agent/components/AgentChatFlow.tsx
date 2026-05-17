import { motion } from 'framer-motion'
import { User, BrainCircuit, Database, CheckCircle2, Bot, ShieldAlert } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import type { AgentPayIDState } from '../hooks/useAgentPayID'

interface Props {
  s: AgentPayIDState
}

export default function AgentChatFlow({ s }: Props) {
  const p = useV4Palette()
  
  // chatFlowStep maps: 0=Idle, 1=User Msg, 2=IPFS, 3=AI, 4=WASM, 5=Final
  const currentStep = s.chatFlowStep || 0;
  
  const hasDecision = !!s.decision;
  const isApproved = s.decision?.decision === 'APPROVE';

  const steps = [
    {
      id: 1,
      title: 'User Message',
      subtitle: 'Prompt sent',
      icon: User,
      active: currentStep === 1,
      done: currentStep >= 1,
      color: '#3B82F6', // Blue
    },
    {
      id: 2,
      title: 'Load Data Rule',
      subtitle: 'From IPFS',
      icon: Database,
      active: currentStep === 2,
      done: currentStep > 2,
      color: '#0EA5E9', // Sky Blue
    },
    {
      id: 3,
      title: 'AI Check Rule',
      subtitle: 'Qwen model',
      icon: BrainCircuit,
      active: currentStep === 3,
      done: currentStep > 3,
      color: '#8B5CF6', // Purple
    },
    {
      id: 4,
      title: 'Result Rule',
      subtitle: 'WASM Policy',
      icon: ShieldAlert,
      active: currentStep === 4,
      done: currentStep > 4,
      color: '#F59E0B', // Amber
    },
    {
      id: 5,
      title: 'AI Response',
      subtitle: currentStep === 5 ? (hasDecision ? (isApproved ? 'Approved' : 'Rejected') : 'Replied') : 'Waiting',
      icon: currentStep === 5 ? (hasDecision ? (isApproved ? CheckCircle2 : ShieldAlert) : CheckCircle2) : Bot,
      active: false,
      done: currentStep === 5,
      color: currentStep === 5 ? (hasDecision ? (isApproved ? '#00D084' : '#EF4444') : '#3B82F6') : '#64748B',
    },
  ]

  // Calculate progress for the connecting line
  let activeIndex = 0;
  if (currentStep >= 5) activeIndex = 4;
  else if (currentStep > 0) activeIndex = currentStep - 1;

  const progressPercent = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className={`rounded-2xl p-5 mb-4`} style={{ background: p.cardBg, border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}` }}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-6 ${p.textMuted}`}>Live Evaluation Flow</h3>
      
      <div className="relative w-full">
        {/* Background inactive line */}
        <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-black/5 dark:bg-white/5 z-0" />
        
        {/* Active colored line */}
        <div className="absolute top-6 left-[10%] right-[10%] h-0.5 z-0 flex items-center justify-start">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${progressPercent}%` }}
             transition={{ duration: 0.5 }}
             className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full"
           />
        </div>

        <div className="flex items-start justify-between w-full relative z-10">
          {steps.map((step) => {
            const isCurrentOrDone = step.active || step.done;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <motion.div
                  animate={step.active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 1.5, repeat: step.active ? Infinity : 0 }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden`}
                  style={{ 
                    backgroundColor: p.dark ? '#080D08' : '#F8FAFC', // Solid fallback background
                    border: `2px solid ${isCurrentOrDone ? step.color : p.dark ? '#334155' : '#E2E8F0'}`,
                  }}
                >
                  <div className="absolute inset-0" style={{ backgroundColor: isCurrentOrDone ? step.color : 'transparent', opacity: 0.15 }} />
                  <div className="absolute inset-0" style={{ backgroundColor: p.dark ? '#000000' : '#ffffff', opacity: 0.5 }} /> {/* Ensures it's opaque enough to hide the line */}
                  <step.icon 
                    className={`w-5 h-5 relative z-10 ${step.active ? 'animate-pulse' : ''}`} 
                    style={{ color: isCurrentOrDone ? step.color : p.textMuted }} 
                  />
                  
                  {/* step.skipped removed since early exit is removed */}
                </motion.div>
                
                <div className="text-center mt-3 px-1">
                  <div className={`text-[11px] font-bold leading-tight ${isCurrentOrDone ? p.textMain : p.textMuted}`}>
                    {step.title}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 leading-tight">
                    {step.subtitle}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {s.agentRuleJson && (
        <div 
          className="mt-6 pt-4 border-t space-y-3" 
          style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D084] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D084]"></span>
              </span>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${p.textMuted}`}>
                Active Guardrail Policy ({s.agentRuleInfo?.ruleSetHash ? `0x${s.agentRuleInfo.ruleSetHash.substring(2, 8)}...` : 'Active'})
              </p>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium border border-[#00D084]/20">
              Deterministic WASM Enforced
            </span>
          </div>

          <div 
            className="p-3 rounded-xl overflow-x-auto max-h-[160px] border font-mono text-[10px] leading-relaxed transition-all duration-200"
            style={{ 
              background: p.dark ? '#080d08' : '#f8fafc', 
              borderColor: p.dark ? 'rgba(0, 208, 132, 0.2)' : 'rgba(0, 208, 132, 0.1)',
              color: p.dark ? '#A7F3D0' : '#065F46',
              boxShadow: p.dark ? 'inset 0 0 12px rgba(0, 208, 132, 0.05)' : 'none'
            }}
          >
            <pre>{JSON.stringify(s.agentRuleJson, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
