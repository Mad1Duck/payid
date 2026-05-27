import { useState, useEffect } from 'react'

export function useCountdown(expiresAt: number | null, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('')
      setIsExpired(false)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const diff = expiresAt - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        setIsExpired(true)
        onExpire?.()
        return
      }

      setIsExpired(false)
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return { timeLeft, isExpired }
}
