import { useEffect } from 'react'
import { Bell, Plus, QrCode, Settings, Shield, Zap, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAccount, useBalance, useConfig } from 'wagmi'
import { formatUnits } from 'viem'
import {
  useMyRules,
  useActiveCombinedRule,
  useSubscription,
} from 'payid-react'
import { MobileLayout } from '@/components/v2/Layouts/MobileLayout'
import { BalanceCard } from '@/components/v2/BalanceCard'
import { PaymentCard } from '@/components/v2/PaymentCard'
import { MiniRuleMonitor } from '@/components/v2/MiniRuleMonitor'
import { WalletButton } from '@/components/v2/WalletButton'
import { Button } from '@/components/v2/ui/button'
import { motion } from 'framer-motion'

// Mock data for payments (no on-chain history hook yet)
const recentPayments = [
  {
    id: '1',
    amount: 250,
    token: 'USDC',
    status: 'allowed' as const,
    type: 'incoming' as const,
    sender: 'alice.pay.id',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '2',
    amount: 50,
    token: 'USDC',
    status: 'rejected' as const,
    type: 'incoming' as const,
    sender: 'unknown.sender',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
]

function shortAddr(addr?: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Not connected'
}

export default function HomePage() {
  const { address, isConnected, chainId } = useAccount()
  const { data: balanceData } = useBalance({ address })
  const config = useConfig()
  const nativeSymbol = config.chains.find((c) => c.id === chainId)?.nativeCurrency.symbol ?? 'ETH'

  // Real PayID data
  const {
    data: myRules = [],
    isLoading: rulesLoading,
    isError: rulesError,
  } = useMyRules()
  const {
    data: activeCombined,
    error: combinedError,
  } = useActiveCombinedRule(address)
  const { data: sub, error: subError } = useSubscription(address)

  // DEBUG: log raw hook data
  useEffect(() => {
    console.log('[DEBUG] chainId:', chainId)
    console.log('[DEBUG] address:', address)
    console.log('[DEBUG] balanceData:', balanceData)
    console.log('[DEBUG] myRules:', myRules)
    console.log('[DEBUG] rulesLoading:', rulesLoading)
    console.log('[DEBUG] rulesError:', rulesError)
    console.log('[DEBUG] activeCombined:', activeCombined)
    console.log('[DEBUG] combinedError:', combinedError)
    console.log('[DEBUG] sub:', sub)
    console.log('[DEBUG] subError:', subError)
  }, [
    chainId,
    address,
    balanceData,
    myRules,
    rulesLoading,
    rulesError,
    activeCombined,
    combinedError,
    sub,
    subError,
  ])

  const ruleCount = myRules.length
  const activeRuleCount = myRules.filter((r) => r.active).length
  const isSubActive = sub?.isActive ?? false
  const daysLeft = sub?.expiry
    ? Math.max(0, Math.floor((Number(sub.expiry) - Date.now() / 1000) / 86400))
    : 0

  const ruleConnections = [
    {
      id: 'policy',
      name: activeCombined ? 'Combined Policy' : 'No Policy',
      status: activeCombined ? ('active' as const) : ('pending' as const),
      type: 'custom' as const,
    },
    {
      id: 'sub',
      name: isSubActive ? `Sub (${daysLeft}d)` : 'No Subscription',
      status: isSubActive ? ('active' as const) : ('pending' as const),
      type: 'time' as const,
    },
    {
      id: 'rules',
      name: `${activeRuleCount} Rules Active`,
      status: activeRuleCount > 0 ? ('active' as const) : ('pending' as const),
      type: 'min-amount' as const,
    },
  ]

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between py-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              PayID
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? shortAddr(address) : 'Connect wallet to start'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WalletButton />
          </div>
        </motion.header>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2"
        >
          <BalanceCard
            balance={balanceData ? Number(formatUnits(balanceData.value, balanceData.decimals)) : 0}
            token={balanceData?.symbol ?? nativeSymbol}
            payId={address ? `pay.id/${shortAddr(address)}` : 'pay.id/...'}
          />
        </motion.div>

        {/* Mini Rule Monitor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-5"
        >
          <MiniRuleMonitor
            connections={ruleConnections}
            chainName={chainId?.toString() ?? 'Not Connected'}
          />
        </motion.div>

        {/* Quick Actions - Modular Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 grid grid-cols-2 gap-3"
        >
          <Link to="/rules/console">
            <Button
              size="lg"
              className="w-full h-14 rounded-xl btn-tactile bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Shield className="w-5 h-5 mr-2" />
              Rule Console
            </Button>
          </Link>
          <Link to="/qr">
            <Button
              size="lg"
              className="w-full h-14 rounded-xl btn-tactile bg-teal-600 hover:bg-teal-700 text-white"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Pay / QR
            </Button>
          </Link>
        </motion.div>

        {/* Stats Summary - Modular Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="module-card p-4 rounded-xl text-center">
              <p className="text-2xl font-bold text-foreground">
                {rulesLoading ? '...' : ruleCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
                My Rules
              </p>
            </div>
            <div className={cn(
              'module-card p-4 rounded-xl text-center',
              isSubActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200',
            )}>
              <p className={cn(
                'text-2xl font-bold',
                isSubActive ? 'text-emerald-600' : 'text-slate-500',
              )}>
                {isSubActive ? `${daysLeft}d` : 'Free'}
              </p>
              <p className={cn(
                'text-[10px] mt-1 uppercase tracking-wider font-medium',
                isSubActive ? 'text-emerald-600/80' : 'text-slate-500',
              )}>
                {isSubActive ? 'Sub Active' : 'No Sub'}
              </p>
            </div>
            <div className={cn(
              'module-card p-4 rounded-xl text-center',
              activeCombined ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200',
            )}>
              <p className={cn(
                'text-2xl font-bold',
                activeCombined ? 'text-teal-600' : 'text-slate-500',
              )}>
                {activeCombined ? 'On' : 'Off'}
              </p>
              <p className={cn(
                'text-[10px] mt-1 uppercase tracking-wider font-medium',
                activeCombined ? 'text-teal-600/80' : 'text-slate-500',
              )}>
                Policy
              </p>
            </div>
          </div>
        </motion.section>

        {/* Recent Activity */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Recent Activity
            </h2>
            <Link to="/history">
              <button className="text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors">
                View all
              </button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <PaymentCard key={payment.id} {...payment} />
            ))}
          </div>
        </motion.section>

        {/* Subscription CTA */}
        {!isSubActive && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-6 mb-6"
          >
            <Link to="/subscription">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors">
                <Zap className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Upgrade to Pro
                  </p>
                  <p className="text-xs text-amber-600/80">
                    Get 3 rule slots + full features
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  )
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

