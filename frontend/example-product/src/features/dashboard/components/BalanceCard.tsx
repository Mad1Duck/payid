import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { QrCode, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/v4/Skeleton'
import { formatUSD } from '@/lib/utils'

interface Token {
  symbol: string
  name: string
  balance: string
  usd: number
  icon: string
}

interface Props {
  balanceValue: number
  ethUsdPrice: number
  balanceLoading: boolean
  tokens: Token[]
}

export function BalanceCard({ balanceValue, ethUsdPrice, balanceLoading, tokens }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)',
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
            <Skeleton className="h-10 w-40" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : (
          <div className="text-[40px] font-bold text-white tracking-tight leading-none mb-4">
            {formatUSD(balanceValue > 0 ? balanceValue * ethUsdPrice : 0)}
          </div>
        )}

        <div className="space-y-2">
          {balanceLoading ? (
            <div className="p-2 rounded-xl bg-white/10 flex items-center gap-3">
              <Skeleton className="w-8 h-8 shrink-0" rounded="rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <Skeleton className="h-2.5 w-16" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <Skeleton className="h-3 w-14" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
          ) : (
            tokens.slice(0, 2).map((token) => (
              <div key={token.symbol} className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                  {token.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{token.balance} {token.symbol}</div>
                  <div className="text-white/60 text-xs">{token.name}</div>
                </div>
                <div className="text-white/80 text-sm font-mono">{formatUSD(token.usd)}</div>
              </div>
            ))
          )}
        </div>

        <Link
          to="/v4/app/agent"
          className="mt-3 p-3 rounded-xl bg-white/15 backdrop-blur-sm flex items-center gap-3 hover:bg-white/20 transition-all cursor-pointer text-left w-full group"
        >
          <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-xs group-hover:scale-105 transition-transform">
            P
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium">Demo Token</div>
            <div className="text-white/70 text-xs">
              Try policy-driven AI Agent withdrawals! Experience secure, automated payout checks in our browser simulator. Click to test!
            </div>
          </div>
          <div className="text-white/60 group-hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <div className="mt-3 text-center">
          <span className="text-white/70 text-xs">Payments verified through PAY.ID policy</span>
        </div>
      </div>

      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-white/5" />
    </motion.div>
  )
}
