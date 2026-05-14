import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Check,
  X,
  Zap,
  Shield,
  FileCheck,
  Loader2,
  Copy,
  RotateCcw,
  Wallet,
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { useV4Palette } from './theme'
import { useMultiCurrency } from '../../hooks/useMultiCurrency'
import TransactionSimulation from './TransactionSimulation'

type RuleStatus = 'pending' | 'running' | 'done'

type Step = 'who' | 'amount' | 'review' | 'evaluating' | 'signing' | 'success'

const cardBase = 'rounded-2xl relative overflow-hidden'

export default function SendFlow() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const p = useV4Palette()
  const cardBorder = `absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`
  const cardBg = { background: p.cardBg }

  const { displayCurrency, convert, format, toggle } = useMultiCurrency()
  const [step, setStep] = useState<Step>('who')
  const [payId, setPayId] = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState('ETH')
  const [txHash, setTxHash] = useState('')
  const [evalProgress, setEvalProgress] = useState(0)
  const [denyReason, setDenyReason] = useState('')
  const [simResult, setSimResult] = useState<any>(null)
  const [showSimulation, setShowSimulation] = useState(false)

  const balanceValue = balance ? parseFloat(formatUnits(balance.value, balance.decimals)) : 0

  const demoRules: { id: string; name: string; status: RuleStatus }[] = [
    { id: 'ctx', name: 'Build Context', status: 'pending' },
    { id: 'resolve', name: 'Resolve Rules', status: 'pending' },
    { id: 'eval1', name: 'Business Hours', status: 'pending' },
    { id: 'eval2', name: 'Daily Limit', status: 'pending' },
    { id: 'eval3', name: 'KYC Check', status: 'pending' },
    { id: 'prove', name: 'EIP-712 Proof', status: 'pending' },
  ]

  const [pipeline, setPipeline] = useState(demoRules)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isEvaluatingRef = useRef(false)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  const resolvePayId = useCallback(() => {
    if (!payId.trim()) return
    setResolvedName(payId)
    setStep('amount')
  }, [payId])

  const startEvaluation = useCallback(() => {
    if (isEvaluatingRef.current) return
    isEvaluatingRef.current = true

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setStep('evaluating')
    setEvalProgress(0)
    setPipeline(demoRules.map(r => ({ ...r, status: 'pending' as RuleStatus })))

    const steps = demoRules.length
    let current = 0

    intervalRef.current = setInterval(() => {
      current += 1
      setEvalProgress(current)
      setPipeline(prev =>
        prev.map((rule, i) => ({
          ...rule,
          status: i < current ? 'done' : i === current ? 'running' : 'pending',
        }))
      )

      if (current >= steps) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        isEvaluatingRef.current = false
        setTimeout(() => {
          if (parseFloat(amount) > 1000) {
            setDenyReason('Daily limit exceeded ($500 max)')
            setStep('review')
          } else {
            setStep('signing')
          }
        }, 600)
      }
    }, 500)
  }, [amount])

  const submitTx = useCallback(() => {
    setStep('success')
    setTxHash('0x7a3f...e91b')
  }, [])

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isEvaluatingRef.current = false
    setStep('who')
    setPayId('')
    setResolvedName(null)
    setAmount('')
    setAsset('ETH')
    setTxHash('')
    setEvalProgress(0)
    setDenyReason('')
    setPipeline(demoRules.map(r => ({ ...r, status: 'pending' as RuleStatus })))
  }, [])

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <Wallet className="w-10 h-10 text-[#64748B] mx-auto mb-4" />
        <h2 className={`text-lg font-semibold ${p.textMain} mb-1`}>Connect Wallet</h2>
        <p className={`text-xs ${p.textMuted}`}>Link your wallet to send payments with policy enforcement.</p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step dots — minimal, human */}
      <div className="flex items-center gap-3 mb-6">
        {['who', 'amount', 'review'].map((s, i) => {
          const isDone = step === 'amount' && i === 0 ||
            ['review', 'evaluating', 'signing', 'success'].includes(step) && i <= 1 ||
            step === 'success' && i === 2
          const isActive = step === s || (['evaluating', 'signing'].includes(step) && s === 'review')
          return (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full transition-all ${
                isDone ? 'bg-[#00D084]' : isActive ? (p.dark ? 'bg-white' : 'bg-[#0F172A]') : (p.dark ? 'bg-white/20' : 'bg-black/20')
              }`} />
              <span className={`text-[11px] font-medium capitalize transition-colors ${
                isDone || isActive ? p.textMain : p.textMuted
              }`}>
                {s}
              </span>
              {i < 2 && <div className={`w-8 h-px ${p.dark ? 'bg-white/10' : 'bg-black/10'}`} />}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: WHO */}
        {step === 'who' && (
          <motion.div key="who" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Send to</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Enter a PAY.ID or wallet address.</p>
            </div>
            <div className={`${cardBase} p-5`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative space-y-3">
                <input
                  value={payId}
                  onChange={(e) => setPayId(e.target.value)}
                  placeholder="pay.id/alice"
                  className={`w-full px-4 py-3 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors font-mono text-sm`}
                />
                <button
                  onClick={resolvePayId}
                  disabled={!payId.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: AMOUNT */}
        {step === 'amount' && (
          <motion.div key="amount" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Amount</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>How much do you want to send?</p>
            </div>

            <div className={`${cardBase} p-5`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono mb-1">
                  <div className="w-1 h-1 rounded-full bg-[#00D084]" />
                  To: {resolvedName}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      type="number"
                      placeholder="0.00"
                      className={`w-full px-4 py-3 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors font-mono text-xl`}
                    />
                    {amount && parseFloat(amount) > 0 && (
                      <div className={`mt-1 text-xs ${p.textMuted} font-mono`}>
                        ≈ {format(convert(parseFloat(amount), displayCurrency), displayCurrency)}
                      </div>
                    )}
                  </div>
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    className={`px-4 py-3 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} font-mono text-sm focus:outline-none focus:border-[#00D084]/40`}
                  >
                    <option>ETH</option>
                    <option>USDC</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`text-[11px] ${p.textMuted} font-mono`}>
                    Balance: {balance ? balanceValue.toFixed(4) : '--'} {asset}
                  </div>
                  <button
                    onClick={toggle}
                    className={`text-[11px] px-2 py-1 rounded-lg border ${p.cardBorder} ${p.textMain} hover:bg-black/5 transition-colors`}
                  >
                    {displayCurrency}
                  </button>
                </div>

                {/* Transaction Simulation Preview */}
                {amount && parseFloat(amount) > 0 && (
                  <TransactionSimulation
                    amount={amount}
                    asset={asset}
                    currentBalance={balanceValue.toFixed(4)}
                    onComplete={(result) => setSimResult(result)}
                  />
                )}

                <button
                  onClick={() => setStep('review')}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Review <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Review</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Verify details before policy evaluation.</p>
            </div>

            <div className={`${cardBase} p-5`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative space-y-3">
                {[
                  { label: 'Recipient', value: resolvedName || '' },
                  { label: 'Amount', value: `${amount} ${asset}` },
                  { label: 'Network', value: 'Hardhat · 31337' },
                  { label: 'Est. Fee', value: '~0.0001 ETH' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-1">
                    <span className={`text-[13px] ${p.textMuted}`}>{row.label}</span>
                    <span className={`text-[13px] ${p.textMain} font-mono`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {denyReason && (
              <motion.div
                initial={{ opacity: 0, x: [0, -8, 8, -8, 8, 0] }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ x: { duration: 0.4 }, opacity: { duration: 0.2 } }}
                className={`${cardBase} p-4 flex items-center gap-3`}
                style={{ background: 'rgba(239,68,68,0.06)' }}
              >
                <div className={cardBorder} style={{ borderColor: 'rgba(239,68,68,0.2)' }} />
                <X className="w-4 h-4 text-[#EF4444] shrink-0 relative" />
                <div className="relative">
                  <div className="text-[13px] font-medium text-[#EF4444]">Policy Denied</div>
                  <div className={`text-[11px] ${p.textMuted}`}>{denyReason}</div>
                </div>
              </motion.div>
            )}

            <button
              onClick={startEvaluation}
              className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl ${p.dark ? 'bg-white/6 border border-white/8' : 'bg-black/4 border border-black/8'} ${p.textMain} text-sm font-medium ${p.cardHover} transition-colors cursor-pointer`}
            >
              <Shield className="w-4 h-4 text-[#00D084]" /> Run Policy Check
            </button>
          </motion.div>
        )}

        {/* EVALUATING — THE CINEMATIC SCREEN */}
        {step === 'evaluating' && (
          <motion.div key="evaluating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Policy Engine</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Off-chain evaluation + proof generation</p>
            </div>

            <div className={`${cardBase} p-5 relative overflow-hidden`} style={cardBg}>
              <div className={cardBorder} />
              {/* Scanning line */}
              <motion.div
                className="absolute left-0 right-0 h-px bg-[#00D084]/50 z-10"
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                style={{ boxShadow: '0 0 12px rgba(0,208,132,0.4)' }}
              />
              <div className="relative space-y-2">
                {pipeline.map((rule, i) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 flex flex-col items-center shrink-0">
                      {rule.status === 'done' ? (
                        <div className="w-5 h-5 rounded-full bg-[#00D084]/15 flex items-center justify-center">
                          <Check className="w-3 h-3 text-[#00D084]" />
                        </div>
                      ) : rule.status === 'running' ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${p.dark ? 'bg-white/10' : 'bg-black/10'}`}>
                          <Loader2 className={`w-3 h-3 animate-spin ${p.textMain}`} />
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded-full ${p.dark ? 'bg-white/4' : 'bg-black/4'}`} />
                      )}
                      {i < pipeline.length - 1 && (
                        <div className={`w-px h-3 ${rule.status === 'done' ? 'bg-[#00D084]/30' : p.dark ? 'bg-white/4' : 'bg-black/4'}`} />
                      )}
                    </div>
                    <div className={`flex-1 py-2 text-[13px] transition-colors ${
                      rule.status === 'done' ? 'text-[#00D084]' : rule.status === 'running' ? p.textMain : p.textMuted
                    }`}>
                      {rule.name}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Terminal log */}
            <div className="rounded-xl p-3 font-mono text-[11px] relative overflow-hidden" style={{ background: p.terminalBg }}>
              <div className={`${p.dark ? 'text-slate-700' : 'text-slate-300'} mb-1`}>// PAY.ID SDK — evaluateAndProve()</div>
              {evalProgress >= 1 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#64748B]">&gt; context.tx.amount = {amount}</motion.div>}
              {evalProgress >= 2 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#64748B]">&gt; resolved from IPFS:QmXyZ...</motion.div>}
              {evalProgress >= 3 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00D084]">&gt; [PASS] Business Hours</motion.div>}
              {evalProgress >= 4 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00D084]">&gt; [PASS] Daily Limit</motion.div>}
              {evalProgress >= 5 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00D084]">&gt; [PASS] KYC Level 2</motion.div>}
              {evalProgress >= 6 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={p.textMain}>&gt; signed EIP-712 DecisionProof</motion.div>}
            </div>
          </motion.div>
        )}

        {/* SIGNING */}
        {step === 'signing' && (
          <motion.div key="signing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-14 h-14 rounded-full bg-[#00D084]/10 flex items-center justify-center mx-auto mb-3"
              >
                <FileCheck className="w-7 h-7 text-[#00D084]" />
              </motion.div>
              <h2 className={`text-xl font-semibold ${p.textMain}`}>Proof Generated</h2>
              <p className={`text-xs ${p.textMuted} mt-1`}>EIP-712 Decision Proof is ready.</p>
            </div>

            <div className={`${cardBase} p-4`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative">
                <div className={`text-[10px] ${p.textMuted} font-mono uppercase tracking-wider mb-1`}>DecisionProof</div>
                <div className="text-[11px] font-mono text-[#64748B] break-all">
                  0x1901...f3a2...decision(ALLOW)...sig(0x7a3b...)
                </div>
              </div>
            </div>

            <button
              onClick={submitTx}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4" /> Execute Payment
            </button>
          </motion.div>
        )}

        {/* SUCCESS — CINEMATIC */}
        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
            {/* Burst ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute left-1/2 top-24 -translate-x-1/2 w-20 h-20 rounded-full border-2 border-[#00D084] pointer-events-none"
            />
            <div className="py-6 relative">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-[#00D084]/15 border border-[#00D084]/30 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-[#00D084]" strokeWidth={3} />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-[#00D084]"
              >
                Payment Sent
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className={`text-xs ${p.textMuted} mt-1`}
              >
                {amount} {asset} to {resolvedName}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`${cardBase} p-4 text-left`}
              style={cardBg}
            >
              <div className={cardBorder} />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className={`text-[10px] ${p.textMuted} font-mono uppercase tracking-wider mb-1`}>Transaction Hash</div>
                  <div className={`text-[13px] font-mono ${p.textMain}`}>{txHash}</div>
                </div>
                <button className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}>
                  <Copy className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={reset}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] text-[#64748B] hover:${p.textMain} transition-colors`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Send Another
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
