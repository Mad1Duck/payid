import { useState } from 'react'
import { Link, useLocation, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  ChevronDown,
  Cpu,
  Globe,
  History,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  QrCode,
  Send,
  Settings,
  Shield,
  Wallet,
  Zap,
} from 'lucide-react'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi'
import { useV4Palette } from './theme'
import DynamicIsland from './DynamicIsland'
import type { ReactNode } from 'react'

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectors, connect, isPending: connectPending } = useConnect()
  const chainId = useChainId()
  const { chains, switchChain } = useSwitchChain()
  const [showConnectMenu, setShowConnectMenu] = useState(false)
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname
  const p = useV4Palette()
  const isNavigating = useRouterState({ select: (s) => s.status === 'pending' })

  const navItems = [
    { to: '/v4/app/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/v4/app/send', icon: Send, label: 'Send' },
    { to: '/v4/app/receive', icon: QrCode, label: 'Receive' },
    { to: '/v4/app/history', icon: History, label: 'History' },
    { to: '/v4/app/rules', icon: Shield, label: 'Policy' },
    { to: '/v4/app/rules/builder', icon: Pencil, label: 'Rule Builder' },
    { to: '/v4/app/agent', icon: Bot, label: 'AI Agent' },
    { to: '/v4/app/ai-agents', icon: Cpu, label: 'My AI Agents' },
    { to: '/v4/app/proof', icon: Zap, label: 'Proof' },
    // { to: '/v4/app/tools', icon: Wrench, label: 'Tools' },
    // { to: '/v4/app/payroll', icon: Users, label: 'Payroll' },
    { to: '/v4/app/admin', icon: Lock, label: 'Admin' },
    { to: '/v4/app/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className={`min-h-screen ${p.rootBg} ${p.rootText} relative`}>
      {/* Top navigation progress bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-9999 h-0.5 overflow-hidden">
          <div
            className="h-full bg-[#00D084] animate-pulse"
            style={{ animation: 'nav-progress 1s ease-in-out infinite' }}
          />
          <style>{`
            @keyframes nav-progress {
              0% { width: 0%; margin-left: 0; }
              50% { width: 70%; margin-left: 15%; }
              100% { width: 0%; margin-left: 100%; }
            }
          `}</style>
        </div>
      )}
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-125 opacity-30"
          style={{
            background: p.dark
              ? 'radial-gradient(ellipse at top, #0D1F17 0%, transparent 60%)'
              : 'radial-gradient(ellipse at top, #E2E8F0 0%, transparent 60%)',
          }}
        />
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #00D084 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #00D084 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Film grain noise */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          zIndex: 9999,
        }}
      />

      {/* Top bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b ${p.cardBorder} backdrop-blur-2xl ${p.dark ? 'bg-[#0B0F1A]/70' : 'bg-[#F1F5F9]/70'}`}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00D084]/10 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00D084]" />
            </div>
            <span
              className={`text-[15px] font-semibold tracking-tight ${p.textMain}`}
            >
              PAY.ID
            </span>
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-3">
              {/* Network Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowNetworkMenu((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${p.cardBgSolid} ${p.cardBorder} hover:border-[#00D084]/30 cursor-pointer`}
                >
                  <Globe
                    className={`w-3.5 h-3.5 ${chainId === 16601 ? 'text-[#00D084]' : 'text-[#94A3B8]'}`}
                  />
                  <span className={`text-xs font-bold ${p.textMain}`}>
                    {chains
                      .find((c) => c.id === chainId)
                      ?.name.replace('Newton ', '')
                      .replace('Testnet', '')
                      .trim() || 'Select'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#64748B]" />
                </button>

                <AnimatePresence>
                  {showNetworkMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNetworkMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        className={`absolute top-full right-0 mt-2 w-44 rounded-xl border z-50 overflow-hidden shadow-xl ${p.dark ? 'bg-[#131825] border-white/10' : 'bg-white border-black/10'}`}
                      >
                        <div
                          className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider ${p.textMuted} border-b ${p.cardBorder}`}
                        >
                          Switch Network
                        </div>
                        {chains.map((chain) => (
                          <button
                            key={chain.id}
                            onClick={async () => {
                              try {
                                await switchChain({ chainId: chain.id })
                              } catch (err: any) {
                                const msg = err?.message ?? ''
                                const code = err?.code ?? ''
                                const isUnrecognized =
                                  code === 4902 ||
                                  msg.includes('Unrecognized chain') ||
                                  msg.includes('Chain ID') ||
                                  msg.includes('chain id')
                                if (
                                  isUnrecognized &&
                                  (window as any).ethereum
                                ) {
                                  try {
                                    await (window as any).ethereum.request({
                                      method: 'wallet_addEthereumChain',
                                      params: [
                                        {
                                          chainId: `0x${chain.id.toString(16)}`,
                                          chainName: chain.name,
                                          nativeCurrency: chain.nativeCurrency,
                                          rpcUrls: chain.rpcUrls.default.http,
                                          blockExplorerUrls: chain
                                            .blockExplorers?.default.url
                                            ? [chain.blockExplorers.default.url]
                                            : undefined,
                                        },
                                      ],
                                    })
                                    await switchChain({ chainId: chain.id })
                                  } catch (addErr) {
                                    /* user rejected add */
                                  }
                                }
                              }
                              setShowNetworkMenu(false)
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition-colors ${p.textMain} ${p.cardHover}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Globe
                                className={`w-3.5 h-3.5 ${chainId === chain.id ? 'text-[#00D084]' : 'text-[#64748B]'}`}
                              />
                              {chain.name
                                .replace('Newton ', '')
                                .replace('Testnet', '')
                                .trim()}
                            </div>
                            {chainId === chain.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00D084]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${p.cardBgSolid} ${p.cardBorder}`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D084]" />
                <span className="text-xs font-mono text-[#94A3B8]">
                  {shortAddr(address)}
                </span>
              </div>
              <button
                onClick={() => disconnect()}
                className={`p-1.5 rounded-md ${p.cardHover} text-[#64748B] hover:text-[#E2E8F0] transition-colors cursor-pointer`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                disabled={connectPending}
                onClick={() =>
                  connectors.length === 1
                    ? connect({ connector: connectors[0] })
                    : setShowConnectMenu((v) => !v)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D084]/10 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/15 transition-colors cursor-pointer disabled:opacity-50"
              >
                {connectPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wallet className="w-3.5 h-3.5" />
                )}
                {connectPending ? 'Connecting…' : 'Connect'}
                {connectors.length > 1 && !connectPending && (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              <AnimatePresence>
                {showConnectMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowConnectMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className={`absolute top-full right-0 mt-2 w-48 rounded-xl border z-50 overflow-hidden shadow-xl ${p.dark ? 'bg-[#131825] border-white/10' : 'bg-white border-black/10'}`}
                    >
                      <div
                        className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider ${p.textMuted} border-b ${p.cardBorder}`}
                      >
                        Select Wallet
                      </div>
                      {connectors.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            connect({ connector: c })
                            setShowConnectMenu(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-colors ${p.textMain} ${p.cardHover}`}
                        >
                          <Wallet className={`w-3.5 h-3.5 ${p.textMuted}`} />
                          {c.name}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {/* Layout */}
      <div className="pt-14 flex max-w-6xl mx-auto relative z-10">
        <aside className="hidden md:flex w-52 flex-col p-4 gap-0.5 sticky top-14 h-[calc(100vh-56px)]">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-6 h-6 rounded-md bg-[#00D084] flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className={`text-sm font-semibold ${p.textMain}`}>
              pay.id
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium">
              BETA
            </span>
          </div>

          {navItems.map((item) => {
            const isActive = currentPath === item.to
            return (
              <Link key={item.to} to={item.to}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? `${p.dark ? 'bg-white/6 text-white' : 'bg-black/6 text-[#0F172A]'}`
                      : `${p.textSecondary} hover:text-[#94A3B8]`
                  }`}
                >
                  <item.icon
                    className="w-4.5 h-4.5"
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}

          {/* <div className="mt-auto">
            <div
              className="h-125 w-full rounded-3xl relative overflow-hidden"
              style={{ backgroundColor: p.cardBg }}
            >
              <div
                className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`}
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-1">
                    {['#00D084', '#0EA5E9', '#F59E0B', '#EF4444'].map(
                      (c, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-[#0B0F1A]"
                          style={{ background: c }}
                        />
                      ),
                    )}
                  </div>
                </div>
                <div className={`text-xs font-medium ${p.textMain} mb-1`}>
                  PAY.ID is currently in beta
                </div>
                <div className={`text-[11px] ${p.textMuted}`}>
                  Click to learn more
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-3">
              <a
                href="#"
                className={`text-[11px] ${p.textMuted} hover:${p.textSecondary} transition-colors`}
              >
                Docs
              </a>
              <span className={`text-[11px] ${p.textMuted}`}>·</span>
              <a
                href="#"
                className={`text-[11px] ${p.textMuted} hover:${p.textSecondary} transition-colors`}
              >
                X (Twitter)
              </a>
            </div>
          </div> */}
        </aside>

        {/* Mobile nav - replaced with DynamicIsland */}
        <DynamicIsland navItems={navItems} currentPath={currentPath} p={p} />

        {/* Main */}
        <main className="flex-1 p-5 md:p-8 pb-20 md:pb-8 min-h-[calc(100vh-56px)]">
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
