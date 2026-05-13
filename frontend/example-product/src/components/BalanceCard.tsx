import { Check, Copy, Eye, EyeOff, Wallet } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BalanceCardProps {
  balance: number
  token: string
  payId: string
  className?: string
}

export function BalanceCard({ balance, token, payId, className }: BalanceCardProps) {
  const [isHidden, setIsHidden] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payId)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'module-card rounded-2xl p-5 relative overflow-hidden',
        'bg-linear-to-br from-slate-900 to-slate-800',
        className,
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-teal-500/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-teal-500/5 blur-2xl translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-teal-400/50" />
      <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-teal-400/30" />

      <div className="relative z-10">
        {/* Header with PayID */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-4 h-4 text-teal-400" />
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-xs font-medium text-white/90">{payId}</span>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="btn-tactile p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-teal-400" />
            ) : (
              <Copy className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>

        {/* Balance Display */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">
              Total Balance
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white tracking-tight">
                {isHidden ? '••••••' : balance.toLocaleString()}
              </span>
              <span className="text-lg text-white/60 font-medium">{token}</span>
            </div>
          </div>
          <button
            onClick={() => setIsHidden(!isHidden)}
            className="btn-tactile p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            {isHidden ? (
              <EyeOff className="w-5 h-5 text-white/60" />
            ) : (
              <Eye className="w-5 h-5 text-white/60" />
            )}
          </button>
        </div>

        {/* Status indicator */}
        <div className="mt-5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[10px] font-medium text-teal-400 uppercase tracking-wider">
              Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
              Read-only
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
