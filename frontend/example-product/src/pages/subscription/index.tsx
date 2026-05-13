import { ArrowLeft, Check, Clock, Shield, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useReadContract } from 'wagmi'
import { useSubscription, usePayIDContext, useSubscribe } from 'payid-react'
import { parseEther } from 'viem'
import { MobileLayout } from '@/components/Layouts/MobileLayout'
import { WalletButton } from '@/components/WalletButton'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const PRICE_ABI = [
  {
    name: 'subscriptionPriceETH',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

export default function SubscriptionPage() {
  const { address, isConnected } = useAccount()
  const { contracts } = usePayIDContext()
  const { data: sub, refetch } = useSubscription(address)
  const { subscribe, hash, isPending, isSuccess, isConfirming, error } = useSubscribe()

  const { data: subPrice } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: PRICE_ABI,
    functionName: 'subscriptionPriceETH',
  })

  useEffect(() => {
    if (isSuccess) void refetch()
  }, [isSuccess, refetch])

  const isSubActive = sub?.isActive ?? false
  const daysLeft = sub?.expiry
    ? Math.max(0, Math.floor((Number(sub.expiry) - Date.now() / 1000) / 86400))
    : 0

  const priceEth = subPrice ? (Number(subPrice) / 1e18).toFixed(6) : '0.001'

  const handleSubscribe = () => {
    const price = subPrice ? (subPrice as bigint) : parseEther('0.001')
    subscribe(price)
  }

  const txError = error ? (
    (error as { shortMessage?: string; message?: string }).shortMessage ??
    (error as { message?: string }).message ??
    'Transaction failed'
  ) : null

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 py-4"
        >
          <Link to="/">
            <button className="btn-tactile p-2.5 -ml-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Subscription
            </h1>
          </div>
          <WalletButton />
        </motion.header>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={cn(
            'mt-4 p-6 rounded-2xl text-center',
            isSubActive
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-slate-50 border border-slate-200',
          )}
        >
          <div
            className={cn(
              'w-16 h-16 mx-auto rounded-full flex items-center justify-center',
              isSubActive ? 'bg-emerald-100' : 'bg-slate-100',
            )}
          >
            {isSubActive ? (
              <Check className="w-8 h-8 text-emerald-600" />
            ) : (
              <Zap className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <h2
            className={cn(
              'text-2xl font-bold mt-4',
              isSubActive ? 'text-emerald-700' : 'text-slate-700',
            )}
          >
            {isSubActive ? 'Pro Active' : 'Free Tier'}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            {isSubActive
              ? `${daysLeft} days remaining`
              : 'Upgrade for full features'}
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-6 space-y-3"
        >
          {[
            { icon: Shield, label: 'Rule Slots', free: '1 slot', pro: '3 slots', active: true },
            { icon: Clock, label: 'Duration', free: 'Unlimited', pro: '30 days / renewal', active: isSubActive },
            { icon: Zap, label: 'Combined Rules', free: 'No', pro: 'Yes', active: isSubActive },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 p-4 rounded-xl module-card"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {feature.label}
                </p>
                <p className="text-xs text-slate-500">
                  {isSubActive ? feature.pro : feature.free}
                </p>
              </div>
              {feature.active && (
                <Check className="w-5 h-5 text-emerald-500" />
              )}
            </div>
          ))}
        </motion.div>

        {/* Price */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-800 font-medium">
              Subscription Price
            </span>
            <span className="text-lg font-bold text-amber-800">
              {priceEth} ETH
            </span>
          </div>
          <p className="text-xs text-amber-600/80 mt-1">
            ~30 days access. Renewable anytime.
          </p>
        </motion.div>

        {/* Transaction status */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center"
          >
            <p className="text-sm font-semibold text-emerald-700">
              Subscribed successfully!
            </p>
            {hash && (
              <p className="text-xs font-mono text-emerald-600/70 mt-1 truncate">
                TX: {hash}
              </p>
            )}
          </motion.div>
        )}
        {txError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-center"
          >
            <p className="text-sm font-semibold text-red-700">
              {txError}
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <div className="mt-auto py-6">
          <button
            onClick={handleSubscribe}
            disabled={isPending || isConfirming || !isConnected || isSubActive}
            className={cn(
              'w-full h-12 rounded-xl btn-tactile font-semibold text-white',
              isSubActive
                ? 'bg-emerald-600 cursor-default'
                : 'bg-slate-900 hover:bg-slate-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending || isConfirming
              ? 'Processing...'
              : isSubActive
                ? 'Already Subscribed'
                : 'Subscribe Now'}
          </button>
          {!isConnected && (
            <p className="text-center text-xs text-slate-500 mt-3">
              Connect wallet to subscribe
            </p>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}
