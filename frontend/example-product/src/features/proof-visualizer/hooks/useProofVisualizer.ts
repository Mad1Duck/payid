import { useState, useCallback } from 'react'
import { useV4Palette } from '@/components/v4/theme'

export type Stage =
  | 'idle'
  | 'context'
  | 'storage'
  | 'resolve'
  | 'evaluate'
  | 'decision'
  | 'sign'
  | 'validate'
  | 'complete'

export interface StageInfo {
  key: Stage
  title: string
  subtitle: string
  icon: string
  color: string
}

export const STAGES: StageInfo[] = [
  { key: 'context', title: 'Build Context', subtitle: 'tx + payId + env + oracle', icon: 'Layers', color: '#0EA5E9' },
  { key: 'storage', title: '0G Storage', subtitle: 'Fetching rule blob from ZGS', icon: 'Database', color: '#8B5CF6' },
  { key: 'resolve', title: 'Resolve Rules', subtitle: 'IPFS hash → WASM config', icon: 'Box', color: '#EC4899' },
  { key: 'evaluate', title: 'WASM Engine', subtitle: 'Deterministic execution', icon: 'Cpu', color: '#F59E0B' },
  { key: 'decision', title: 'Decision', subtitle: 'ALLOW / REJECT', icon: 'FileCheck', color: '#00D084' },
  { key: 'sign', title: 'EIP-712 Sign', subtitle: 'Typed data signature', icon: 'PenTool', color: '#06B6D4' },
  { key: 'validate', title: 'On-Chain', subtitle: 'PayIDVerifier.validate', icon: 'Link2', color: '#00D084' },
]

export function useProofVisualizer() {
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

  return { p, stage, history, result, start, reset, currentStageInfo }
}
