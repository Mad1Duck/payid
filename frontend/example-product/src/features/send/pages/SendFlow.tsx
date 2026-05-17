import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Shield,
  Wallet,
  X,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { getTokenConfig } from '@/constants/tokens'
import { cardBase } from '@/features/send/constants'
import TransactionSimulation from '@/components/v4/TransactionSimulation'
import PolicyScanning from '@/components/v4/PolicyScanning'
import TargetPolicyInfo from '../components/TargetPolicyInfo'
import { useSendFlow } from '../hooks/useSendFlow'

function shortenAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function explainRule(condition: string): string {
  if (condition.includes('oracle.txValueUsd')) {
    if (condition.includes('>=')) {
      const val = condition.split('>=')[1]?.trim();
      const usd = val ? (Number(val) / 1e8).toFixed(2) : '?';
      return `⚠️ INVERTED OPERATOR: This rule REJECTS transactions worth MORE than $${usd} USD. "Minimum" rules should use "<=" not ">=".`;
    }
    if (condition.includes('<=')) {
      const val = condition.split('<=')[1]?.trim();
      const usd = val ? (Number(val) / 1e8).toFixed(2) : '?';
      return `Transaction must be worth AT LEAST $${usd} USD.`;
    }
    return 'Checks the USD value of this transaction.';
  }
  if (condition.includes('tx.amount')) {
    return 'Checks the token amount of this transaction.';
  }
  if (condition.includes('env.timestamp')) {
    return 'Checks the time this transaction is sent.';
  }
  if (condition.includes('oracle.kycLevel')) {
    return 'Requires sender KYC verification.';
  }
  if (condition.includes('oracle.country')) {
    return 'Checks sender country/region.';
  }
  if (condition.includes('risk.score')) {
    return 'Checks risk score of this transaction.';
  }
  if (condition.includes('tx.sender')) {
    return 'Checks sender wallet address.';
  }
  if (condition.includes('tx.chainId')) {
    return 'Checks which blockchain this is sent on.';
  }
  if (condition.includes('intent.type')) {
    return 'Checks payment method (QR, Direct, etc).';
  }
  return 'Evaluates a condition on this transaction.';
}

export default function SendFlow() {
  const {
    isConnected, balance, chainId, chainName, nativeSymbol, p,
    displayCurrency, convert, format, toggle,
    step, setStep,
    payId, setPayId,
    resolvedName,
    amount, setAmount,
    asset, setAsset,
    txHash,
    denyReason, setDenyReason,
    flowStatus, flowIsPending, flowError,
    balanceValue, pipeline,
    targetPolicy, preflightWarning,
    resolvePayId, handleRunPolicy, reset, copy,
  } = useSendFlow()

  const cardBorder = `absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`
  const cardBg = { background: p.cardBg }

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('who')}
                className={`p-2 rounded-lg ${p.cardBorder} ${p.textMuted} hover:bg-black/5 transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className={`text-lg font-semibold ${p.textMain}`}>Amount</h2>
                <p className={`text-xs ${p.textMuted} mt-0.5`}>
                  How much do you want to send?
                </p>
              </div>
            </div>

            <div className={`${cardBase} p-5`} style={cardBg}>
              <div className={cardBorder} />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono mb-1">
                  <div className="w-1 h-1 rounded-full bg-[#00D084]" />
                  To: {resolvedName}
                </div>

                {/* Target Policy Info */}
                {targetPolicy && (
                  <TargetPolicyInfo policy={targetPolicy} p={p} />
                )}

                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setDenyReason('');
                      }}
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('amount')}
                className={`p-2 rounded-lg ${p.cardBorder} ${p.textMuted} hover:bg-black/5 transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className={`text-lg font-semibold ${p.textMain}`}>Review</h2>
                <p className={`text-xs ${p.textMuted} mt-0.5`}>
                  Verify details before policy evaluation.
                </p>
              </div>
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

            {preflightWarning && !denyReason && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${cardBase} p-4 flex items-start gap-3`}
                style={{ background: 'rgba(245,158,11,0.06)' }}
              >
                <div
                  className={cardBorder}
                  style={{ borderColor: 'rgba(245,158,11,0.2)' }}
                />
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 relative mt-0.5" />
                <div className="relative">
                  <div className="text-[13px] font-medium text-[#F59E0B]">
                    Warning: Policy May Reject This
                  </div>
                  <div className={`text-[11px] ${p.textMuted}`}>
                    {preflightWarning}
                  </div>
                </div>
              </motion.div>
            )}

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
            className="space-y-4"
          >
            <PolicyScanning
              pipeline={pipeline}
              onBack={() => {
                setStep('review');
                setDenyReason('');
              }}
              backDisabled={flowIsPending}
              ruleEvaluations={
                targetPolicy?.ruleRefs && targetPolicy.ruleRefs.length > 0
                  ? targetPolicy.ruleRefs.map((ref) => {
                      const isDenied = flowStatus === 'denied';
                      const isEvaluating = ['fetching-rule', 'evaluating', 'proving'].includes(flowStatus);
                      const ruleName = `Rule NFT ${shortenAddr(ref.ruleNFT)} #${String(ref.tokenId)}`;

                      // Always show rule explanation for denied transactions
                      let message: string;
                      if (isDenied) {
                        const hasOracle = !!getTokenConfig(chainId, asset)?.oracleKey;

                        // When token has no oracle but recipient has rules, it's almost certainly a USD rule
                        if (!hasOracle) {
                          const condition = 'oracle.txValueUsd >= 1000000000';
                          const plainEnglish = explainRule(condition);
                          const explanation = `\n\nWhy this failed:\n• You're sending ${asset}\n• ${asset} has no price oracle on chain ${chainId}\n• The recipient's rule checks USD value\n• Without a price, the rule cannot evaluate → REJECT`;
                          message = `Condition: ${condition}\n${plainEnglish}${explanation}\n\nResult: ${denyReason}`;
                        } else {
                          message = `Recipient has an active rule that rejected this transaction.\n\nResult: ${denyReason}`;
                        }
                      } else if (isEvaluating) {
                        message = 'Evaluating rule from IPFS...';
                      } else {
                        message = 'Rule loaded from IPFS';
                      }

                      return {
                        id: String(ref.tokenId),
                        name: ruleName,
                        status: isDenied ? 'failed' : isEvaluating ? 'running' : 'pending' as const,
                        message,
                      };
                    })
                  : [
                      {
                        id: 'no-rules',
                        name: 'No rules configured',
                        status: 'passed' as const,
                        message: 'Recipient has no active policy rules',
                      },
                    ]
              }
              riskScore={flowStatus === 'denied' ? 80 : 25}
              errorDetail={denyReason || null}
            />

            {denyReason && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setStep('amount');
                    setDenyReason('');
                  }}
                  className={`text-[11px] px-3 py-1.5 rounded-lg ${p.cardBorder} ${p.textMain} hover:bg-black/5 transition-colors`}
                >
                  Modify Transaction
                </button>
              </div>
            )}
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
                    copy(String(flowError ?? denyReason))
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
                    reset()
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
