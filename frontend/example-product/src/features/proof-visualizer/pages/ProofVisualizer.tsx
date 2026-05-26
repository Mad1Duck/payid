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
  ChevronRight,
} from 'lucide-react'
import {
  ParticleField,
  StorageHexGrid,
  SignatureAnimation,
  BlockChainLink,
} from '@/features/shared'
import { useProofVisualizer } from '../hooks/useProofVisualizer'
import type { StageInfo, Stage } from '../hooks/useProofVisualizer'

const STAGES: StageInfo[] = [
  {
    key: 'context',
    title: 'Build Context',
    subtitle: 'tx + payId + env + oracle',
    icon: 'Layers',
    color: '#0EA5E9',
  },
  {
    key: 'storage',
    title: 'IPFS Storage',
    subtitle: 'Fetching rule blob from IPFS',
    icon: 'Database',
    color: '#8B5CF6',
  },
  {
    key: 'resolve',
    title: 'Resolve Rules',
    subtitle: 'IPFS hash → WASM config',
    icon: 'Box',
    color: '#EC4899',
  },
  {
    key: 'evaluate',
    title: 'WASM Engine',
    subtitle: 'Deterministic execution',
    icon: 'Cpu',
    color: '#F59E0B',
  },
  {
    key: 'decision',
    title: 'Decision',
    subtitle: 'ALLOW / REJECT',
    icon: 'FileCheck',
    color: '#00D084',
  },
  {
    key: 'sign',
    title: 'EIP-712 Sign',
    subtitle: 'Typed data signature',
    icon: 'PenTool',
    color: '#06B6D4',
  },
  {
    key: 'validate',
    title: 'On-Chain',
    subtitle: 'PayIDVerifier.validate',
    icon: 'Link2',
    color: '#00D084',
  },
]

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Database,
  Box,
  Cpu,
  FileCheck,
  PenTool,
  Link2,
}

