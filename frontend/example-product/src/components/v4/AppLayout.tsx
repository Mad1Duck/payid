import { useState, useMemo } from 'react'
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
  Gift,
} from 'lucide-react'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useReadContract,
} from 'wagmi'
import { useV4Palette } from './theme'
import DynamicIsland from './DynamicIsland'
import type { ReactNode } from 'react'
import { shortAddr } from '@/features/shared/utils/address'
import { payIDVerifierAbi } from '@/constants/contracts'
import { usePayIDContext } from 'payid-react'
import { toast } from 'sonner'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { isPending: connectPending } = useConnect()
  const chainId = useChainId()
  const { chains, switchChain } = useSwitchChain()
  const [showConnectMenu, setShowConnectMenu] = useState(false)
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)
  const [switchingChainId, setSwitchingChainId] = useState<number | null>(null)
  const location = useLocation()
  const currentPath = location.pathname
  const p = useV4Palette()
  const isNavigating = useRouterState({ select: (s) => s.status === 'pending' })
  const { contracts } = usePayIDContext()

  /* ── Multi-wallet EIP-1193 detection ── */
  const detectedWallets = useMemo(() => {
    if (typeof window === 'undefined') return []
    const eth = (window as any).ethereum
    if (!eth) return []
    const providers = eth.providers ? [...eth.providers] : [eth]
    const wallets = [
      { id: 'metaMask', name: 'MetaMask', flag: 'isMetaMask' },
      { id: 'rabby', name: 'Rabby', flag: 'isRabby' },
      { id: 'trust', name: 'Trust Wallet', flag: 'isTrustWallet' },
      { id: 'coinbase', name: 'Coinbase Wallet', flag: 'isCoinbaseWallet' },
      { id: 'brave', name: 'Brave Wallet', flag: 'isBraveWallet' },
      { id: 'okx', name: 'OKX Wallet', flag: 'isOkxWallet' },
      { id: 'bitget', name: 'Bitget Wallet', flag: 'isBitgetWallet' },
    ]
    return wallets
      .map((w) => {
        const provider = providers.find((p: any) => p && p[w.flag])
        return { ...w, detected: !!provider, provider }
      })
      .sort((a, b) => (b.detected ? 1 : 0) - (a.detected ? 1 : 0))
  }, [])

  const handleWalletConnect = async (wallet: (typeof detectedWallets)[number]) => {
    if (!wallet.detected || !wallet.provider) {
      toast.error(`${wallet.name} not detected`, {
        description: 'Please install or unlock the wallet extension.',
      })
      return
    }
    try {
      await wallet.provider.request({ method: 'eth_requestAccounts' })
      setTimeout(() => window.location.reload(), 300)
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.error('Connection rejected', { description: 'You rejected the connection request.' })
      } else {
        toast.error('Connection failed', { description: err?.message ?? 'Unknown error' })
      }
    }
  }

  const { data: adminRole } = useReadContract({
    address: contracts.payIDVerifier,
    abi: payIDVerifierAbi,
    functionName: 'DEFAULT_ADMIN_ROLE',
  })
  const { data: isAdmin } = useReadContract({
    address: contracts.payIDVerifier,
    abi: payIDVerifierAbi,
    functionName: 'hasRole',
    args: adminRole ? [adminRole, address as `0x${string}`] : undefined,
    query: { enabled: !!adminRole && !!address },
  })

  const navItems = [
    { to: '/v4/app/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/v4/app/send', icon: Send, label: 'Send' },
    { to: '/v4/app/receive', icon: QrCode, label: 'Receive' },
    { to: '/v4/app/gift', icon: Gift, label: 'Gift Card' },
    { to: '/v4/app/history', icon: History, label: 'History' },
    { to: '/v4/app/rules', icon: Shield, label: 'Policy' },
    { to: '/v4/app/rules/builder', icon: Pencil, label: 'Rule Builder' },
    { to: '/v4/app/agent', icon: Bot, label: 'AI Agent' },
    { to: '/v4/app/ai-agents', icon: Cpu, label: 'My AI Agents' },
    { to: '/v4/app/proof', icon: Zap, label: 'Proof' },
    // { to: '/v4/app/tools', icon: Wrench, label: 'Tools' },
    // { to: '/v4/app/payroll', icon: Users, label: 'Payroll' },
    ...(isAdmin ? [{ to: '/v4/app/admin', icon: Lock, label: 'Admin' }] : []),
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
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <PayIDLogo className="w-7 h-7 filter drop-shadow-[0_0_8px_rgba(0,208,132,0.2)]" />
              <span
                className={`text-[15px] font-semibold tracking-tight ${p.textMain}`}
              >
                PAY.ID
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#00D084]/8 border border-[#00D084]/15 text-[10px] font-bold text-[#00D084]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D084] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00D084]" />
              </span>
              WASM Sandbox Shield: ACTIVE
            </div>
            <a
              href="https://docs.payid.nawasena-labs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center gap-1 text-xs font-medium ${p.textSecondary} hover:text-[#00D084] transition-colors`}
            >
              Docs
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-3">
              {/* Network Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowNetworkMenu((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${p.cardBgSolid} ${p.cardBorder} hover:border-[#00D084]/30 cursor-pointer`}
                >
                  {switchingChainId !== null ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00D084]" />
                  ) : (
                    <Globe
                      className={`w-3.5 h-3.5 ${chainId === 16601 || chainId === 16602 ? 'text-[#00D084]' : 'text-[#94A3B8]'}`}
                    />
                  )}
                  <span className={`text-xs font-bold ${p.textMain}`}>
                    {switchingChainId !== null
                      ? 'Switching…'
                      : chains
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
                            disabled={switchingChainId !== null}
                            onClick={async () => {
                              setSwitchingChainId(chain.id)
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
                              setSwitchingChainId(null)
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition-colors ${p.textMain} ${p.cardHover} ${switchingChainId === chain.id ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-2.5">
                              {switchingChainId === chain.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00D084]" />
                              ) : (
                                <Globe
                                  className={`w-3.5 h-3.5 ${chainId === chain.id ? 'text-[#00D084]' : 'text-[#64748B]'}`}
                                />
                              )}
                              {chain.name
                                .replace('Newton ', '')
                                .replace('Testnet', '')
                                .trim()}
                            </div>
                            {chainId === chain.id && switchingChainId !== chain.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00D084]" />
                            )}
                            {switchingChainId === chain.id && (
                              <span className="text-[10px] text-[#00D084]">Switching…</span>
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
                onClick={() => setShowConnectMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D084]/10 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/15 transition-colors cursor-pointer disabled:opacity-50"
              >
                {connectPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wallet className="w-3.5 h-3.5" />
                )}
                {connectPending ? 'Connecting…' : 'Connect'}
                <ChevronDown className="w-3 h-3" />
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
                      className={`absolute top-full right-0 mt-2 w-56 rounded-xl border z-50 overflow-hidden shadow-xl ${p.dark ? 'bg-[#131825] border-white/10' : 'bg-white border-black/10'}`}
                    >
                      <div
                        className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider ${p.textMuted} border-b ${p.cardBorder}`}
                      >
                        Select Wallet
                      </div>
                      {detectedWallets.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => {
                            handleWalletConnect(w)
                            setShowConnectMenu(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-colors ${p.textMain} ${p.cardHover}`}
                        >
                          <Wallet className={`w-3.5 h-3.5 ${w.detected ? 'text-[#00D084]' : p.textMuted}`} />
                          {w.name}
                          {w.detected ? (
                            <span className="ml-auto text-[10px] text-[#00D084]">Detected</span>
                          ) : (
                            <span className="ml-auto text-[10px] text-[#64748B]">Not installed</span>
                          )}
                        </button>
                      ))}
                      {detectedWallets.length === 0 && (
                        <div className={`px-4 py-3 text-xs ${p.textMuted}`}>
                          No wallets detected. Install a browser wallet extension.
                        </div>
                      )}
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

export function PayIDLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="payidLogoGrad">
          <stop stopColor="#00D084" offset="0%" />
          <stop stopColor="#00A36C" offset="100%" />
        </linearGradient>
      </defs>
      <g stroke="none" fill="none">
        {/* Shield Background Glow */}
        <circle cx="256" cy="256" r="240" fill="#00D084" fillOpacity="0.05" />
        
        {/* Modern Shield Path */}
        <path
          d="M256,40 L416,104 L416,248 C416,356 348,432 256,472 C164,432 96,356 96,248 L96,104 L256,40 Z" 
          stroke="url(#payidLogoGrad)"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#0B0F1A"
          fillOpacity="0.9"
        />
              
        {/* Locked Padlock Icon in the center */}
        {/* Shackle */}
        <path
          d="M192,208 L192,176 C192,140.7 220.7,112 256,112 C291.3,112 320,140.7 320,176 L320,208" 
          stroke="#FFFFFF"
          strokeWidth="24"
          strokeLinecap="round"
        />
              
        {/* Lock Body */}
        <rect x="176" y="208" width="160" height="120" rx="20" fill="url(#payidLogoGrad)" />
        
        {/* Keyhole */}
        <path d="M256,250 L256,280" stroke="#0B0F1A" strokeWidth="12" strokeLinecap="round" />
        <circle cx="256" cy="246" r="10" fill="#0B0F1A" />
      </g>
    </svg>
  )
}
