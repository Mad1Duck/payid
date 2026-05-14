import { Settings, FileText, Eye } from 'lucide-react'

export interface IssuerConfig {
  walletAddress: string
  network: string
  contractAddress: string
  lastSigned: number // timestamp
  totalProofs: number
}

interface IssuerPanelProps {
  config: IssuerConfig
  onTestSign?: () => void
  onViewProofs?: () => void
  onConfig?: () => void
  className?: string
}

export function IssuerPanel({ config, onTestSign, onViewProofs, onConfig, className = '' }: IssuerPanelProps) {
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}}`

  const timeSinceLastSigned = () => {
    const now = Date.now()
    const diff = now - config.lastSigned
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (mins > 0) return `${mins} min${mins > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div className={`card p-5 ${className}`}>
      {/* Header */}
      <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Issuer Configuration
      </div>

      <div className="separator mb-4" />

      {/* Issuer Details */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Wallet Address
          </span>
          <span className="text-sm address">{shortAddr(config.walletAddress)}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Network
          </span>
          <span className="text-sm">{config.network}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Contract
          </span>
          <span className="text-sm address">{shortAddr(config.contractAddress)}</span>
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Last signed
          </div>
          <div className="text-sm">{timeSinceLastSigned()}</div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Total proofs
          </div>
          <div className="text-sm">{config.totalProofs}</div>
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onTestSign} className="btn btn-outline flex-1" style={{ fontSize: '12px', padding: '8px 16px' }}>
          <Settings style={{ width: 14, height: 14 }} />
          Test Sign
        </button>
        <button onClick={onViewProofs} className="btn btn-outline flex-1" style={{ fontSize: '12px', padding: '8px 16px' }}>
          <Eye style={{ width: 14, height: 14 }} />
          View Proofs
        </button>
        <button onClick={onConfig} className="btn btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>
          <FileText style={{ width: 14, height: 14 }} />
          Config
        </button>
      </div>
    </div>
  )
}
