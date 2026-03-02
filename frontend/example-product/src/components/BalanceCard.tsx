import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface BalanceCardProps {
  balance: number
  token: string
  payId: string
}

export function BalanceCard({ balance, token, payId }: BalanceCardProps) {
  const [isHidden, setIsHidden] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payId)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary to-primary/80 p-6 text-primary-foreground">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-accent/5 blur-xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* PayID */}
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
            <span className="text-sm font-medium">{payId}</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-accent" />
            ) : (
              <Copy className="w-4 h-4 opacity-70" />
            )}
          </button>
        </div>

        {/* Balance */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm opacity-70 mb-1">Total Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {isHidden ? '••••••' : balance.toLocaleString()}
              </span>
              <span className="text-xl opacity-70">{token}</span>
            </div>
          </div>
          <button
            onClick={() => setIsHidden(!isHidden)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            {isHidden ? (
              <EyeOff className="w-5 h-5 opacity-70" />
            ) : (
              <Eye className="w-5 h-5 opacity-70" />
            )}
          </button>
        </div>

        {/* Read-only indicator */}
        <div className="mt-4 flex items-center gap-1.5 text-xs opacity-60">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Read-only balance</span>
        </div>
      </div>
    </div>
  )
}
