import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  Gift,
  Copy,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  User,
  Users,
  Send,
  HandCoins,
  ChevronRight,
  Coins,
  Zap,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared'
import { useGiftCard } from '../hooks/useGiftCard'

function useCountdown(expiresAt: number | null, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!expiresAt) { setTimeLeft(''); return }
    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = expiresAt - now
      if (diff <= 0) { setTimeLeft('Expired'); onExpire?.(); return }
      const hrs = Math.floor(diff / 3600)
      const mins = Math.floor((diff % 3600) / 60)
      const secs = diff % 60
      setTimeLeft(
        hrs > 0
          ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          : `${mins}:${secs.toString().padStart(2, '0')}`
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return timeLeft
}

const THEME_CONFIG = {
  gold:   { gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #92400e 100%)', color: '#fbbf24', shadow: 'shadow-[0_0_30px_rgba(217,119,6,0.3)] border-amber-500/30', label: 'Gold' },
  purple: { gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)', color: '#8b5cf6', shadow: 'shadow-[0_0_30px_rgba(124,58,237,0.3)] border-purple-500/30', label: 'Purple' },
  cyber:  { gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)', color: '#ec4899', shadow: 'shadow-[0_0_30px_rgba(219,39,119,0.3)] border-pink-500/30', label: 'Cyber' },
}

const EXPIRY_PRESETS = [
  { label: '30m', value: '30' },
  { label: '1h',  value: '60' },
  { label: '6h',  value: '360' },
  { label: '24h', value: '1440' },
]

export default function GiftCardPage() {
  const { isConnected } = useAccount()
  const {
    p, address,
    mode, setMode,
    type, setType,
    tokenType, setTokenType,
    amount, setAmount,
    erc20Address, setErc20Address,
    receiver, setReceiver,
    expiryMinutes, setExpiryMinutes,
    theme, setTheme,
    isLoading, generatedGift,
    handleGenerate, handleReset,
    nativeSymbol, balanceFormatted, remainingFormatted,
  } = useGiftCard()

  const [copiedLink, setCopiedLink] = useState(false)
  const timeLeft = useCountdown(generatedGift?.expiresAt ?? null, handleReset)

  const buildClaimUrl = () => {
    if (!generatedGift) return ''
    return `${window.location.origin}/v4/app/gift/claim?payload=${encodeURIComponent(generatedGift.payload)}&theme=${generatedGift.theme}&sender=${encodeURIComponent(generatedGift.senderAddress)}&asset=${encodeURIComponent(generatedGift.asset)}&friend=${encodeURIComponent(generatedGift.receiver)}&mode=${generatedGift.mode}`
  }

  const handleCopyLink = () => {
    const url = buildClaimUrl()
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const isDeliveredNative = generatedGift?.payload?.startsWith('receipt:') ?? false
  const isPendingNative = generatedGift?.payload?.startsWith('pending:') && generatedGift?.asset !== 'ERC20'

  const tc = THEME_CONFIG[theme]

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto text-center py-20 space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-white/5 flex items-center justify-center mx-auto">
          <Gift className="w-8 h-8 text-slate-500" />
        </div>
        <div>
          <h2 className={`text-lg font-semibold ${p.textMain}`}>Connect your wallet</h2>
          <p className={`text-sm ${p.textMuted} mt-1`}>Link your wallet to create and sign on-chain gift cards.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-xl font-bold ${p.textMain} flex items-center gap-2`}>
          <Gift className="w-5 h-5 text-[#00D084]" /> Gift Cards
        </h1>
        <p className={`text-sm ${p.textMuted} mt-0.5`}>
          Create a signed on-chain gift card or payment request — share a link, anyone can claim.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left: Form ── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Step 1: Mode */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: p.glass.bg, border: p.glass.border }}
          >
            <p className={`text-xs font-bold ${p.textMuted} uppercase tracking-widest`}>
              Step 1 — What do you want to do?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Send Gift */}
              <button
                onClick={() => setMode('gift')}
                className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'gift'
                    ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                    : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${mode === 'gift' ? 'bg-[#00D084]/15' : 'bg-slate-800'}`}>
                  <Gift className={`w-4 h-4 ${mode === 'gift' ? 'text-[#00D084]' : 'text-slate-400'}`} />
                </div>
                <p className={`text-sm font-semibold ${mode === 'gift' ? p.textMain : 'text-slate-400'}`}>Send a Gift</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Token gift card (ERC20 or native)</p>
                {mode === 'gift' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D084] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#0F172A]" />
                  </div>
                )}
              </button>

              {/* Request Payment */}
              <button
                onClick={() => setMode('request')}
                className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'request'
                    ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                    : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${mode === 'request' ? 'bg-[#00D084]/15' : 'bg-slate-800'}`}>
                  <HandCoins className={`w-4 h-4 ${mode === 'request' ? 'text-[#00D084]' : 'text-slate-400'}`} />
                </div>
                <p className={`text-sm font-semibold ${mode === 'request' ? p.textMain : 'text-slate-400'}`}>Request Payment</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Native {nativeSymbol} request link</p>
                {mode === 'request' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D084] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#0F172A]" />
                  </div>
                )}
              </button>
            </div>
          </motion.div>

          {/* Step 2: Who can claim (gift only) */}
          <AnimatePresence>
            {mode === 'gift' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-2xl p-5 space-y-3"
                  style={{ background: p.glass.bg, border: p.glass.border }}
                >
                  <p className={`text-xs font-bold ${p.textMuted} uppercase tracking-widest`}>
                    Step 2 — Who can claim it?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setType('targeted')}
                      className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        type === 'targeted'
                          ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                          : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${type === 'targeted' ? 'bg-[#00D084]/15' : 'bg-slate-800'}`}>
                        <User className={`w-4 h-4 ${type === 'targeted' ? 'text-[#00D084]' : 'text-slate-400'}`} />
                      </div>
                      <p className={`text-sm font-semibold ${type === 'targeted' ? p.textMain : 'text-slate-400'}`}>A Specific Friend</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Only their wallet can claim</p>
                      {type === 'targeted' && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D084] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#0F172A]" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => setType('public')}
                      className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        type === 'public'
                          ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                          : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${type === 'public' ? 'bg-[#00D084]/15' : 'bg-slate-800'}`}>
                        <Users className={`w-4 h-4 ${type === 'public' ? 'text-[#00D084]' : 'text-slate-400'}`} />
                      </div>
                      <p className={`text-sm font-semibold ${type === 'public' ? p.textMain : 'text-slate-400'}`}>Anyone (First-come)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">First person to request</p>
                      {type === 'public' && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D084] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#0F172A]" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Step 2.5: Token type (gift only) */}
          <AnimatePresence>
            {mode === 'gift' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-2xl p-5 space-y-3"
                  style={{ background: p.glass.bg, border: p.glass.border }}
                >
                  <p className={`text-xs font-bold ${p.textMuted} uppercase tracking-widest`}>
                    Step 3 — Token Type
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTokenType('erc20')}
                      className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        tokenType === 'erc20'
                          ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                          : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${tokenType === 'erc20' ? 'bg-[#00D084]/15' : 'bg-slate-800'}`}>
                        <Coins className={`w-4 h-4 ${tokenType === 'erc20' ? 'text-[#00D084]' : 'text-slate-400'}`} />
                      </div>
                      <p className={`text-sm font-semibold ${tokenType === 'erc20' ? p.textMain : 'text-slate-400'}`}>ERC20 Token</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Sender pre-approves, friend claims</p>
                      {tokenType === 'erc20' && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D084] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#0F172A]" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => setTokenType('native')}
                      className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        tokenType === 'native'
                          ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                          : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${tokenType === 'native' ? 'bg-[#00D084]/15' : 'bg-slate-800'}`}>
                        <Zap className={`w-4 h-4 ${tokenType === 'native' ? 'text-[#00D084]' : 'text-slate-400'}`} />
                      </div>
                      <p className={`text-sm font-semibold ${tokenType === 'native' ? p.textMain : 'text-slate-400'}`}>Native ({nativeSymbol})</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Sender delivers, friend receives</p>
                      {tokenType === 'native' && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D084] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#0F172A]" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3 / 4: Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: p.glass.bg, border: p.glass.border }}
          >
            <p className={`text-xs font-bold ${p.textMuted} uppercase tracking-widest`}>
              {mode === 'gift' ? 'Step 4' : 'Step 2'} — Amount & Details
            </p>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-medium ${p.textMuted}`}>
                  {mode === 'gift' ? 'Gift Amount' : `Request Amount`}
                </label>
                {mode === 'request' && (
                  <span className={`text-xs ${p.textMuted} font-mono`}>
                    Balance: <span className={`${p.textMain} font-semibold`}>{balanceFormatted} {nativeSymbol}</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className={`w-full px-4 py-3 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all pr-16`}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono ${p.textMuted}`}>
                  {mode === 'gift' ? (tokenType === 'erc20' ? 'tokens' : nativeSymbol) : nativeSymbol}
                </span>
              </div>
              {mode === 'request' && parseFloat(amount) > 0 && (
                <p className="text-[11px] text-slate-500 font-mono px-1">
                  After request: <span className={parseFloat(remainingFormatted) < 0 ? 'text-red-400 font-semibold' : 'text-[#00D084] font-semibold'}>
                    {remainingFormatted} {nativeSymbol}
                  </span> remaining
                </p>
              )}
            </div>

            {/* Conditional fields */}
            <AnimatePresence>
              {mode === 'gift' && tokenType === 'erc20' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className={`text-xs font-medium ${p.textMuted} block`}>ERC20 Token Contract Address</label>
                  <input
                    type="text"
                    value={erc20Address}
                    onChange={(e) => setErc20Address(e.target.value)}
                    placeholder="0x..."
                    className={`w-full px-4 py-3 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all font-mono`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {mode === 'gift' && type === 'targeted' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className={`text-xs font-medium ${p.textMuted} block`}>Friend's Wallet Address</label>
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="0x..."
                    className={`w-full px-4 py-3 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all font-mono`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expiry presets + theme in one row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-medium ${p.textMuted} block`}>Expires in</label>
                <div className="flex gap-1.5">
                  {EXPIRY_PRESETS.map((p2) => (
                    <button
                      key={p2.value}
                      onClick={() => setExpiryMinutes(p2.value)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        expiryMinutes === p2.value
                          ? 'bg-[#00D084] text-[#0F172A]'
                          : `border border-white/5 text-slate-400 hover:text-white bg-slate-900/40`
                      }`}
                    >
                      {p2.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-medium ${p.textMuted} block`}>Card Theme</label>
                <div className="flex gap-2 h-[36px] items-center">
                  {(Object.entries(THEME_CONFIG) as [typeof theme, typeof THEME_CONFIG['gold']][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      title={cfg.label}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        theme === key ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-90'
                      }`}
                      style={{ background: cfg.gradient }}
                    >
                      {theme === key && <Check className="w-3 h-3 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <div className="flex gap-2">
            <PremiumButton
              onClick={handleGenerate}
              disabled={isLoading || !address}
              isLoading={isLoading}
              icon={<Send className="w-4 h-4" />}
            >
              {isLoading
                ? (mode === 'gift' && tokenType === 'native' && type === 'targeted'
                    ? 'Signing & Delivering ETH...'
                    : mode === 'gift' && tokenType === 'erc20'
                    ? 'Approving & Signing...'
                    : 'Signing...')
                : (mode === 'gift' ? 'Create Gift Card' : 'Create Payment Request')
              }
            </PremiumButton>
            {generatedGift && (
              <button
                onClick={handleReset}
                title="Start over"
                className="px-3.5 py-2.5 rounded-xl border border-white/5 text-slate-500 hover:text-white hover:border-white/10 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Card Preview ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <AnimatePresence mode="wait">
            {generatedGift ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.93, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.93 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                {/* Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  className={`w-full aspect-[1.586/1] rounded-3xl p-6 relative overflow-hidden border ${THEME_CONFIG[generatedGift.theme].shadow}`}
                  style={{ background: THEME_CONFIG[generatedGift.theme].gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
                  <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wide border border-white/10">
                      <Gift className="w-3.5 h-3.5 animate-pulse" />
                      <span>{generatedGift.type === 'targeted' ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER'}</span>
                    </div>
                    {timeLeft && timeLeft !== 'Expired' && (
                      <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-mono font-bold border border-white/10">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>{timeLeft}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-7 text-center relative z-10">
                    <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase block">
                      {generatedGift.mode === 'gift' ? 'Gift Value' : 'Request Amount'}
                    </span>
                    <h2 className="text-white text-4xl font-black tracking-tight mt-1">
                      {generatedGift.amount}
                      <span className="text-xl font-normal opacity-70 ml-2">{generatedGift.asset}</span>
                    </h2>
                  </div>

                  <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end z-10">
                    <div>
                      <span className="text-white/40 text-[9px] font-bold block mb-0.5">FROM</span>
                      <span className="text-white text-xs font-mono font-semibold">{shortAddr(generatedGift.senderAddress)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 text-[9px] font-bold block mb-0.5">TO</span>
                      <span className="text-white text-xs font-mono font-semibold">
                        {generatedGift.type === 'targeted' ? shortAddr(generatedGift.receiver) : 'ANYONE (FIRST)'}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Share Panel */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 space-y-3"
                  style={{ background: p.glass.bg, border: p.glass.border }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#00D084]/15 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#00D084]" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${p.textMain}`}>
                        {isDeliveredNative ? 'Gift delivered!' : 'Ready to share!'}
                      </p>
                      <p className={`text-[11px] ${p.textMuted}`}>
                        {isDeliveredNative
                          ? 'ETH sent — share the notification link with your friend'
                          : isPendingNative
                          ? 'Share this link — anyone can request the gift'
                          : 'Send this link to your recipient so they can claim'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00D084] text-[#0F172A] text-sm font-bold hover:bg-[#00B86E] transition-colors cursor-pointer"
                  >
                    {copiedLink
                      ? <><Check className="w-4 h-4" /> Copied!</>
                      : isDeliveredNative
                      ? <><Copy className="w-4 h-4" /> Copy Gift Notification</>
                      : isPendingNative
                      ? <><Copy className="w-4 h-4" /> Copy Voucher Link</>
                      : <><Copy className="w-4 h-4" /> Copy Claim Link</>}
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              /* Live placeholder card — updates with theme selection */
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div
                  className={`w-full aspect-[1.586/1] rounded-3xl p-6 relative overflow-hidden border ${tc.shadow} opacity-60`}
                  style={{ background: tc.gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
                  <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

                  <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wide border border-white/10 w-fit">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{type === 'targeted' ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER'}</span>
                  </div>

                  <div className="mt-7 text-center relative z-10">
                    <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase block">
                      {mode === 'gift' ? 'Gift Value' : 'Request Amount'}
                    </span>
                    <h2 className="text-white text-4xl font-black tracking-tight mt-1">
                      {amount || '0.00'}
                      <span className="text-xl font-normal opacity-70 ml-2">
                        {mode === 'gift' ? (tokenType === 'erc20' ? 'ERC20' : nativeSymbol) : nativeSymbol}
                      </span>
                    </h2>
                  </div>

                  <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end z-10">
                    <div>
                      <span className="text-white/40 text-[9px] font-bold block mb-0.5">FROM</span>
                      <span className="text-white text-xs font-mono font-semibold">{address ? shortAddr(address) : '0x...'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 text-[9px] font-bold block mb-0.5">TO</span>
                      <span className="text-white text-xs font-mono font-semibold">
                        {type === 'targeted' && receiver ? shortAddr(receiver) : type === 'targeted' ? '0x...' : 'ANYONE (FIRST)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hint */}
                <div className="flex items-center gap-2 px-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <p className="text-[11px] text-slate-600">Fill in the form and click <span className="text-slate-400">Create Gift Card</span> to generate a shareable link.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
