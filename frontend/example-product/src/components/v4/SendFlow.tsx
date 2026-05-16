import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Shield,
  Wallet,
  X,
} from 'lucide-react'
import { useAccount, useBalance, useChainId, useChains } from 'wagmi'
import { formatUnits, isAddress, parseEther, parseUnits } from 'viem'
import { usePayIDFlow } from 'payid-react'
import { useMultiCurrency } from '../../hooks/useMultiCurrency'
import { useV4Palette } from './theme'
import TransactionSimulation from './TransactionSimulation'
import PolicyScanning from './PolicyScanning'
import type { Address } from 'viem'
import type { PayIDFlowStatus } from 'payid-react'
import { useTxHistory } from '@/hooks/useTxHistory'
import { formatNumber } from '@/lib/utils'
import { getTokenConfig, getTokenPriceOracle } from '@/constants/tokens'

type RuleStatus = 'pending' | 'running' | 'done'

type Step = 'who' | 'amount' | 'review' | 'evaluating' | 'signing' | 'success'

const cardBase = 'rounded-2xl relative overflow-hidden'

const FLOW_STEPS = [
  { id: 'ctx', name: 'Build Context' },
  { id: 'resolve', name: 'Fetch Rules (IPFS)' },
  { id: 'evaluate', name: 'WASM Evaluate' },
  { id: 'decision', name: 'Decision Proof' },
  { id: 'sign', name: 'EIP-712 Sign' },
  { id: 'submit', name: 'Submit Tx' },
]

function getPipeline(
  s: PayIDFlowStatus,
): Array<{ id: string; name: string; status: RuleStatus }> {
  let doneUpTo = -1,
    runningAt = -1
  if (s === 'fetching-rule') {
    runningAt = 0
  } else if (s === 'evaluating') {
    doneUpTo = 0
    runningAt = 1
  } else if (s === 'proving') {
    doneUpTo = 1
    runningAt = 2
  } else if (s === 'approving') {
    doneUpTo = 2
    runningAt = 3
  } else if (s === 'awaiting-wallet') {
    doneUpTo = 3
    runningAt = 4
  } else if (s === 'confirming') {
    doneUpTo = 4
    runningAt = 5
  } else if (s === 'success') {
    doneUpTo = 5
  }
  return FLOW_STEPS.map((step, i) => ({
    ...step,
    status: (i <= doneUpTo
      ? 'done'
      : i === runningAt
        ? 'running'
        : 'pending') as RuleStatus,
  }))
}