export default function ProofVisualizer() {
  const {
    p,
    stage,
    selectedStage,
    setSelectedStage,
    history,
    result,
    reason,
    start,
    reset,
  } = useProofVisualizer()
  const currentStageInfo = STAGES.find((s) => s.key === stage)
  const StageIcon = currentStageInfo ? ICON_MAP[currentStageInfo.icon] : null

  // Documentation links for each stage (based on frontend-docs structure)
  const docLinks: Record<Stage, string> = {
    idle: 'https://docs.payid.nawasena-labs.com/docs/core-concepts/overview',
    context: 'https://docs.payid.nawasena-labs.com/docs/core-concepts/overview',
    storage:
      'https://docs.payid.nawasena-labs.com/docs/examples/create-nft-rule',
    resolve: 'https://docs.payid.nawasena-labs.com/docs/rules/rule-basics',
    evaluate: 'https://docs.payid.nawasena-labs.com/docs/rules/rule-basics',
    decision:
      'https://docs.payid.nawasena-labs.com/docs/core-concepts/overview',
    sign: 'https://docs.payid.nawasena-labs.com/docs/api/sdk-reference',
    validate:
      'https://docs.payid.nawasena-labs.com/docs/network/contracts-address',
    complete:
      'https://docs.payid.nawasena-labs.com/docs/core-concepts/overview',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>
          Decision Proof Visualizer
        </h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Watch how a payment policy is evaluated and proven.
        </p>
      </div>

      {/* Main Stage Display */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden min-h-75 flex flex-col items-center justify-center"
        style={{
          background: p.dark ? 'rgba(11,15,26,0.6)' : 'rgba(241,245,249,0.8)',
        }}
      >
        <div
          className={`absolute inset-0 rounded-3xl border ${p.cardBorder}`}
        />
        <ParticleField color={currentStageInfo?.color ?? '#64748B'} />

        {stage === 'idle' && (
          <div className="relative text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00D084]/10 flex items-center justify-center mx-auto">
              <Zap className="w-8 h-8 text-[#00D084]" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${p.textMain}`}>
                Ready to Visualize
              </h3>
              <p className={`text-sm ${p.textMuted} mt-1`}>
                Simulate the full off-chain → on-chain proof pipeline.
              </p>
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
                  {StageIcon && (
                    <StageIcon
                      className="w-8 h-8"
                      style={{ color: currentStageInfo!.color }}
                    />
                  )}
                </div>
                <div className="text-center">
                  <h3 className={`text-lg font-bold ${p.textMain}`}>
                    {currentStageInfo?.title}
                  </h3>
                  <p className={`text-sm ${p.textMuted}`}>
                    {currentStageInfo?.subtitle}
                  </p>
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
                animate={{
                  width: `${((STAGES.findIndex((s) => s.key === stage) + 1) / STAGES.length) * 100}%`,
                }}
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
                    <span className="font-semibold">
                      ALLOW — Payment Approved
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EF4444]/10 text-[#EF4444]">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">
                      REJECT — Policy Blocked
                    </span>
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
        <h3 className={`text-sm font-semibold ${p.textMain}`}>
          Pipeline Steps
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {STAGES.map((s) => {
            const isDone = history.includes(s.key)
            const isActive = stage === s.key
            const isSelected = selectedStage === s.key
            return (
              <motion.div
                key={s.key}
                className={`p-2 rounded-xl text-center space-y-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00D084]/20 border border-[#00D084]/30'
                    : isActive
                      ? 'bg-[#00D084]/10'
                      : isDone
                        ? 'bg-white/5'
                        : 'opacity-40'
                }`}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                onClick={() => setSelectedStage(s.key)}
              >
                {(() => {
                  const SIcon = ICON_MAP[s.icon]
                  return SIcon ? (
                    <SIcon
                      className="w-4 h-4 mx-auto"
                      style={{
                        color: isSelected
                          ? s.color
                          : isActive
                            ? s.color
                            : isDone
                              ? s.color
                              : '#64748B',
                      }}
                    />
                  ) : null
                })()}
                <div className={`text-[10px] font-medium ${p.textMain}`}>
                  {s.title.split(' ')[0]}
                </div>
                <div
                  className="w-full h-0.5 rounded-full bg-current opacity-20"
                  style={{
                    color:
                      isSelected || isActive
                        ? s.color
                        : isDone
                          ? s.color
                          : '#64748B',
                  }}
                />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Dynamic Process Log Card */}
      <div
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div
          className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`}
        />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${p.textMain}`}>
                  Live Process Log
                </h3>
                <p className={`text-xs ${p.textMuted}`}>
                  Real-time pipeline execution
                </p>
              </div>
            </div>
            {selectedStage !== 'idle' && (
              <a
                href={docLinks[selectedStage]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/20 transition-colors"
              >
                <span>View Docs</span>
                <ChevronRight className="w-3 h-3" />
              </a>
            )}
          </div>

          <div
            className={`p-3 rounded-xl font-mono text-xs space-y-1.5 ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
          >
            {selectedStage === 'idle' && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">⏳</span>
                <span className={p.textMuted}>
                  Ready to start proof pipeline
                </span>
              </div>
            )}
            {selectedStage === 'context' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#0EA5E9]">→</span>
                  <span className={p.textMuted}>normalizeContext()</span>
                  <span className={p.textMain}>tx + payId + env + oracle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#0EA5E9]">→</span>
                  <span className={p.textMuted}>Context V2</span>
                  <span className={p.textMain}>sender: 0x1234...7890</span>
                </div>
              </>
            )}
            {selectedStage === 'storage' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#8B5CF6]">→</span>
                  <span className={p.textMuted}>tokenURI(tokenId)</span>
                  <span className={p.textMain}>RuleItemERC721</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8B5CF6]">→</span>
                  <span className={p.textMuted}>GET</span>
                  <span className={p.textMain}>ipfs://QmXyZ...rule.json</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8B5CF6] animate-pulse">⏳</span>
                  <span className={p.textMuted}>
                    Fetching rule blob from IPFS...
                  </span>
                </div>
              </>
            )}
            {selectedStage === 'resolve' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>IPFS fetch complete</span>
                  <span className={p.textMain}>2.4 KB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#EC4899]">→</span>
                  <span className={p.textMuted}>JSON.parse()</span>
                  <span className={p.textMain}>RuleConfig</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#EC4899]">→</span>
                  <span className={p.textMuted}>canonicalizeRuleSet()</span>
                  <span className={p.textMain}>Sort keys for hash</span>
                </div>
              </>
            )}
            {selectedStage === 'evaluate' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>Rule config loaded</span>
                  <span className={p.textMain}>3 rules (AND logic)</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">R1:</span>
                    <span className={p.textMuted}>tx.asset == USDC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">R2:</span>
                    <span className={p.textMuted}>
                      tx.amount {'<='} 100 USDC
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">R3:</span>
                    <span className={p.textMuted}>
                      oracle.kycLevel {'>='} 1
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#F59E0B] animate-pulse">⚡</span>
                  <span className={p.textMuted}>
                    executeRule(context, rule)
                  </span>
                  <span className={p.textMain}>WASM sandbox</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#F59E0B]">→</span>
                  <span className={p.textMuted}>eval_condition()</span>
                  <span className={p.textMain}>Checking each rule</span>
                </div>
              </>
            )}
            {selectedStage === 'decision' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>WASM evaluation complete</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#00D084]">✓</span>
                    <span className={p.textMuted}>R1: tx.asset == USDC</span>
                    <span className="text-[#00D084]">PASS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#00D084]">✓</span>
                    <span className={p.textMuted}>
                      R2: 20 USDC {'<='} 100 USDC
                    </span>
                    <span className="text-[#00D084]">PASS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#00D084]">✓</span>
                    <span className={p.textMuted}>R3: kycLevel 2 {'>='} 1</span>
                    <span className="text-[#00D084]">PASS</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={
                      result === 'allow' ? 'text-[#00D084]' : 'text-[#EF4444]'
                    }
                  >
                    {result === 'allow' ? '✓' : '✖'}
                  </span>
                  <span className={p.textMuted}>Decision</span>
                  <span
                    className={
                      result === 'allow' ? 'text-[#00D084]' : 'text-[#EF4444]'
                    }
                  >
                    {result?.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">→</span>
                  <span className={p.textMuted}>code:</span>
                  <span className={p.textMain}>RULES_PASSED</span>
                </div>
                {reason && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">ℹ</span>
                    <span className={p.textMuted}>{reason}</span>
                  </div>
                )}
              </>
            )}
            {selectedStage === 'sign' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>Decision finalized</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#06B6D4]">→</span>
                  <span className={p.textMuted}>buildDecisionPayload()</span>
                  <span className={p.textMain}>EIP-712 typed data</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#06B6D4] animate-pulse">✍️</span>
                  <span className={p.textMuted}>signer._signTypedData()</span>
                  <span className={p.textMain}>EIP-712 signature</span>
                </div>
              </>
            )}
            {selectedStage === 'validate' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>EIP-712 proof signed</span>
                  <span className={p.textMain}>0x7a3f...e91b</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">→</span>
                  <span className={p.textMuted}>DecisionPayload</span>
                  <span className={p.textMain}>version: 1.0, nonce: 123</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084] animate-pulse">🔗</span>
                  <span className={p.textMuted}>
                    PayIDVerifier.verifyDecision()
                  </span>
                  <span className={p.textMain}>On-chain check</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">→</span>
                  <span className={p.textMuted}>ecrecover()</span>
                  <span className={p.textMain}>Signature verification</span>
                </div>
              </>
            )}
            {selectedStage === 'complete' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>
                    On-chain verification passed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00D084]">✓</span>
                  <span className={p.textMuted}>Proof hash</span>
                  <span className={p.textMain}>0x7a3f...e91b</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#0EA5E9]">⚡</span>
                  <span className={p.textMuted}>Total time</span>
                  <span className={p.textMain}>~4.2s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">→</span>
                  <span className={p.textMuted}>Gas saved</span>
                  <span className={p.textMain}>98% (off-chain eval)</span>
                </div>
              </>
            )}
          </div>

          <StorageHexGrid active={stage === 'storage' || stage === 'resolve'} />
        </div>
      </div>
    </motion.div>
  )
}
