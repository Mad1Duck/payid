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
} from 'lucide-react'
import { useState, useEffect } from 'react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared'
import { useGiftCard } from '../hooks/useGiftCard'

// Custom countdown hook
function useCountdown(expiresAt: number | null, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('')
      return
    }

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = expiresAt - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        if (onExpire) onExpire()
        return
      }

      const hrs = Math.floor(diff / 3600)
      const mins = Math.floor((diff % 3600) / 60)
      const secs = diff % 60

      const formatted =
        hrs > 0
          ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          : `${mins}:${secs.toString().padStart(2, '0')}`

      setTimeLeft(formatted)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return timeLeft
}

export default function GiftCardPage() {
  const { isConnected } = useAccount()
  const {
    p,
    address,
    mode,
    setMode,
    type,
    setType,
    amount,
    setAmount,
    erc20Address,
    setErc20Address,
    receiver,
    setReceiver,
    expiryMinutes,
    setExpiryMinutes,
    theme,
    setTheme,
    isLoading,
    generatedGift,
    handleGenerate,
    handleReset,
    nativeSymbol,
    balanceFormatted,
    remainingFormatted,
  } = useGiftCard()

  const [copiedLink, setCopiedLink] = useState(false)
  const timeLeft = useCountdown(generatedGift?.expiresAt ?? null, handleReset)

  const handleCopyLink = () => {
    if (!generatedGift) return
    const claimUrl = `${window.location.origin}/v4/app/gift/claim?payload=${encodeURIComponent(generatedGift.payload)}&theme=${generatedGift.theme}&sender=${encodeURIComponent(generatedGift.senderAddress)}&asset=${encodeURIComponent(generatedGift.asset)}&friend=${encodeURIComponent(generatedGift.receiver)}&mode=${generatedGift.mode}`
    navigator.clipboard.writeText(claimUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const getThemeGradient = (selectedTheme: 'gold' | 'purple' | 'cyber') => {
    switch (selectedTheme) {
      case 'purple':
        return 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)'
      case 'cyber':
        return 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)'
      default:
        return 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #92400e 100%)'
    }
  }

  const getThemeShadow = (selectedTheme: 'gold' | 'purple' | 'cyber') => {
    switch (selectedTheme) {
      case 'purple':
        return 'shadow-[0_0_30px_rgba(124,58,237,0.3)] border-purple-500/30'
      case 'cyber':
        return 'shadow-[0_0_30px_rgba(219,39,119,0.3)] border-pink-500/30'
      default:
        return 'shadow-[0_0_30px_rgba(217,119,6,0.3)] border-amber-500/30'
    }
  }

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <Gift className="w-10 h-10 text-[#64748B] mx-auto mb-4" />
        <h2 className={`text-lg font-semibold ${p.textMain} mb-1`}>
          Connect Wallet
        </h2>
        <p className={`text-xs ${p.textMuted}`}>
          Link your wallet to sign premium on-chain Gift Cards.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain} flex items-center justify-center md:justify-start gap-2`}>
          <Gift className="w-6 h-6 text-[#00D084]" /> Payments & Gift Cards
        </h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Send ERC20 Gift Cards or Request Native payments via secure URLs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side: Setup Form */}
        <div className="md:col-span-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 relative backdrop-blur-20"
            style={{ background: p.glass.bg, border: p.glass.border }}
          >
            <div className="relative space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#00D084]" />
                <span className={`text-sm font-semibold ${p.textMain}`}>
                  {mode === 'gift' ? 'Gift Customization (ERC20)' : 'Payment Request (Native)'}
                </span>
              </div>

              {/* Switchers Grid (Side-by-Side to save vertical space and reduce crowding) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mode Switcher */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold ${p.textMuted} uppercase tracking-wider block px-1`}>
                    Flow Mode
                  </label>
                  <div className="flex p-1 rounded-xl bg-slate-900/40 border border-white/5 h-10 items-center">
                    <button
                      onClick={() => setMode('gift')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all h-full ${
                        mode === 'gift'
                          ? 'bg-[#00D084] text-[#0F172A] shadow-md shadow-[#00D084]/10'
                          : `text-[#64748B] hover:${p.textMain}`
                      }`}
                    >
                      Send Gift
                    </button>
                    <button
                      onClick={() => setMode('request')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all h-full ${
                        mode === 'request'
                          ? 'bg-[#00D084] text-[#0F172A] shadow-md shadow-[#00D084]/10'
                          : `text-[#64748B] hover:${p.textMain}`
                      }`}
                    >
                      Request
                    </button>
                  </div>
                </div>

                {/* Type Switcher */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold ${p.textMuted} uppercase tracking-wider block px-1`}>
                    Access Level
                  </label>
                  <div className="flex p-1 rounded-xl bg-slate-900/40 border border-white/5 h-10 items-center">
                    <button
                      onClick={() => setType('targeted')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all h-full ${
                        type === 'targeted'
                          ? 'bg-[#00D084] text-[#0F172A] shadow-md shadow-[#00D084]/10'
                          : `text-[#64748B] hover:${p.textMain}`
                      }`}
                    >
                      <User className="w-3.5 h-3.5" /> Friend
                    </button>
                    <button
                      onClick={() => setType('public')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all h-full ${
                        type === 'public'
                          ? 'bg-[#00D084] text-[#0F172A] shadow-md shadow-[#00D084]/10'
                          : `text-[#64748B] hover:${p.textMain}`
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Public
                    </button>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className={`text-[11px] font-medium ${p.textMuted}`}>
                    {mode === 'gift' ? 'Amount (ERC20)' : `Request Amount (${nativeSymbol})`}
                  </label>
                  {mode === 'request' && (
                    <span className={`text-[10px] ${p.textMuted} font-mono`}>
                      Wallet: <span className={`${p.textMain} font-semibold`}>{balanceFormatted} {nativeSymbol}</span>
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all`}
                />
                
                {/* Balance Difference Preview (Only for request where we know balance) */}
                {mode === 'request' && parseFloat(amount) > 0 && (
                  <div className="flex justify-between items-center pt-1 px-1 text-[10px] font-mono">
                    <span className="text-[#64748B]">Simulated Balance:</span>
                    <span className="text-slate-300">
                      {balanceFormatted} &rarr; <span className={parseFloat(remainingFormatted) <= 0 && parseFloat(amount) > parseFloat(balanceFormatted) ? 'text-red-400 font-bold' : 'text-[#00D084] font-bold'}>{remainingFormatted}</span> {nativeSymbol}
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Inputs Wrapper with smooth padding & margins */}
              {(mode === 'gift' || type === 'targeted') && (
                <div className="space-y-3.5 p-3.5 rounded-xl bg-slate-900/20 border border-white/5">
                  {/* ERC20 Address Input (Gift only) */}
                  <AnimatePresence mode="wait">
                    {mode === 'gift' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <label className={`text-[11px] font-medium ${p.textMuted} block`}>
                          ERC20 Token Address (0x...)
                        </label>
                        <input
                          type="text"
                          value={erc20Address}
                          onChange={(e) => setErc20Address(e.target.value)}
                          placeholder="0xMockERC20..."
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Friend Address Input (Targeted only) */}
                  <AnimatePresence mode="wait">
                    {type === 'targeted' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <label className={`text-[11px] font-medium ${p.textMuted} block`}>
                          Friend's Wallet Address (0x...)
                        </label>
                        <input
                          type="text"
                          value={receiver}
                          onChange={(e) => setReceiver(e.target.value)}
                          placeholder="0x..."
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Expiry and Theme */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-medium ${p.textMuted} block`}>
                    Expiry (minutes)
                  </label>
                  <input
                    type="number"
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-medium ${p.textMuted} block`}>
                    Card Theme
                  </label>
                  <div className="flex gap-2.5 h-[46px] items-center px-1">
                    {(['gold', 'purple', 'cyber'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          theme === t ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{
                          background:
                            t === 'gold'
                              ? '#fbbf24'
                              : t === 'purple'
                                ? '#8b5cf6'
                                : '#ec4899',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtle Divider line to separate setup from actions */}
              <div className="border-t border-white/5 pt-4" />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <PremiumButton
                  onClick={handleGenerate}
                  disabled={isLoading || !address}
                  isLoading={isLoading}
                  icon={<Gift />}
                >
                  {mode === 'gift' ? 'Sign & Generate Gift' : 'Sign & Generate Request'}
                </PremiumButton>
                {generatedGift && (
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-2.5 rounded-xl border border-[#64748B]/20 text-[#64748B] hover:bg-[#64748B]/5 hover:text-white cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Virtual Preview or Generated Card */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {generatedGift ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.9, rotateY: -30 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm space-y-4"
              >
                {/* 3D-effect Active Premium Card */}
                <motion.div
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`w-full aspect-[1.586/1] rounded-3xl p-6 relative overflow-hidden border ${getThemeShadow(
                    generatedGift.theme
                  )}`}
                  style={{ background: getThemeGradient(generatedGift.theme) }}
                >
                  {/* Glass reflections */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />

                  {/* Top Header */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wide border border-white/10">
                      <Gift className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>{generatedGift.type === 'targeted' ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER'}</span>
                    </div>

                    {timeLeft && timeLeft !== 'Expired' && (
                      <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-mono font-bold border border-white/10">
                        <Clock className="w-3 h-3 text-white/95 animate-pulse" />
                        <span>{timeLeft}</span>
                      </div>
                    )}
                  </div>

                  {/* Mid: Amount display */}
                  <div className="mt-8 text-center relative z-10">
                    <span className="text-white/60 text-[10px] font-bold tracking-wider uppercase block">
                      {generatedGift.mode === 'gift' ? 'Gift Value' : 'Request Amount'}
                    </span>
                    <h2 className="text-white text-3xl font-extrabold tracking-tight mt-0.5">
                      {generatedGift.amount} <span className="text-xl font-normal opacity-80">{generatedGift.asset}</span>
                    </h2>
                  </div>

                  {/* Bottom details */}
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-10">
                    <div>
                      <span className="text-white/40 text-[9px] font-bold block">FROM</span>
                      <span className="text-white text-xs font-mono font-semibold">
                        {shortAddr(generatedGift.senderAddress)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-white/40 text-[9px] font-bold block">TO</span>
                      <span className="text-white text-xs font-mono font-semibold">
                        {generatedGift.type === 'targeted' ? shortAddr(generatedGift.receiver) : 'ANYONE (FIRST)'}
                      </span>
                    </div>
                  </div>

                  {/* Geometric highlights */}
                  <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                </motion.div>

                {/* Share Action Panel */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 border relative text-center backdrop-blur-20 space-y-3"
                  style={{ background: p.glass.bg, border: p.glass.border }}
                >
                  <h3 className={`text-xs font-bold ${p.textMain}`}>Your Gift Card is Ready!</h3>
                  <p className={`text-[11px] ${p.textMuted}`}>
                    Copy the link below and send it to your friend to let them claim the gift card directly.
                  </p>

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00D084] text-[#0F172A] text-xs font-bold hover:bg-[#00B86E] transition-colors cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copied' : 'Copy Claim Link'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-3xl p-6 aspect-[1.586/1] border border-dashed border-slate-700 bg-slate-900/10 flex flex-col items-center justify-center text-center space-y-2 opacity-50"
              >
                <Gift className="w-8 h-8 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Virtual Card Preview</span>
                <span className="text-[10px] text-slate-600">Configure parameters on the left to sign the card</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
