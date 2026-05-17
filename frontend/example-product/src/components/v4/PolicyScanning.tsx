import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Shield, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useV4Palette } from './theme'

type RuleEvaluation = {
  id: string
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
}

type PolicyScanningProps = {
  pipeline: { id: string; name: string; status: 'pending' | 'running' | 'done' | 'error' }[]
  ruleEvaluations?: RuleEvaluation[]
  riskScore?: number
  errorDetail?: string | null
  onBack?: () => void
  backDisabled?: boolean
}

export default function PolicyScanning({ pipeline, ruleEvaluations = [], riskScore, errorDetail, onBack, backDisabled }: PolicyScanningProps) {
  const p = useV4Palette()

  return (
    <div className="space-y-5">
      {/* Header with back button and risk score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              disabled={backDisabled}
              className={`p-2 rounded-lg ${p.cardBorder} ${p.textMuted} hover:bg-black/5 transition-colors disabled:opacity-40`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className={`text-lg font-semibold ${p.textMain}`}>Policy Engine</h2>
            <p className={`text-xs ${p.textMuted} mt-0.5`}>Off-chain evaluation + proof generation</p>
          </div>
        </div>
        {riskScore !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              riskScore <= 30
                ? 'bg-[#00D084]/10 text-[#00D084]'
                : riskScore <= 70
                ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                : 'bg-[#EF4444]/10 text-[#EF4444]'
            }`}
          >
            Risk Score: {riskScore}/100
          </motion.div>
        )}
      </div>

      {/* Main scanning card */}
      <div className="rounded-2xl relative overflow-hidden p-5" style={{ background: p.cardBg }}>
        <div className={`absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`} />

        {/* Scanning line effect */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-linear-to-r from-transparent via-[#00D084] to-transparent z-10"
          initial={{ top: '0%', opacity: 0 }}
          animate={{ top: ['0%', '100%', '0%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          style={{ boxShadow: '0 0 20px rgba(0,208,132,0.6)' }}
        />

        {/* Glow effect */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-[#00D084]/30 z-10 blur-sm"
          initial={{ top: '0%' }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Pipeline steps */}
        <div className="relative space-y-2">
          {pipeline.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 flex flex-col items-center shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    step.status === 'done'
                      ? 'bg-[#00D084]/15'
                      : step.status === 'error'
                      ? 'bg-[#EF4444]/15'
                      : step.status === 'running'
                      ? `${p.dark ? 'bg-white/10' : 'bg-black/10'}`
                      : `${p.dark ? 'bg-white/4' : 'bg-black/4'}`
                  }`}>
                    {step.status === 'done' ? (
                      <CheckCircle className="w-3 h-3 text-[#00D084]" />
                    ) : step.status === 'error' ? (
                      <XCircle className="w-3 h-3 text-[#EF4444]" />
                    ) : step.status === 'running' ? (
                      <Loader2 className={`w-3 h-3 animate-spin ${p.textMain}`} />
                    ) : (
                      <Shield className={`w-3 h-3 ${p.textMuted}`} />
                    )}
                  </div>
                  {i < pipeline.length - 1 && (
                    <div
                      className={`w-px h-4 mt-1 ${
                        step.status === 'done' ? 'bg-[#00D084]/30' : step.status === 'error' ? 'bg-[#EF4444]/30' : p.dark ? 'bg-white/4' : 'bg-black/4'
                      }`}
                    />
                  )}
                </div>
                <div
                  className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
                    step.status === 'done' ? 'text-[#00D084]' : step.status === 'error' ? 'text-[#EF4444]' : step.status === 'running' ? p.textMain : p.textMuted
                  }`}
                >
                  {step.name}
                </div>
              </motion.div>
            ))}
          </div>

        {/* Detailed rule evaluations */}
        <AnimatePresence>
          {ruleEvaluations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-4 border-t border-white/10"
            >
              <div className={`text-[11px] font-medium ${p.textMuted} mb-3 uppercase tracking-wider`}>
                Rule Checks
              </div>
              <div className="space-y-2">
                {ruleEvaluations.map((rule, i) => {
                  const Icon = rule.status === 'passed' ? CheckCircle : rule.status === 'failed' ? XCircle : AlertTriangle
                  const statusColor = rule.status === 'passed' ? 'text-[#00D084]' : rule.status === 'failed' ? 'text-[#EF4444]' : p.textMuted
                  const bgClass = rule.status === 'passed' ? 'bg-[#00D084]/5' : rule.status === 'failed' ? 'bg-[#EF4444]/5' : `${p.dark ? 'bg-white/2' : 'bg-black/2'}`
                  
                  return (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-start gap-3 p-3 rounded-xl ${bgClass}`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-medium ${p.textMain}`}>{rule.name}</div>
                        {rule.message && (
                          <div className={`text-[11px] ${p.textMuted} mt-0.5 whitespace-pre-wrap leading-relaxed`}>{rule.message}</div>
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-medium capitalize ${statusColor} shrink-0`}
                      >
                        {rule.status}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Detail */}
      {errorDetail && (
        <PolicyErrorDetail error={errorDetail} />
      )}

      {/* Status message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-center text-[12px] ${p.textMuted}`}
      >
        {pipeline.some(p => p.status === 'running')
          ? 'Scanning policy rules...'
          : pipeline.some(p => p.status === 'error')
          ? 'Policy evaluation failed'
          : pipeline.every(p => p.status === 'done')
          ? 'Policy evaluation complete'
          : 'Waiting to start...'}
      </motion.div>
    </div>
  )
}

function PolicyErrorDetail({ error }: { error: string }) {
  const p = useV4Palette()
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl relative overflow-hidden"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-4"
      >
        <div className="flex items-center gap-3">
          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <div className="text-left">
            <div className="text-[13px] font-medium text-[#EF4444]">
              Policy Denied
            </div>
            <div className={`text-[11px] ${p.textMuted}`}>
              {error.split('\n')[0].slice(0, 80)}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className={`w-4 h-4 ${p.textMuted}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${p.textMuted}`} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className={`text-[11px] ${p.textMuted} font-mono leading-relaxed whitespace-pre-wrap wrap-break-word`}>
                {error}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
