import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { usePayIDContext } from 'payid-react'
import { parseEther, formatEther } from 'viem'
import { MobileLayout } from '@/components/v2/Layouts/MobileLayout'
import { WalletButton } from '@/components/v2/WalletButton'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Settings,
  Pause,
  Play,
  DollarSign,
  Activity,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── ABI fragments ─── */
const RULE_ITEM_ABI = [
  {
    name: 'subscriptionUsdCents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'ethUsdFeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'setSubscriptionUsdCents',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newCents', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setOracle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFeed', type: 'address' }],
    outputs: [],
  },
  {
    name: 'pause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'unpause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

const PRICE_FEED_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const

export default function AdminSettingsPage() {
  const { address, isConnected } = useAccount()
  const { contracts } = usePayIDContext()

  const { writeContract, isPending } = useWriteContract()

  const [newPrice, setNewPrice] = useState('')
  const [newOracle, setNewOracle] = useState('')

  /* ─── Read states ─── */
  const { data: subCents } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RULE_ITEM_ABI,
    functionName: 'subscriptionUsdCents',
  })

  const { data: oracleAddr } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RULE_ITEM_ABI,
    functionName: 'ethUsdFeed',
  })

  const { data: isPaused } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RULE_ITEM_ABI,
    functionName: 'paused',
  })

  /* ─── Price feed ─── */
  const { data: priceData } = useReadContract({
    address: oracleAddr,
    abi: PRICE_FEED_ABI,
    functionName: 'latestRoundData',
    query: { enabled: !!oracleAddr && oracleAddr !== '0x0000000000000000000000000000000000000000' },
  })

  const ethPrice = priceData
    ? (Number(priceData[1]) / 1e8).toFixed(2)
    : null

  const handleSetPrice = () => {
    if (!newPrice) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RULE_ITEM_ABI,
      functionName: 'setSubscriptionUsdCents',
      args: [BigInt(newPrice)],
    })
  }

  const handleSetOracle = () => {
    if (!newOracle) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RULE_ITEM_ABI,
      functionName: 'setOracle',
      args: [newOracle as `0x${string}`],
    })
  }

  const handleTogglePause = () => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: RULE_ITEM_ABI,
      functionName: isPaused ? 'unpause' : 'pause',
    })
  }

  /* ─── helpers ─── */
  const priceInEth = subCents && ethPrice
    ? ((Number(subCents) / 100) / Number(ethPrice)).toFixed(6)
    : '—'

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 py-4"
        >
          <Link to="/v3/dashboard">
            <button className="btn-tactile p-2.5 -ml-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Admin Settings
            </h1>
          </div>
          <WalletButton />
        </motion.header>

        {!isConnected ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-500">Connect wallet to access admin panel</p>
          </div>
        ) : (
          <>
            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'mt-4 p-4 rounded-2xl flex items-center gap-3',
                isPaused
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-emerald-50 border border-emerald-200'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isPaused ? 'bg-amber-100' : 'bg-emerald-100'
                )}
              >
                {isPaused ? (
                  <Pause className="w-5 h-5 text-amber-600" />
                ) : (
                  <Activity className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {isPaused ? 'Contract Paused' : 'Contract Active'}
                </p>
                <p className="text-xs text-slate-500">
                  {isPaused
                    ? 'All user operations are frozen'
                    : 'Normal operations enabled'}
                </p>
              </div>
              <button
                onClick={handleTogglePause}
                disabled={isPending}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                  isPaused
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700',
                  'disabled:opacity-50'
                )}
              >
                {isPaused ? 'Unpause' : 'Pause'}
              </button>
            </motion.div>

            {/* Subscription Price */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-slate-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Subscription Price
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Current (USD cents)</p>
                  <p className="text-lg font-bold text-slate-900">
                    {subCents?.toString() ?? '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Equiv. (ETH)</p>
                  <p className="text-lg font-bold text-slate-900">
                    {priceInEth}
                  </p>
                </div>
              </div>

              {ethPrice && (
                <p className="text-xs text-slate-500 mb-3">
                  Oracle ETH/USD: ${ethPrice}
                </p>
              )}

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="New price in cents (e.g. 35)"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  onClick={handleSetPrice}
                  disabled={isPending || !newPrice}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </motion.div>

            {/* Oracle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-slate-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Price Oracle
                </h2>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 mb-3">
                <p className="text-xs text-slate-500">Current Oracle</p>
                <p className="text-sm font-mono text-slate-900 break-all">
                  {oracleAddr ?? '—'}
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New oracle address (0x...)"
                  value={newOracle}
                  onChange={(e) => setNewOracle(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
                <button
                  onClick={handleSetOracle}
                  disabled={isPending || !newOracle}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  Set
                </button>
              </div>
            </motion.div>

            {/* Warning */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Admin Only
                </p>
                <p className="text-xs text-amber-600/80 mt-1">
                  These actions require ADMIN_ROLE on the RuleItemERC721
                  contract. If your wallet does not hold this role, the
                  transaction will revert.
                </p>
              </div>
            </motion.div>

            {/* Footer spacer */}
            <div className="mt-auto py-8" />
          </>
        )}
      </div>
    </MobileLayout>
  )
}