export default function SendFlow() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const chainId = useChainId()
  const chains = useChains()
  const currentChain = chains.find((c) => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'
  const p = useV4Palette()

  const CHAIN_NAMES: Record<number, string> = {
    31337: 'Hardhat',
    16601: '0G Newton Fork',
    16602: '0G Galileo',
    11155111: 'Sepolia',
    84532: 'Base Sepolia',
    4202: 'Lisk Sepolia',
    10143: 'Monad',
    1287: 'Moonbase',
    80002: 'Amoy',
  }
  const chainName = CHAIN_NAMES[chainId] ?? `Chain #${chainId}`
  const cardBorder = `absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`
  const cardBg = { background: p.cardBg }

  const { displayCurrency, convert, format, toggle } = useMultiCurrency()
  const { addTx } = useTxHistory()
  const [step, setStep] = useState<Step>('who')
  const [payId, setPayId] = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState(nativeSymbol)
  const [txHash, setTxHash] = useState('')
  const [denyReason, setDenyReason] = useState('')

  const {
    status: flowStatus,
    isPending: flowIsPending,
    txHash: flowTxHash,
    denyReason: flowDenyReason,
    error: flowError,
    execute,
    reset: resetFlow,
  } = usePayIDFlow()

  const balanceValue = balance
    ? parseFloat(formatUnits(balance.value, balance.decimals))
    : 0
  const pipeline = getPipeline(flowStatus)

  const resolvePayId = useCallback(() => {
    if (!payId.trim()) return
    setResolvedName(payId)
    setStep('amount')
  }, [payId])

  const handleRunPolicy = useCallback(() => {
    const receiver = payId.trim()
    if (!isAddress(receiver)) {
      setDenyReason(
        'Enter a valid wallet address (0x...) as receiver to run policy evaluation.',
      )
      return
    }
    setDenyReason('')
    setStep('evaluating')

    const token = getTokenConfig(chainId, asset)
    const assetAddress = (token?.address ?? '0x0000000000000000000000000000000000000000') as Address
    const tokenDecimals = token?.decimals ?? 18
    const amountRaw = tokenDecimals === 18
      ? parseEther(amount || '0')
      : parseUnits(amount || '0', tokenDecimals)

    const tokenPriceOracle = getTokenPriceOracle(chainId, asset)

    const execParams: any = {
      receiver: receiver,
      asset: assetAddress,
      amount: amountRaw,
      payId: address ? `${address}@pay.id` : 'anon@pay.id',
    }

    // Inject oracle price for ERC20 tokens so rule engine can evaluate oracle.txValueUsd
    if (tokenPriceOracle) {
      execParams.tokenDecimals = tokenDecimals
      execParams.tokenPriceOracle = tokenPriceOracle
      // On-chain USD minimum guard (8 decimals). Remove if contract not yet redeployed.
      execParams.minUsdValue = 4500000000n // $45.00
    }

    execute(execParams)
  }, [payId, amount, address, execute, chainId, asset])

  useEffect(() => {
    if (flowStatus === 'success' && flowTxHash) {
      setTxHash(flowTxHash)
      setStep('success')
      addTx({
        id: flowTxHash,
        type: 'sent',
        to: resolvedName ?? payId,
        from: address ?? '',
        amount,
        asset,
        timestamp: Date.now(),
      })
    }
    if (flowStatus === 'denied') {
      setDenyReason(flowDenyReason ?? 'Policy denied this transaction')
      setStep('review')
    }
    if (flowStatus === 'error') {
      const rawErr = String(flowError ?? 'Transaction failed')
      // Show only the first line of long viem errors; the full text is available in console
      const shortErr = rawErr.split('\n')[0].split('Contract Call:')[0].trim()
      setDenyReason(shortErr || rawErr)
      // Stay on signing step if error happened during/after wallet prompt, else go back to review
      if (step !== 'signing') setStep('review')
    }
    if (flowStatus === 'awaiting-wallet' || flowStatus === 'confirming')
      setStep('signing')
  }, [flowStatus, flowTxHash])

  useEffect(() => {
    setAsset(nativeSymbol)
  }, [nativeSymbol])

  const reset = useCallback(() => {
    resetFlow()
    setStep('who')
    setPayId('')
    setResolvedName(null)
    setAmount('')
    setAsset(nativeSymbol)
    setTxHash('')
    setDenyReason('')
  }, [resetFlow])

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <Wallet className="w-10 h-10 text-[#64748B] mx-auto mb-4" />
        <h2 className={`text-lg font-semibold ${p.textMain} mb-1`}>
          Connect Wallet
        </h2>
        <p className={`text-xs ${p.textMuted}`}>
          Link your wallet to send payments with policy enforcement.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step dots — minimal, human */}
      <div className="flex items-center gap-3 mb-6">
        {['who', 'amount', 'review'].map((s, i) => {
          const isDone =
            (step === 'amount' && i === 0) ||
            (['review', 'evaluating', 'signing', 'success'].includes(step) &&
              i <= 1) ||
            (step === 'success' && i === 2)
          const isActive =
            step === s ||
            (['evaluating', 'signing'].includes(step) && s === 'review')
          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  isDone
                    ? 'bg-[#00D084]'
                    : isActive
                      ? p.dark
                        ? 'bg-white'
                        : 'bg-[#0F172A]'
                      : p.dark
                        ? 'bg-white/20'
                        : 'bg-black/20'
                }`}
              />
              <span
                className={`text-[11px] font-medium capitalize transition-colors ${
                  isDone || isActive ? p.textMain : p.textMuted
                }`}
              >
                {s}
              </span>
              {i < 2 && (
                <div
                  className={`w-8 h-px ${p.dark ? 'bg-white/10' : 'bg-black/10'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: WHO */}
        {step === 'who' && (
          <motion.div
            key="who"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-4"
          >
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Send to</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                Enter a PAY.ID or wallet address.
              </p>
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
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-4"
          >
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Amount</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                How much do you want to send?
              </p>
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
                        ≈{' '}
                        {format(
                          convert(parseFloat(amount), displayCurrency),
                          displayCurrency,
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    className={`px-4 py-3 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} font-mono text-sm focus:outline-none focus:border-[#00D084]/40`}
                  >
                    <option>{nativeSymbol}</option>
                    <option>USDC</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`text-[11px] ${p.textMuted} font-mono`}>
                    Balance: {balance ? formatNumber(balanceValue, 4) : '--'}{' '}
                    {asset}
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
                    currentBalance={formatNumber(balanceValue, 4)}
                    onComplete={() => {}}
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
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-4"
          >
            <div>
              <h2 className={`text-lg font-semibold ${p.textMain}`}>Review</h2>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                Verify details before policy evaluation.
              </p>
            </div>

            <div className={`${cardBase} p-5`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative space-y-3">
                {[
                  { label: 'Recipient', value: resolvedName || '' },
                  { label: 'Amount', value: `${amount} ${asset}` },
                  { label: 'Network', value: `${chainName} · ${chainId}` },
                  {
                    label: 'Est. Fee',
                    value: `~0.0001 ${nativeSymbol} (estimate)`,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-1"
                  >
                    <span className={`text-[13px] ${p.textMuted}`}>
                      {row.label}
                    </span>
                    <span className={`text-[13px] ${p.textMain} font-mono`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {denyReason && (
              <motion.div
                initial={{ opacity: 0, x: [0, -8, 8, -8, 8, 0] }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  x: { duration: 0.4 },
                  opacity: { duration: 0.2 },
                }}
                className={`${cardBase} p-4 flex items-center gap-3`}
                style={{ background: 'rgba(239,68,68,0.06)' }}
              >
                <div
                  className={cardBorder}
                  style={{ borderColor: 'rgba(239,68,68,0.2)' }}
                />
                <X className="w-4 h-4 text-[#EF4444] shrink-0 relative" />
                <div className="relative">
                  <div className="text-[13px] font-medium text-[#EF4444]">
                    Policy Denied
                  </div>
                  <div className={`text-[11px] ${p.textMuted}`}>
                    {denyReason}
                  </div>
                </div>
              </motion.div>
            )}

            <button
              onClick={handleRunPolicy}
              disabled={flowIsPending}
              className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl ${p.dark ? 'bg-white/6 border border-white/8' : 'bg-black/4 border border-black/8'} ${p.textMain} text-sm font-medium ${p.cardHover} transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {flowIsPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Evaluating…
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-[#00D084]" /> Run Policy Check
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* EVALUATING — THE CINEMATIC SCREEN */}
        {step === 'evaluating' && (
          <motion.div
            key="evaluating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PolicyScanning
              pipeline={pipeline}
              ruleEvaluations={[
                {
                  id: 'min_amount',
                  name: 'Minimum Amount Check',
                  status: 'passed',
                  message: 'Amount meets minimum requirement',
                },
                {
                  id: 'daily_limit',
                  name: 'Daily Spending Limit',
                  status: 'passed',
                  message: 'Within daily limit',
                },
                {
                  id: 'kyc_level',
                  name: 'KYC Verification',
                  status: 'running',
                },
              ]}
              riskScore={25}
            />
          </motion.div>
        )}

        {/* SIGNING */}
        {step === 'signing' && (
          <motion.div
            key="signing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${flowStatus === 'error' ? 'bg-red-500/10' : 'bg-[#00D084]/10'}`}
              >
                {flowStatus === 'error' ? (
                  <X className="w-7 h-7 text-red-400" />
                ) : (
                  <Loader2 className="w-7 h-7 text-[#00D084] animate-spin" />
                )}
              </motion.div>
              <h2
                className={`text-xl font-semibold ${flowStatus === 'error' ? 'text-red-400' : p.textMain}`}
              >
                {flowStatus === 'error'
                  ? 'Transaction Failed'
                  : flowStatus === 'confirming'
                    ? 'Confirming…'
                    : 'Awaiting Signature'}
              </h2>
              <p className={`text-xs ${p.textMuted} mt-1`}>
                {flowStatus === 'error'
                  ? 'The transaction was rejected or reverted.'
                  : flowStatus === 'confirming'
                    ? 'Waiting for on-chain confirmation.'
                    : 'Check your wallet — sign the EIP-712 Decision Proof.'}
              </p>
            </div>

            {flowStatus === 'error' && denyReason && (
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-red-400/60">
                  Revert Reason
                </p>
                <p className="text-xs text-red-400 wrap-break-word leading-relaxed">
                  {denyReason}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      String(flowError ?? denyReason),
                    )
                  }}
                  className="text-[10px] text-red-400/50 hover:text-red-400 underline cursor-pointer transition-colors"
                >
                  Copy full error
                </button>
              </div>
            )}

            <div className={`${cardBase} p-4`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative">
                <div
                  className={`text-[10px] ${p.textMuted} font-mono uppercase tracking-wider mb-1`}
                >
                  Status
                </div>
                <div className={`text-sm font-medium ${p.textMain}`}>
                  {flowStatus === 'error'
                    ? 'Transaction failed. You can retry or go back to edit.'
                    : flowStatus === 'confirming'
                      ? 'Transaction submitted — waiting for block confirmation.'
                      : 'Please sign the EIP-712 typed data in your wallet extension.'}
                </div>
              </div>
            </div>

            {flowStatus === 'error' && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    reset()
                    setStep('review')
                  }}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${p.cardBorder} ${p.textMuted}`}
                >
                  ← Edit Payment
                </button>
                <button
                  onClick={() => {
                    resetFlow()
                    handleRunPolicy()
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#00D084]"
                >
                  Retry
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* SUCCESS — CINEMATIC */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5 text-center"
          >
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
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
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
                  <div
                    className={`text-[10px] ${p.textMuted} font-mono uppercase tracking-wider mb-1`}
                  >
                    Transaction Hash
                  </div>
                  <div className={`text-[13px] font-mono ${p.textMain}`}>
                    {txHash}
                  </div>
                </div>
                <button
                  className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
                >
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
