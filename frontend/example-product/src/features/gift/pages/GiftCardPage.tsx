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
  Coins,
  Zap,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared'
import { useGiftCard } from '../hooks/useGiftCard'

// ── Countdown hook ──────────────────────────────────────────────
function useCountdown(expiresAt: number | null, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  useEffect(() => {
    if (!expiresAt) { setTimeLeft(''); setIsExpired(false); return }
    const update = () => {
      const diff = expiresAt - Math.floor(Date.now() / 1000)
      if (diff <= 0) { setTimeLeft('Expired'); setIsExpired(true); onExpire?.(); return }
      setIsExpired(false)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}:${s.toString().padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])
  return { timeLeft, isExpired }
}

// ── Preset chip ────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
        ${active ? 'bg-[#00D084]/20 text-[#00D084] ring-1 ring-[#00D084]/30' : 'bg-white/5 text-[#64748B] hover:bg-white/10'}
      `}
    >
      {label}
    </button>
  )
}

// ── Theme config ────────────────────────────────────────────────
const THEME_CONFIG = {
  gold:   { gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #92400e 100%)', shadow: 'shadow-[0_0_30px_rgba(217,119,6,0.3)] border-amber-500/30' },
  purple: { gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)', shadow: 'shadow-[0_0_30px_rgba(124,58,237,0.3)] border-purple-500/30' },
  cyber:  { gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)', shadow: 'shadow-[0_0_30px_rgba(219,39,119,0.3)] border-pink-500/30' },
}

const EXPIRY_PRESETS = [
  { label: '30m', value: '30' },
  { label: '1h',  value: '60' },
  { label: '6h',  value: '360' },
  { label: '24h', value: '1440' },
]

const AMOUNT_PRESETS = ['0.01', '0.1', '1', '10']

// ── Main page ───────────────────────────────────────────────────
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
  const { timeLeft, isExpired } = useCountdown(generatedGift?.expiresAt ?? null, handleReset)

  const tc = THEME_CONFIG[theme]

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

  // ── Gift card visual component ────────────────────────────────
  const GiftCard = ({ gift, opacity = 1 }: { gift?: typeof generatedGift; opacity?: number }) => {
    const cfg = gift ? THEME_CONFIG[gift.theme] : tc
    const fromAddr = gift ? gift.senderAddress : address
    const toLabel = gift
      ? (gift.type === 'targeted' ? shortAddr(gift.receiver) : 'ANYONE (FIRST)')
      : (type === 'targeted' && receiver ? shortAddr(receiver) : type === 'targeted' ? '0x...' : 'ANYONE (FIRST)')
    const amt = gift ? gift.amount : (amount || '0.00')
    const asset = gift ? gift.asset : (tokenType === 'erc20' ? 'ERC20' : nativeSymbol)
    const isGiftMode = gift ? gift.mode === 'gift' : mode === 'gift'

    return (
      <div
        className={`w-full max-w-md mx-auto aspect-[1.586/1] rounded-3xl p-5 relative overflow-hidden border ${cfg.shadow}`}
        style={{ background: cfg.gradient, opacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wide border border-white/10">
            {isGiftMode ? <Gift className="w-3.5 h-3.5" /> : <HandCoins className="w-3.5 h-3.5" />}
            <span>
              {isGiftMode
                ? (gift ? (gift.type === 'targeted' ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER') : (type === 'targeted' ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER'))
                : 'PAYMENT REQUEST'}
            </span>
          </div>
          {gift && timeLeft && !isExpired && (
            <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-mono font-bold border border-white/10">
              <Clock className="w-3 h-3" />
              <span>{timeLeft}</span>
            </div>
          )}
        </div>

        <div className="mt-6 text-center relative z-10">
          <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase block">{isGiftMode ? 'Gift Value' : 'Request Amount'}</span>
          <h2 className="text-white text-3xl font-black tracking-tight mt-1">
            {amt}
            <span className="text-lg font-normal opacity-70 ml-2">{asset}</span>
          </h2>
        </div>

        <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end z-10">
          <div>
            <span className="text-white/40 text-[9px] font-bold block mb-0.5">FROM</span>
            <span className="text-white text-xs font-mono font-semibold">{fromAddr ? shortAddr(fromAddr) : '0x...'}</span>
          </div>
          <div className="text-right">
            <span className="text-white/40 text-[9px] font-bold block mb-0.5">{isGiftMode ? 'TO' : 'REQUESTER'}</span>
            <span className="text-white text-xs font-mono font-semibold">{isGiftMode ? toLabel : 'YOU'}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-24"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#00D084]/10 border border-[#00D084]/20 flex items-center justify-center mx-auto mb-5">
          <Gift className="w-7 h-7 text-[#00D084]" />
        </div>
        <h2 className={`text-xl font-bold ${p.textMain} mb-2`}>Connect Your Wallet</h2>
        <p className={`text-sm ${p.textMuted} max-w-xs mx-auto`}>Connect to create on-chain gift cards and share them with anyone.</p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Hero Card Preview ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        {generatedGift ? (
          <motion.div whileHover={{ y: -4, scale: 1.01 }}>
            <GiftCard gift={generatedGift} />
          </motion.div>
        ) : (
          <GiftCard opacity={0.6} />
        )}
      </motion.div>

      {/* ── Result panel (when generated) ── */}
      <AnimatePresence>
        {generatedGift && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
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
                    ? `${nativeSymbol} sent — share the notification link`
                    : isPendingNative
                    ? 'Anyone can request the gift with this link'
                    : 'Send this link so they can claim'}
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
                ? <><Copy className="w-4 h-4" /> Copy Notification Link</>
                : <><Copy className="w-4 h-4" /> Copy Claim Link</>}
            </button>
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-[#64748B] text-xs hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Create Another Gift
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form (hidden when gift is generated) ── */}
      <AnimatePresence>
        {!generatedGift && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Mode Toggle */}
            <div
              className="rounded-2xl p-1.5 flex gap-1"
              style={{ background: p.glass.bg, border: p.glass.border }}
            >
              <button
                onClick={() => setMode('gift')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  mode === 'gift'
                    ? 'bg-[#00D084]/15 text-[#00D084] ring-1 ring-[#00D084]/20'
                    : 'text-[#64748B] hover:text-white'
                }`}
              >
                <Gift className="w-4 h-4" /> Send Gift
              </button>
              <button
                onClick={() => setMode('request')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  mode === 'request'
                    ? 'bg-[#00D084]/15 text-[#00D084] ring-1 ring-[#00D084]/20'
                    : 'text-[#64748B] hover:text-white'
                }`}
              >
                <HandCoins className="w-4 h-4" /> Request Money
              </button>
            </div>

            {/* Amount */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: p.glass.bg, border: p.glass.border }}
            >
              <div className="flex justify-between items-center">
                <label className={`text-[11px] font-medium ${p.textMuted} block`}>
                  {mode === 'gift' ? 'Amount' : 'Request Amount'}
                </label>
                {mode === 'request' && (
                  <span className={`text-[11px] ${p.textMuted} font-mono`}>
                    Balance: <span className={`${p.textMain} font-semibold`}>{balanceFormatted} {nativeSymbol}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className={`flex-1 min-w-0 px-4 py-3 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all`}
                />
                <span className={`self-center text-xs font-mono ${p.textMuted} shrink-0`}>
                  {mode === 'gift' ? (tokenType === 'erc20' ? 'tokens' : nativeSymbol) : nativeSymbol}
                </span>
              </div>
              {mode === 'request' && parseFloat(amount) > 0 && (
                <p className="text-[11px] text-[#64748B] font-mono px-1">
                  After request: <span className={parseFloat(remainingFormatted) < 0 ? 'text-red-400 font-semibold' : 'text-[#00D084] font-semibold'}>
                    {remainingFormatted} {nativeSymbol}
                  </span> remaining
                </p>
              )}
              <div className="flex gap-1.5 flex-wrap">
                {AMOUNT_PRESETS.map((v) => (
                  <Chip key={v} label={v} active={amount === v} onClick={() => setAmount(v)} />
                ))}
                <Chip label="Custom" active={!AMOUNT_PRESETS.includes(amount)} onClick={() => setAmount('')} />
              </div>
            </div>

            {/* Token (gift only) */}
            <AnimatePresence>
              {mode === 'gift' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-2xl p-4 space-y-3"
                    style={{ background: p.glass.bg, border: p.glass.border }}
                  >
                    <label className={`text-[11px] font-medium ${p.textMuted} block`}>Token</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTokenType('native')}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          tokenType === 'native'
                            ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                            : 'border-white/5 bg-white/3 hover:border-white/10'
                        }`}
                      >
                        <Zap className={`w-4 h-4 ${tokenType === 'native' ? 'text-[#00D084]' : 'text-[#64748B]'}`} />
                        <span className={`text-sm font-medium ${tokenType === 'native' ? p.textMain : 'text-[#64748B]'}`}>Native ({nativeSymbol})</span>
                      </button>
                      <button
                        onClick={() => setTokenType('erc20')}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          tokenType === 'erc20'
                            ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                            : 'border-white/5 bg-white/3 hover:border-white/10'
                        }`}
                      >
                        <Coins className={`w-4 h-4 ${tokenType === 'erc20' ? 'text-[#00D084]' : 'text-[#64748B]'}`} />
                        <span className={`text-sm font-medium ${tokenType === 'erc20' ? p.textMain : 'text-[#64748B]'}`}>ERC20 Token</span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {tokenType === 'erc20' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="text"
                            value={erc20Address}
                            onChange={(e) => setErc20Address(e.target.value)}
                            placeholder="Token contract address (0x...)"
                            className={`w-full px-4 py-3 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all font-mono`}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recipient (gift only) */}
            <AnimatePresence>
              {mode === 'gift' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-2xl p-4 space-y-3"
                    style={{ background: p.glass.bg, border: p.glass.border }}
                  >
                    <label className={`text-[11px] font-medium ${p.textMuted} block`}>To</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setType('public')}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          type === 'public'
                            ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                            : 'border-white/5 bg-white/3 hover:border-white/10'
                        }`}
                      >
                        <Users className={`w-4 h-4 ${type === 'public' ? 'text-[#00D084]' : 'text-[#64748B]'}`} />
                        <span className={`text-sm font-medium ${type === 'public' ? p.textMain : 'text-[#64748B]'}`}>Anyone</span>
                      </button>
                      <button
                        onClick={() => setType('targeted')}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          type === 'targeted'
                            ? 'border-[#00D084]/50 bg-[#00D084]/8 ring-1 ring-[#00D084]/20'
                            : 'border-white/5 bg-white/3 hover:border-white/10'
                        }`}
                      >
                        <User className={`w-4 h-4 ${type === 'targeted' ? 'text-[#00D084]' : 'text-[#64748B]'}`} />
                        <span className={`text-sm font-medium ${type === 'targeted' ? p.textMain : 'text-[#64748B]'}`}>A Friend</span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {type === 'targeted' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="text"
                            value={receiver}
                            onChange={(e) => setReceiver(e.target.value)}
                            placeholder="Friend's wallet address (0x...)"
                            className={`w-full px-4 py-3 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 transition-all font-mono`}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options: Expiry + Theme */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: p.glass.bg, border: p.glass.border }}
            >
              <div className="space-y-1.5">
                <label className={`text-[11px] font-medium ${p.textMuted} block`}>Expires in</label>
                <div className="flex gap-1.5 flex-wrap">
                  {EXPIRY_PRESETS.map((ep) => (
                    <Chip key={ep.value} label={ep.label} active={expiryMinutes === ep.value} onClick={() => setExpiryMinutes(ep.value)} />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-[11px] font-medium ${p.textMuted} block`}>Card Theme</label>
                <div className="flex gap-2 items-center">
                  {(Object.entries(THEME_CONFIG) as [typeof theme, typeof THEME_CONFIG['gold']][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
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

            {/* CTA */}
            <PremiumButton
              onClick={handleGenerate}
              disabled={isLoading || !address}
              isLoading={isLoading}
              icon={<Send className="w-4 h-4" />}
              className="w-full"
            >
              {isLoading
                ? (mode === 'gift'
                    ? (tokenType === 'native' && type === 'targeted'
                        ? 'Signing & Sending...'
                        : tokenType === 'erc20'
                        ? 'Approving & Signing...'
                        : 'Signing...')
                    : 'Signing...')
                : (mode === 'gift' ? 'Create Gift Card' : 'Create Payment Request')
              }
            </PremiumButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
