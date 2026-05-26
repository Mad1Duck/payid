import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  QrCode,
  Copy,
  Share2,
  Wallet,
  ChevronRight,
  Check,
  Download,
  RefreshCw,
  Clock,
  Link2,
  Zap,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared'
import { useReceivePage } from '../hooks/useReceivePage'

// ── Countdown hook ──────────────────────────────────────────────
function useCountdown(expiresAt: number | null, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('')
      setIsExpired(false)
      return
    }

    const update = () => {
      const diff = expiresAt - Math.floor(Date.now() / 1000)
      if (diff <= 0) {
        setTimeLeft('Expired')
        setIsExpired(true)
        onExpire?.()
        return
      }
      setIsExpired(false)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setTimeLeft(
        h > 0
          ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
          : `${m}:${s.toString().padStart(2, '0')}`,
      )
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return { timeLeft, isExpired }
}

// ── Preset chip component ───────────────────────────────────────
function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer
        ${active ? 'bg-[#00D084]/20 text-[#00D084] ring-1 ring-[#00D084]/30' : 'bg-white/5 text-[#64748B] hover:bg-white/10'}
      `}
    >
      {label}
    </button>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function ReceivePage() {
  const { isConnected, chain } = useAccount()
  const nativeSymbol = chain?.nativeCurrency?.symbol ?? 'ETH'
  const {
    p,
    address,
    payId,
    displayPayId,
    walletAddress,
    copiedPayId,
    copiedWallet,
    showAddress,
    setShowAddress,
    status,
    payload,
    qrDataUrl,
    qrError,
    expiresAt,
    reset,
    maxAmount,
    setMaxAmount,
    expiryMin,
    setExpiryMin,
    handleGenerate,
    handleSaveQR,
    handleShare,
    handleCopyPayId,
    handleCopyWallet,
  } = useReceivePage()

  const { timeLeft, isExpired } = useCountdown(expiresAt, reset)

  // Simple QR = payment URL, no signing needed
  const simpleQrUrl = useMemo(() => {
    const paymentUrl = `${window.location.origin}/v4/app/send?to=${encodeURIComponent(payId)}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(paymentUrl)}&format=png&ecc=M`
  }, [payId])

  const hasSecureQr = !!payload
  const activeQrUrl = hasSecureQr ? (qrDataUrl || simpleQrUrl) : simpleQrUrl

  // Convert expiryMin to human label
  const expiryLabel = (() => {
    const m = Number(expiryMin)
    if (m <= 15) return '15 min'
    if (m <= 60) return '1 hour'
    if (m <= 1440) return '24 hours'
    return '7 days'
  })()

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-24"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#00D084]/10 border border-[#00D084]/20 flex items-center justify-center mx-auto mb-5">
          <Wallet className="w-7 h-7 text-[#00D084]" />
        </div>
        <h2 className={`text-xl font-bold ${p.textMain} mb-2`}>
          Connect Your Wallet
        </h2>
        <p className={`text-sm ${p.textMuted} max-w-xs mx-auto`}>
          Connect to instantly generate your PayID QR code and start receiving payments.
        </p>
      </motion.div>
    )
  }

  const isLoading =
    status === 'signing' || status === 'encoding' || status === 'rendering'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Hero QR Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #00D084 0%, #00B86E 50%, #009E5C 100%)',
        }}
      >
        {/* Status badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-400' : hasSecureQr ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
            <span className="text-white/90 text-xs font-medium">
              {isExpired ? 'Expired — regenerate' : hasSecureQr ? 'Secure' : 'Simple QR'}
            </span>
          </div>
          {hasSecureQr && timeLeft && !isExpired && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/10 text-white text-[10px] font-mono font-bold backdrop-blur-md">
              <Clock className="w-3 h-3" />
              {timeLeft}
            </div>
          )}
        </div>

        {/* QR Image */}
        <div className="relative w-56 h-56 mx-auto mb-5 rounded-2xl bg-white p-3 shadow-xl">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-3 border-[#00D084]/20 border-t-[#00D084] rounded-full"
              />
            </div>
          ) : (
            <img
              src={activeQrUrl}
              alt="PayID QR"
              className="w-full h-full object-contain rounded-xl"
            />
          )}
        </div>

        {/* Identity */}
        <div className="text-center">
          <div className="text-white text-lg font-mono font-semibold tracking-tight">
            {displayPayId}
          </div>
          <div className="text-white/50 text-xs font-mono mt-0.5">
            {walletAddress ? shortAddr(walletAddress) : '—'}
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      {/* ── Quick Controls ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl p-4 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="space-y-3.5">
          {/* Amount */}
          <div>
            <label className={`text-[11px] font-medium ${p.textMuted} block mb-1.5`}>
              Max Amount ({nativeSymbol})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Unlimited"
                className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30`}
              />
              <div className="flex flex-wrap gap-1.5 items-center">
                {['5', '10', '50', '100'].map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    active={maxAmount === v}
                    onClick={() => setMaxAmount(v)}
                  />
                ))}
                <Chip
                  label="∞"
                  active={!maxAmount}
                  onClick={() => setMaxAmount('')}
                />
              </div>
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className={`text-[11px] font-medium ${p.textMuted} block mb-1.5`}>
              Expires in
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: '15 min', val: '15' },
                { label: '1 hour', val: '60' },
                { label: '24 hours', val: '1440' },
                { label: '7 days', val: '10080' },
              ].map(({ label, val }) => (
                <Chip
                  key={val}
                  label={label}
                  active={expiryMin === val}
                  onClick={() => setExpiryMin(val)}
                />
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex gap-2 pt-1">
            <PremiumButton
              onClick={handleGenerate}
              disabled={!address || isLoading}
              isLoading={isLoading}
              icon={<Zap className="w-4 h-4" />}
              className="flex-1"
            >
              {hasSecureQr ? 'Regenerate Secure QR' : 'Create Secure QR'}
            </PremiumButton>
            {payload && (
              <button
                onClick={reset}
                className="px-3 py-2.5 rounded-xl border border-[#64748B]/20 text-[#64748B] hover:bg-[#64748B]/5 cursor-pointer transition-colors"
                title="Clear"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Payment Link (always visible) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl p-4 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-3.5 h-3.5 text-[#00D084]" />
          <span className={`text-xs font-semibold ${p.textMain}`}>
            Payment Link
          </span>
          {payload && (
            <span className={`text-[10px] ${p.textMuted} ml-auto`}>
              {expiryLabel} remaining
            </span>
          )}
        </div>

        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl ${p.dark ? 'bg-white/5' : 'bg-black/3'} border ${p.cardBorder}`}
        >
          <div className="w-8 h-8 rounded-full bg-[#00D084]/15 flex items-center justify-center shrink-0">
            <span className="text-[#00D084] font-bold text-xs">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-mono font-medium ${p.textMain} truncate`}>
              {displayPayId}
            </div>
            <div className={`text-[10px] ${p.textMuted}`}>
              {payload ? 'Anyone with this link can pay you' : 'Generate a QR to get a shareable link'}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyPayId}
              className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              title="Copy link"
            >
              {copiedPayId ? (
                <Check className="w-4 h-4 text-[#00D084]" />
              ) : (
                <Copy className="w-4 h-4 text-[#64748B]" />
              )}
            </button>
            <button
              onClick={handleShare}
              className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              title="Share"
            >
              <Share2 className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Wallet Address (collapsible) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl p-4 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <button
          onClick={() => setShowAddress(!showAddress)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span className={`text-xs font-semibold ${p.textMain}`}>
              Wallet Address
            </span>
            <span className={`text-[10px] ${p.textMuted}`}>
              For advanced users
            </span>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-[#64748B] transition-transform ${showAddress ? 'rotate-90' : ''}`}
          />
        </button>

        <AnimatePresence>
          {showAddress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`mt-3 flex items-center gap-2.5 p-3 rounded-xl ${p.dark ? 'bg-white/5' : 'bg-black/3'} border ${p.cardBorder}`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono ${p.textMain} truncate`}>
                    {walletAddress || '—'}
                  </div>
                </div>
                <button
                  onClick={handleCopyWallet}
                  className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
                >
                  {copiedWallet ? (
                    <Check className="w-4 h-4 text-[#00D084]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#64748B]" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Download QR ── */}
      <div className="text-center">
        <button
          onClick={() => {
            if (hasSecureQr) {
              handleSaveQR()
            } else {
              window.open(simpleQrUrl, '_blank')
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#00D084] hover:bg-[#00D084]/10 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" /> Save QR Image
        </button>
        {qrError && (
          <p className="mt-2 text-xs text-red-400">{qrError}</p>
        )}
      </div>
    </div>
  )
}
