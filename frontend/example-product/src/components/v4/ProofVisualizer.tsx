import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Database,
  Cpu,
  CheckCircle2,
  XCircle,
  PenTool,
  Link2,
  Layers,
  Zap,
  RotateCcw,
  FileCheck,
  Box,
} from 'lucide-react'
import { useV4Palette } from './theme'
import { ParticleField, StorageHexGrid, SignatureAnimation, BlockChainLink } from '@/features/shared'

type Stage =
  | 'idle'
  | 'context'
  | 'storage'
  | 'resolve'
  | 'evaluate'
  | 'decision'
  | 'sign'
  | 'validate'
  | 'complete'

interface StageInfo {
  key: Stage
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
}

const STAGES: StageInfo[] = [
  { key: 'context', title: 'Build Context', subtitle: 'tx + payId + env + oracle', icon: Layers, color: '#0EA5E9' },
  { key: 'storage', title: '0G Storage', subtitle: 'Fetching rule blob from ZGS', icon: Database, color: '#8B5CF6' },
  { key: 'resolve', title: 'Resolve Rules', subtitle: 'IPFS hash → WASM config', icon: Box, color: '#EC4899' },
  { key: 'evaluate', title: 'WASM Engine', subtitle: 'Deterministic execution', icon: Cpu, color: '#F59E0B' },
  { key: 'decision', title: 'Decision', subtitle: 'ALLOW / REJECT', icon: FileCheck, color: '#00D084' },
  { key: 'sign', title: 'EIP-712 Sign', subtitle: 'Typed data signature', icon: PenTool, color: '#06B6D4' },
  { key: 'validate', title: 'On-Chain', subtitle: 'PayIDVerifier.validate', icon: Link2, color: '#00D084' },
]

export default function ProofVisualizer() {
  const p = useV4Palette()
  const [stage, setStage] = useState<Stage>('idle')
  const [history, setHistory] = useState<Stage[]>([])
  const [result, setResult] = useState<'allow' | 'reject' | null>(null)

  const start = useCallback(() => {
    setStage('context')
    setHistory(['context'])
    setResult(null)

    let current = 0
    const sequence: Stage[] = ['context', 'storage', 'resolve', 'evaluate', 'decision', 'sign', 'validate']

    const interval = setInterval(() => {
      current++
      if (current >= sequence.length) {
        clearInterval(interval)
        setStage('complete')
        setResult(Math.random() > 0.3 ? 'allow' : 'reject')
        return
      }
      const next = sequence[current]
      setStage(next)
      setHistory((h) => [...h, next])
    }, 1800)
  }, [])

  const reset = useCallback(() => {
    setStage('idle')
    setHistory([])
    setResult(null)
  }, [])

  const currentStageInfo = STAGES.find((s) => s.key === stage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Decision Proof Visualizer</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>Watch how a payment policy is evaluated and proven.</p>
      </div>

      {/* Main Stage Display */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden min-h-75 flex flex-col items-center justify-center"
        style={{ background: p.dark ? 'rgba(11,15,26,0.6)' : 'rgba(241,245,249,0.8)' }}
      >
        <div className={`absolute inset-0 rounded-3xl border ${p.cardBorder}`} />
        <ParticleField color={currentStageInfo?.color ?? '#64748B'} />

        {stage === 'idle' && (
          <div className="relative text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00D084]/10 flex items-center justify-center mx-auto">
              <Zap className="w-8 h-8 text-[#00D084]" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${p.textMain}`}>Ready to Visualize</h3>
              <p className={`text-sm ${p.textMuted} mt-1`}>Simulate the full off-chain → on-chain proof pipeline.</p>
            </div>
            <button
              onClick={start}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Start Proof Flow
            </button>
          </div>
        )}

        {stage !== 'idle' && (
          <div className="relative w-full max-w-md space-y-4">
            {/* Stage Icon */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `${currentStageInfo?.color}15` }}
                >
                  {currentStageInfo && <currentStageInfo.icon className="w-8 h-8" style={{ color: currentStageInfo.color }} />}
                </div>
                <div className="text-center">
                  <h3 className={`text-lg font-bold ${p.textMain}`}>{currentStageInfo?.title}</h3>
                  <p className={`text-sm ${p.textMuted}`}>{currentStageInfo?.subtitle}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Stage-specific visual */}
            {stage === 'storage' && <StorageHexGrid active />}
            {stage === 'sign' && <SignatureAnimation active />}
            {stage === 'validate' && <BlockChainLink active />}

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] dark:bg-white/10 overflow-hidden mt-4">
              <motion.div
                className="h-full rounded-full"
                style={{ background: currentStageInfo?.color }}
                animate={{ width: `${((STAGES.findIndex((s) => s.key === stage) + 1) / STAGES.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Result */}
            {stage === 'complete' && result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-3 pt-2"
              >
                {result === 'allow' ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D084]/10 text-[#00D084]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">ALLOW — Payment Approved</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EF4444]/10 text-[#EF4444]">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">REJECT — Policy Blocked</span>
                  </div>
                )}
                <p className={`text-xs ${p.textMuted} font-mono`}>
                  Proof hash: 0x7a3f...e91b
                </p>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#00D084] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Replay
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Timeline */}
      <div className="space-y-3">
        <h3 className={`text-sm font-semibold ${p.textMain}`}>Pipeline Steps</h3>
        <div className="grid grid-cols-7 gap-2">
          {STAGES.map((s) => {
            const isDone = history.includes(s.key)
            const isActive = stage === s.key
            return (
              <motion.div
                key={s.key}
                className={`p-2 rounded-xl text-center space-y-1 transition-all ${
                  isActive ? 'bg-[#00D084]/10' : isDone ? 'bg-white/5' : 'opacity-40'
                }`}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <s.icon className="w-4 h-4 mx-auto" style={{ color: isActive ? s.color : isDone ? s.color : '#64748B' }} />
                <div className={`text-[10px] font-medium ${p.textMain}`}>{s.title.split(' ')[0]}</div>
                <div className="w-full h-0.5 rounded-full bg-current opacity-20" style={{ color: isDone || isActive ? s.color : '#64748B' }} />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 0G Storage Detail Card */}
      <div className="rounded-2xl p-5 relative" style={{ background: p.cardBg }}>
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>0G Storage Integration</h3>
              <p className={`text-xs ${p.textMuted}`}>Rules fetched from decentralized ZGS network</p>
            </div>
          </div>

          <div className={`p-3 rounded-xl font-mono text-xs space-y-1.5 ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
            <div className="flex items-center gap-2">
              <span className="text-[#8B5CF6]">→</span>
              <span className={p.textMuted}>GET</span>
              <span className={p.textMain}>zgs://rule/0x7a3f...e91b</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00D084]">✓</span>
              <span className={p.textMuted}>Hash verified</span>
              <span className={p.textMain}>sha3-256 match</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#0EA5E9]">⚡</span>
              <span className={p.textMuted}>Latency</span>
              <span className={p.textMain}>42ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#F59E0B]">📦</span>
              <span className={p.textMuted}>Size</span>
              <span className={p.textMain}>2.4 KB WASM config</span>
            </div>
          </div>

          <StorageHexGrid active={stage === 'storage' || stage === 'resolve'} />
        </div>
      </div>
    </motion.div>
  )
}
