import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, Link2, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { Console } from '@/features/agent/components/Console'
import { shortHash } from '@/features/agent/utils/format'
import { EXPLORER_URLS } from '@/features/agent/data/constants'
import type { AgentPayIDState } from '../hooks/useAgentPayID'

interface Props {
  s: AgentPayIDState
}

export default function AgentDecisionPanel({ s }: Props) {
  const p = useV4Palette()
  return (
    <>
      <AnimatePresence>
        {s.decision && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl p-5 ${
              s.decision.decision === 'APPROVE' ? 'bg-[#00D084]/10 border border-[#00D084]/25' : 'bg-red-500/10 border border-red-500/25'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {s.decision.decision === 'APPROVE' ? (
                <CheckCircle2 className="w-6 h-6 text-[#00D084]" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <div className={`font-bold text-sm ${s.decision.decision === 'APPROVE' ? 'text-[#00D084]' : 'text-red-400'}`}>
                  AI Decision: {s.decision.decision}
                </div>
                <div className={`text-xs ${p.textMuted} mt-0.5`}>{s.decision.reason}</div>
              </div>
            </div>

            {s.decision.decision === 'APPROVE' && s.onChainPhase === 'idle' && (
              <div className="space-y-2">
                <p className={`text-xs ${p.textMuted}`}>
                  AI approved. Execute transaction on-chain to verify against policy:
                </p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={s.executeOnChain}
                  disabled={!s.isConnected || s.isWrongChain}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #00D084, #0EA5E9)' }}
                >
                  <Link2 className="w-4 h-4" /> Execute Payment On-Chain
                </motion.button>
              </div>
            )}

            {s.onChainPhase !== 'idle' && s.onChainPhase !== 'done' && s.onChainPhase !== 'error' && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#00D084]" />
                <span className={`text-sm ${p.textMuted}`}>
                  {s.onChainPhase === 'register' ? 'Registering agent NFT…' : 'Linking policy on-chain…'}
                </span>
              </div>
            )}

            {s.onChainPhase === 'done' && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[#00D084] text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Policy linked on-chain
                </div>
                <div className="flex gap-3 flex-wrap">
                  {s.txHashes.map((h: any, i: number) => (
                    <a
                      key={h}
                      href={`${EXPLORER_URLS[s.activeChainId]}/tx/${h}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-[#0EA5E9] hover:underline flex items-center gap-1"
                    >
                      Tx {i + 1}: {shortHash(h)} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* On-chain Log Console */}
      {(s.logs.length > 0 || s.onChainPhase !== 'idle') && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: p.dark ? '#080D08' : '#F8FAFC',
            border: `1px solid ${p.dark ? '#ffffff08' : '#00000008'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {['bg-red-400', 'bg-amber-400', 'bg-green-400'].map((c) => (
                <div key={c} className={`w-2 h-2 rounded-full ${c}`} />
              ))}
            </div>
            <span className={`text-[10px] font-mono ${p.textMuted}`}>on-chain-execution</span>
            {s.onChainPhase !== 'idle' && s.onChainPhase !== 'done' && s.onChainPhase !== 'error' && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#00D084]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <Console logs={s.logs} />
        </div>
      )}

      {/* Reset / Info footer */}
      <div className="flex items-center justify-between">
        <div className={`text-[10px] font-mono ${p.textMuted}`}>
          AgentPayID:{' '}
          <a
            href={`${EXPLORER_URLS[s.activeChainId]}/address/${s.agentPayIDAddr}`}
            target="_blank"
            rel="noreferrer"
            className="text-[#0EA5E9] hover:underline"
          >
            {s.agentPayIDAddr?.slice(0, 10)}…
          </a>
          {' · '}
          <ShieldCheck className="inline w-3 h-3" /> 0G {s.activeChainId}
        </div>
        {(s.decision || s.onChainPhase !== 'idle') && (
          <button
            onClick={s.resetAll}
            className={`text-xs flex items-center gap-1 ${p.textMuted} hover:text-[#8B5CF6] transition-colors`}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>
    </>
  )
}
