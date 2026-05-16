import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Copy,
  Check,
  QrCode,
  Download,
  Send,
  Clock,
  ChevronRight,
  Database,
  Save,
  FileText,
  History,
} from 'lucide-react'
import { Skeleton, SkeletonCard } from './Skeleton'
import { formatUSD, formatNumber } from '@/lib/utils'
import { Avatar } from '@/features/shared/components/Avatar'
import { useDashboard } from './dashboard/useDashboard'

export default function Dashboard() {
  const {
    address, isConnected, balanceLoading, balanceValue,
    nativeSymbol, nativeName, txMounted,
    p, copied, cacheStats, cacheReady,
    activeTab, setActiveTab,
    score, isBlacklisted, isTrusted, repLoading,
    payId, handleCopy,
    filteredTx, tokens, relativeTime,
  } = useDashboard()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Dashboard</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Total Balance</span>
            <button className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer">
              <QrCode className="w-4 h-4 text-white" />
            </button>
          </div>
          {balanceLoading ? (
            <div className="mb-4 space-y-2">
              <Skeleton
                className="h-10 w-40"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              />
            </div>
          ) : (
            <div className="text-[40px] font-bold text-white tracking-tight leading-none mb-4">
              {formatUSD(balanceValue > 0 ? balanceValue * 3500 : 0)}
            </div>
          )}

          {/* Token List */}
          <div className="space-y-2">
            {balanceLoading ? (
              <div className="p-2 rounded-xl bg-white/10 flex items-center gap-3">
                <Skeleton
                  className="w-8 h-8 shrink-0"
                  rounded="rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
                <div className="flex-1 space-y-1.5">
                  <Skeleton
                    className="h-3 w-24"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  />
                  <Skeleton
                    className="h-2.5 w-16"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  />
                </div>
                <Skeleton
                  className="h-3 w-14"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
              </div>
            ) : (
              tokens.slice(0, 2).map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                    {token.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">
                      {token.balance} {token.symbol}
                    </div>
                    <div className="text-white/60 text-xs">{token.name}</div>
                  </div>
                  <div className="text-white/80 text-sm font-mono">
                    {formatUSD(token.usd)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Demo Token Banner */}
          <div className="mt-3 p-3 rounded-xl bg-white/15 backdrop-blur-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">Demo Token</div>
              <div className="text-white/70 text-xs">
                We&apos;ve sent you this to experience how seamless PAY.ID
                withdrawals are. Click me to try it out!
              </div>
            </div>
            <button className="text-white/60 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 text-center">
            <span className="text-white/70 text-xs">
              Payments verified through PAY.ID policy
            </span>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>
                Your Personal Link
              </h3>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                Share to get paid
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-[#64748B]" />
            </motion.button>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
          >
            <Avatar
              name={isConnected && address ? address : 'demo'}
              size={36}
            />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${p.textMain} truncate`}>
                {payId}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#00D084]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#64748B]" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              >
                <QrCode className="w-4 h-4 text-[#64748B]" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              >
                <ArrowUpRight className="w-4 h-4 text-[#64748B]" />
              </motion.button>
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
          {
            to: '/v4/app/receive',
            icon: Download,
            label: 'Receive',
            color: '#0EA5E9',
          },
          {
            to: '/v4/app/history',
            icon: Clock,
            label: 'History',
            color: '#F59E0B',
          },
        ].map((action) => (
          <Link key={action.label} to={action.to}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`rounded-2xl p-4 flex flex-col items-center gap-2 text-center cursor-pointer`}
              style={{ background: p.cardBg }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${action.color}15` }}
              >
                <action.icon
                  className="w-5 h-5"
                  style={{ color: action.color }}
                />
              </div>
              <span className={`text-sm font-medium ${p.textMain}`}>
                {action.label}
              </span>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* VRAN Reputation Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>
                VRAN Reputation
              </h3>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                Vindex Anti-Scam Network
              </p>
            </div>
            {isTrusted && !isBlacklisted && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-1 rounded-full bg-[#00D084]/10 text-[#00D084] text-xs font-medium"
              >
                Trusted
              </motion.span>
            )}
            {isBlacklisted && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-medium"
              >
                Blacklisted
              </motion.span>
            )}
            {!isTrusted && !isBlacklisted && !repLoading && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-medium"
              >
                Neutral
              </motion.span>
            )}
          </div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
          >
            <motion.div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{
                background: isBlacklisted
                  ? '#EF4444'
                  : isTrusted
                    ? '#00D084'
                    : '#64748B',
              }}
              animate={repLoading ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {repLoading ? '…' : score}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${p.textMain}`}>
                {repLoading ? 'Loading reputation…' : `${score} / 1000`}
              </div>
              <div className={`text-xs ${p.textMuted}`}>
                {isBlacklisted
                  ? 'Account flagged by community'
                  : isTrusted
                    ? 'High reputation account'
                    : 'Reputation score pending'}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Offline Cache Stats */}
      {cacheReady && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
          className="rounded-2xl p-5 relative backdrop-blur-20"
          style={{ background: p.glass.bg, border: p.glass.border }}
        >
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`text-sm font-semibold ${p.textMain}`}>
                  Offline Cache
                </h3>
                <p className={`text-xs ${p.textMuted} mt-0.5`}>
                  IndexedDB local storage
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">
                Local
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Rules', value: cacheStats.rules, icon: Database },
                { label: 'Contacts', value: cacheStats.contacts, icon: Save },
                { label: 'Drafts', value: cacheStats.drafts, icon: FileText },
                { label: 'History', value: cacheStats.history, icon: History },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-2.5 rounded-xl text-center ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
                >
                  <item.icon className="w-3.5 h-3.5 mx-auto mb-1 text-[#64748B]" />
                  <div className={`text-sm font-bold font-mono ${p.textMain}`}>
                    {item.value}
                  </div>
                  <div className={`text-[10px] ${p.textMuted}`}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div
          className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`}
        />
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
              {!txMounted && (
                <div className="space-y-1">
                  {[...Array(3)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}
              {txMounted && filteredTx.length === 0 && (
                <div className={`text-center py-8 text-sm ${p.textMuted}`}>
                  {isConnected
                    ? 'No transactions yet. Send your first payment!'
                    : 'Connect wallet to see transactions.'}
                </div>
              )}
              {filteredTx.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${p.cardHover}`}
                >
                  <Avatar
                    name={tx.type === 'sent' ? tx.to : tx.from}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${p.textMain}`}>
                      {tx.type === 'sent'
                        ? `Sent to ${tx.to}`
                        : `Received from ${tx.from}`}
                    </div>
                    <div className={`text-xs ${p.textMuted} font-mono`}>
                      {tx.id}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${tx.type === 'sent' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#00D084]/10 text-[#00D084]'}`}
                      >
                        {tx.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-mono font-semibold ${tx.type === 'sent' ? 'text-[#EF4444]' : 'text-[#00D084]'}`}
                    >
                      {tx.type === 'sent' ? '−' : '+'}
                      {formatNumber(parseFloat(tx.amount), 4)} {tx.asset}
                    </div>
                    <div className={`text-xs ${p.textMuted}`}>
                      {relativeTime(tx.timestamp)}
                    </div>
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
