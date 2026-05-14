import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Copy,
  Check,
  QrCode,
  Download,
  Send,
  Clock,
  Wallet,
  ChevronRight,
  Database,
  Save,
  FileText,
  History,
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { useV4Palette } from './theme'
import { useReputation, useOfflineCache } from 'payid-react'

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

/* CountUp hook */
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number>()
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setVal(target * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])
  return val
}

/* Sparkline */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const { path, area } = useMemo(() => {
    const w = 200, h = 48, max = Math.max(...data), min = Math.min(...data)
    const range = max - min || 1, step = w / (data.length - 1)
    let d = `M 0 ${h - ((data[0] - min) / range) * h}`
    data.slice(1).forEach((v, i) => { d += ` L ${(i + 1) * step} ${h - ((v - min) / range) * h}` })
    return { path: d, area: d + ` L ${w} ${h} L 0 ${h} Z` }
  }, [data])

  return (
    <svg viewBox="0 0 200 48" className="w-full h-12" preserveAspectRatio="none">
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#sg)" />
      <motion.path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
    </svg>
  )
}

/* Avatar with initials */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase()
  const bg = useMemo(() => {
    const colors = ['#00D084', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }, [name])

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const balanceValue = isConnected && balance ? parseFloat(formatUnits(balance.value, balance.decimals)) : 0
  const displayBalance = useCountUp(balanceValue, 1500)
  const p = useV4Palette()
  const [copied, setCopied] = useState(false)
  const { stats: cacheStats, isReady: cacheReady } = useOfflineCache()
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing'>('all')
  const { score, isBlacklisted, isTrusted, isLoading: repLoading } = useReputation({})

  const sparkData = useMemo(() => {
    const base = balanceValue || 10
    return Array.from({ length: 14 }, (_, i) => base + Math.sin(i * 0.8) * (base * 0.15) + (Math.random() - 0.5) * (base * 0.05))
  }, [balanceValue])

  const payId = isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id'

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(payId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [payId])

  const allTx = [
    { id: '0x7a3f...e91b', type: 'sent' as const, to: 'alice.pay.id', from: '', amount: '5.00', asset: 'USDC', time: '2m ago', token: 'PDT' },
    { id: '0x9b2a...c45d', type: 'received' as const, to: '', from: 'bob.pay.id', amount: '12.50', asset: 'USDC', time: '15m ago', token: 'PDT' },
    { id: '0x3f11...a781', type: 'sent' as const, to: 'merchant.pay.id', from: '', amount: '50.00', asset: 'ETH', time: '1h ago', token: 'ETH' },
    { id: '0x2c8e...b903', type: 'received' as const, to: '', from: 'charlie.pay.id', amount: '120.00', asset: 'USDC', time: '3h ago', token: 'PDT' },
    { id: '0x5d71...f22a', type: 'sent' as const, to: 'dave.pay.id', from: '', amount: '8.25', asset: 'ETH', time: '5h ago', token: 'ETH' },
  ]

  const filteredTx = activeTab === 'all'
    ? allTx
    : allTx.filter(tx =>
        (activeTab === 'incoming' && tx.type === 'received') ||
        (activeTab === 'outgoing' && tx.type === 'sent')
      )

  const tokens = [
    { symbol: 'ETH', name: 'Ethereum', balance: balanceValue.toFixed(4), usd: (balanceValue * 3500).toFixed(2), icon: '⟠' },
    { symbol: 'USDC', name: 'USD Coin', balance: '1,250.00', usd: '1,250.00', icon: '$' },
    { symbol: 'PDT', name: 'PAY.ID Token', balance: '100', usd: '0', icon: 'P' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Dashboard</h1>
      </div>

      {/* Balance Card — PIVY Style */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-[24px] p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Your Stealth Balance</span>
            <button className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer">
              <QrCode className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="text-[40px] font-bold text-white tracking-tight leading-none mb-4">
            ${balanceValue > 0 ? (balanceValue * 3500).toFixed(2) : '0.00'}
          </div>

          {/* Token List */}
          <div className="space-y-2">
            {tokens.slice(0, 2).map((token) => (
              <div key={token.symbol} className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                  {token.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{token.balance} {token.symbol}</div>
                  <div className="text-white/60 text-xs">{token.name}</div>
                </div>
                <div className="text-white/80 text-sm font-mono">${token.usd}</div>
              </div>
            ))}
          </div>

          {/* Demo Token Banner */}
          <div className="mt-3 p-3 rounded-xl bg-white/15 backdrop-blur-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-xs">P</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">Demo Token</div>
              <div className="text-white/70 text-xs">We&apos;ve sent you this to experience how seamless PAY.ID withdrawals are. Click me to try it out!</div>
            </div>
            <button className="text-white/60 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 text-center">
            <span className="text-white/70 text-xs">Payments received privately through PAY.ID</span>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      {/* Your PayID Link — PIVY Style */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>Your Personal Link</h3>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Share to get paid</p>
            </div>
            <button className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
            <Avatar name={isConnected && address ? address : 'demo'} size={36} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${p.textMain} truncate`}>{payId}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              >
                {copied ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
              </button>
              <button className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}>
                <QrCode className="w-4 h-4 text-[#64748B]" />
              </button>
              <button className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}>
                <ArrowUpRight className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { to: '/v4/app/send', icon: Send, label: 'Send', color: '#00D084' },
          { to: '/v4/app/receive', icon: Download, label: 'Receive', color: '#0EA5E9' },
          { to: '/v4/app/history', icon: Clock, label: 'History', color: '#F59E0B' },
        ].map((action) => (
          <Link key={action.label} to={action.to}>
            <div
              className={`rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-colors ${p.cardHover}`}
              style={{ background: p.cardBg }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${action.color}15` }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className={`text-sm font-medium ${p.textMain}`}>{action.label}</span>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* VRAN Reputation Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>VRAN Reputation</h3>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Vindex Anti-Scam Network</p>
            </div>
            {isTrusted && !isBlacklisted && (
              <span className="px-2 py-1 rounded-full bg-[#00D084]/10 text-[#00D084] text-xs font-medium">Trusted</span>
            )}
            {isBlacklisted && (
              <span className="px-2 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-medium">Blacklisted</span>
            )}
            {!isTrusted && !isBlacklisted && !repLoading && (
              <span className="px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-medium">Neutral</span>
            )}
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: isBlacklisted ? '#EF4444' : isTrusted ? '#00D084' : '#64748B' }}>
              {repLoading ? '…' : score}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${p.textMain}`}>
                {repLoading ? 'Loading reputation…' : `${score} / 1000`}
              </div>
              <div className={`text-xs ${p.textMuted}`}>
                {isBlacklisted ? 'Account flagged by community' : isTrusted ? 'High reputation account' : 'Reputation score pending'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Offline Cache Stats */}
      {cacheReady && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
          className="rounded-2xl p-5 relative"
          style={{ background: p.cardBg }}
        >
          <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`text-sm font-semibold ${p.textMain}`}>Offline Cache</h3>
                <p className={`text-xs ${p.textMuted} mt-0.5`}>IndexedDB local storage</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">Local</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Rules', value: cacheStats.rules, icon: Database },
                { label: 'Contacts', value: cacheStats.contacts, icon: Save },
                { label: 'Drafts', value: cacheStats.drafts, icon: FileText },
                { label: 'History', value: cacheStats.history, icon: History },
              ].map((item) => (
                <div key={item.label} className={`p-2.5 rounded-xl text-center ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
                  <item.icon className="w-3.5 h-3.5 mx-auto mb-1 text-[#64748B]" />
                  <div className={`text-sm font-bold font-mono ${p.textMain}`}>{item.value}</div>
                  <div className={`text-[10px] ${p.textMuted}`}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Activity Feed — PIVY Style with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'incoming' as const, label: 'Incoming' },
                { key: 'outgoing' as const, label: 'Outgoing' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#00D084]/10 text-[#00D084]'
                      : `${p.textMuted} hover:${p.textSecondary}`
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-black/5 transition-colors">
              Export CSV
            </button>
          </div>

          {/* Transaction List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {filteredTx.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${p.cardHover}`}
                >
                  <Avatar name={tx.type === 'sent' ? tx.to : tx.from} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${p.textMain}`}>
                      {tx.type === 'sent' ? `Sent to ${tx.to}` : `Received from ${tx.from}`}
                    </div>
                    <div className={`text-xs ${p.textMuted} font-mono`}>{tx.id}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${tx.type === 'sent' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#00D084]/10 text-[#00D084]'}`}>
                        {tx.type}
                      </span>
                      <span className={`text-[10px] ${p.textMuted}`}>Here&apos;s a test token.</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-mono font-semibold ${tx.type === 'sent' ? 'text-[#EF4444]' : 'text-[#00D084]'}`}>
                      {tx.type === 'sent' ? '−' : '+'}{tx.amount} {tx.token}
                    </div>
                    <div className={`text-xs ${p.textMuted}`}>{tx.time}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* See All Button */}
          <div className="mt-4 text-center">
            <Link
              to="/v4/app/history"
              className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium ${p.textSecondary} hover:bg-black/5 transition-colors`}
            >
              See all activities
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
