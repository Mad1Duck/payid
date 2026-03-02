import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface QRCodeDisplayProps {
  amount: number
  token: string
  expiresAt: Date
  label?: string
}

export function QRCodeDisplay({
  amount,
  token,
  expiresAt,
  label,
}: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const isExpired = timeLeft === 'Expired'

  return (
    <div className="flex flex-col items-center">
      {/* QR Container */}
      <div
        className={cn(
          'relative p-6 rounded-3xl bg-card border border-border/50 shadow-soft-lg',
          isExpired && 'opacity-50',
        )}
      >
        {/* Simulated QR Code */}
        <div className="w-48 h-48 bg-foreground rounded-2xl p-3">
          <div className="w-full h-full bg-background rounded-xl grid grid-cols-8 gap-0.5 p-2">
            {Array.from({ length: 64 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-sm',
                  Math.random() > 0.4 ? 'bg-foreground' : 'bg-transparent',
                )}
              />
            ))}
          </div>
        </div>

        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-lg">
            <span className="text-accent-foreground font-bold text-lg">P</span>
          </div>
        </div>

        {/* Expired overlay */}
        {isExpired && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-3xl backdrop-blur-sm">
            <span className="text-destructive font-medium">
              Session Expired
            </span>
          </div>
        )}
      </div>

      {/* Payment details */}
      <div className="mt-6 text-center space-y-3">
        <div>
          <span className="text-3xl font-bold text-foreground">{amount}</span>
          <span className="text-xl text-muted-foreground ml-2">{token}</span>
        </div>

        {/* Timer */}
        <div
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full',
            isExpired ? 'bg-destructive-muted' : 'bg-warning-muted',
          )}
        >
          <Clock
            className={cn(
              'w-4 h-4',
              isExpired ? 'text-destructive' : 'text-warning',
            )}
          />
          <span
            className={cn(
              'font-mono font-medium',
              isExpired ? 'text-destructive' : 'text-warning',
            )}
          >
            {timeLeft}
          </span>
        </div>

        {/* Label */}
        {label && (
          <p className="text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-secondary rounded-md">{label}</span>
          </p>
        )}
      </div>
    </div>
  )
}
