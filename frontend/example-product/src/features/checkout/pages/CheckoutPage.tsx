import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Wallet, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink 
} from 'lucide-react';
import { useCheckout } from '../hooks/useCheckout';
import PremiumButton from '@/components/v4/PremiumButton';
import { shortAddr } from '@/features/shared';
import { formatUnits } from 'viem';
import { useState, useEffect } from 'react';

// Custom hook to calculate remaining time
function useCountdown(expiresAt: number | null) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('');
      return;
    }

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hrs = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;

      const formatted = hrs > 0 
        ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins}:${secs.toString().padStart(2, '0')}`;

      setTimeLeft(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}

export default function CheckoutPage() {
  const { isConnected } = useAccount();
  const {
    p,
    status,
    errorMsg,
    policy,
    isExpired,
    isSignatureValid,
    amount,
    amountError,
    handleAmountChange,
    handleConfirmPay,
    flow,
    reset,
  } = useCheckout();

  const [copiedPayId, setCopiedPayId] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const timeLeft = useCountdown(policy?.expiresAt ? Number(policy.expiresAt) : null);

  const handleCopyText = (text: string, isAddr: boolean) => {
    navigator.clipboard.writeText(text);
    if (isAddr) {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } else {
      setCopiedPayId(true);
      setTimeout(() => setCopiedPayId(false), 2000);
    }
  };

  const getStatusBadge = () => {
    if (isExpired || timeLeft === 'Expired') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/20 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> Expired
        </span>
      );
    }
    if (!isSignatureValid) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-semibold border border-yellow-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> Unverified Sig
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D084]/15 text-[#00D084] text-xs font-semibold border border-[#00D084]/20">
        <ShieldCheck className="w-3.5 h-3.5" /> Signature Verified
      </span>
    );
  };

  // State-based view rendering
  if (status === 'loading') {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#00D084] animate-spin mx-auto" />
        <p className={`text-sm ${p.textMuted}`}>Decoding PAY.ID payment invoice...</p>
      </div>
    );
  }

  if (status === 'invalid-payload') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20 space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${p.textMain}`}>Invalid Payload</h2>
          <p className={`text-sm ${p.textMuted} mt-2 px-4`}>
            {errorMsg || 'The checkout link is corrupt or the Session Policy payload is unrecognized.'}
          </p>
        </div>
        <div className="pt-2">
          <a
            href="/v4/app/receive"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors"
          >
            Back to Receive
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Glow Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D084]/10 text-[#00D084] text-xs font-bold uppercase tracking-wider">
          <Globe className="w-3.5 h-3.5" /> PAY.ID On-Chain Checkout
        </span>
        <h1 className={`text-3xl font-extrabold tracking-tight ${p.textMain}`}>
          Invoice & Payment Rules
        </h1>
        <p className={`text-sm ${p.textMuted}`}>
          Settle payments safely directly on-chain backed by recipient policy guardrails.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Invoice details & EIP-712 Session Policy */}
        <div className="md:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-20"
            style={{ background: p.glass.bg, border: p.glass.border }}
          >
            <div className={`absolute inset-0 rounded-3xl border ${p.cardBorder}`} />
            
            <div className="relative space-y-6">
              {/* Receiver Head */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${p.textMuted}`}>Recipient</span>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-mono font-bold ${p.textMain}`}>
                      {policy?.payId ? `${shortAddr(policy.receiver)}@pay.id` : 'connect@pay.id'}
                    </h3>
                    <button
                      onClick={() => handleCopyText(policy?.payId || '', false)}
                      className={`p-1 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
                    >
                      {copiedPayId ? <Check className="w-3.5 h-3.5 text-[#00D084]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-mono ${p.textMuted}`}>
                      {shortAddr(policy?.receiver || '')}
                    </span>
                    <button
                      onClick={() => handleCopyText(policy?.receiver || '', true)}
                      className={`p-0.5 rounded ${p.cardHover} transition-colors cursor-pointer`}
                    >
                      {copiedAddr ? <Check className="w-3 h-3 text-[#00D084]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                    </button>
                  </div>
                </div>
                {getStatusBadge()}
              </div>

              {/* Policy Limits Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-2xl border ${p.cardBorder} bg-white/3 space-y-1`}>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#00D084]" />
                    <span className={`text-[10px] font-bold uppercase ${p.textMuted}`}>Max Limit</span>
                  </div>
                  <div className={`text-sm font-bold ${p.textMain}`}>
                    {policy ? `${formatUnits(BigInt(policy.maxAmount), 18)} ETH` : 'Unlimited'}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border ${p.cardBorder} bg-white/3 space-y-1`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#00D084]" />
                      <span className={`text-[10px] font-bold uppercase ${p.textMuted}`}>Expiry Time</span>
                    </div>
                    {timeLeft && timeLeft !== 'Expired' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D084]/10 text-[#00D084] font-mono font-bold animate-pulse">
                        {timeLeft} left
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-medium ${p.textMain} truncate`}>
                    {policy ? new Date(policy.expiresAt * 1000).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Policy EIP-712 Detail Info */}
              <div className={`p-4 rounded-2xl border ${p.cardBorder} bg-white/2 space-y-3`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00D084]" />
                  <span className={`text-xs font-semibold ${p.textMain}`}>EIP-712 Session Protocol</span>
                </div>
                
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className={p.textMuted}>Verifier Contract:</span>
                    <span className={`${p.textMain} text-right`}>{shortAddr(policy?.verifyingContract || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={p.textMuted}>Rule Set Hash:</span>
                    <span className={`${p.textMain} text-right`}>{policy?.ruleSetHash ? `${policy.ruleSetHash.slice(0, 10)}...` : 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={p.textMuted}>Policy Nonce:</span>
                    <span className={`${p.textMain} text-right`}>{policy?.policyNonce ? `${policy.policyNonce.slice(0, 10)}...` : 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Payment Form & Live Evaluation */}
        <div className="md:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-20"
            style={{ background: p.glass.bg, border: p.glass.border }}
          >
            <div className={`absolute inset-0 rounded-3xl border ${p.cardBorder}`} />

            <div className="relative space-y-5">
              <h3 className={`text-sm font-semibold ${p.textMain}`}>Payment Form</h3>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-medium ${p.textMuted}`}>Payment Amount (ETH)</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={status === 'paying' || status === 'success' || isExpired || timeLeft === 'Expired'}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`w-full pl-3 pr-12 py-3 rounded-xl border ${p.inputBg} ${p.inputBorder} ${p.textMain} focus:outline-none focus:border-[#00D084]/50 text-base font-semibold transition-colors`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748B]">ETH</span>
                </div>
                {amountError && (
                  <p className="text-red-400 text-xs mt-1">{amountError}</p>
                )}
              </div>

              {/* Guardrails / Policy status */}
              <div className={`p-4 rounded-2xl border ${p.cardBorder} bg-white/2 space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${p.textMain}`}>Recipient Guardrail Status</span>
                  {flow.status === 'idle' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">Not Checked</span>
                  )}
                  {flow.status === 'fetching-rule' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse">Fetching Rules</span>
                  )}
                  {flow.status === 'evaluating' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 animate-pulse">Evaluating</span>
                  )}
                  {flow.decision === 'ALLOW' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#00D084]/15 border border-[#00D084]/20 text-[#00D084] font-bold">ALLOW (Approved)</span>
                  )}
                  {flow.decision === 'DENY' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-bold">DENY (Rejected)</span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  {flow.status === 'idle' && (
                    <p className="text-[11px] leading-relaxed">Enter a payment amount above to run a real-time policy evaluation against the recipient's combined-rules.</p>
                  )}
                  {flow.decision === 'ALLOW' && (
                    <div className="flex gap-2 items-start text-xs text-[#00D084] bg-[#00D084]/5 p-2.5 rounded-xl border border-[#00D084]/10">
                      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-[11px]">All rules satisfied! This payment is permitted by the recipient's on-chain policy.</p>
                    </div>
                  )}
                  {flow.decision === 'DENY' && (
                    <div className="flex gap-2 items-start text-xs text-red-400 bg-red-500/5 p-2.5 rounded-xl border border-red-500/10">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-[11px] font-mono leading-relaxed">
                        Denial Reason: <span className="font-sans text-white/90 block mt-1">{flow.denyReason || 'Violates recipient\'s policy boundaries.'}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {!isConnected ? (
                <PremiumButton className="w-full flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer">
                  <Wallet className="w-4 h-4" /> Connect Wallet
                </PremiumButton>
              ) : (
                <div className="space-y-2">
                  <PremiumButton
                    onClick={handleConfirmPay}
                    disabled={
                      isExpired || 
                      timeLeft === 'Expired' ||
                      !isSignatureValid || 
                      !!amountError || 
                      status === 'paying' || 
                      status === 'success'
                    }
                    className="w-full py-3 text-sm flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                  >
                    {status === 'paying' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> processing in Wallet...
                      </>
                    ) : status === 'success' ? (
                      <>
                        <Check className="w-4 h-4 text-white" /> Payment Successful!
                      </>
                    ) : isExpired || timeLeft === 'Expired' ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-white" /> Policy Expired
                      </>
                    ) : (
                      <>
                        Confirm Payment <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </PremiumButton>

                  {status === 'success' && flow.txHash && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-2 text-center"
                    >
                      <a
                        href={`https://chainscan-newton.0g.ai/tx/${flow.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#00D084] hover:underline"
                      >
                        View Transaction Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    </motion.div>
                  )}

                  {(status === 'error' || status === 'denied') && (
                    <div className="text-center pt-1">
                      <button
                        onClick={reset}
                        className={`text-xs font-semibold ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer flex items-center gap-1 mx-auto`}
                      >
                        <RefreshCw className="w-3 h-3" /> Reset Form
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
