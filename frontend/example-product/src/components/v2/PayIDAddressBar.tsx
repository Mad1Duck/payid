import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'

interface PayIDAddressBarProps {
  onResolve?: (address: string) => void
  className?: string
}

export function PayIDAddressBar({ onResolve, className = '' }: PayIDAddressBarProps) {
  const { isConnected } = useAccount()
  const [value, setValue] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [result, setResult] = useState<'ALLOW' | 'DENY' | 'PENDING' | null>(null)

  const handleResolve = async () => {
    if (!value.trim()) return

    setIsResolving(true)
    setResult(null)

    // TODO: Integrate with payid-react hook for actual resolution
    // const { resolve } = usePayIDResolver()
    // const resolved = await resolve(value)

    // Simulate resolution for now
    setTimeout(() => {
      setResult('ALLOW')
      setIsResolving(false)
      onResolve?.(value)
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleResolve()
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ width: 18, height: 18, color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="alice$pay.id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          className="input w-full pl-12 pr-32"
          style={{ height: '48px', fontSize: '15px' }}
        />
        {isResolving ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: 'var(--accent-blue)' }} />
          </div>
        ) : (
          <button
            onClick={handleResolve}
            disabled={!isConnected || !value.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary"
            style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
          >
            Resolve
          </button>
        )}
      </div>

      {result && (
        <div className="flex items-center gap-2 animate-slide-up">
          <span className="badge badge-allow">
            {result === 'ALLOW' && '✓ ALLOW'}
            {result === 'DENY' && '✗ DENY'}
            {result === 'PENDING' && '⟳ PENDING'}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {value}
          </span>
        </div>
      )}

      {!isConnected && (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect wallet to resolve PayID addresses
        </div>
      )}
    </div>
  )
}
