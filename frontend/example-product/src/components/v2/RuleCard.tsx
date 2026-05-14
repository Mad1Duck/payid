import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

// Types from sdk-core
export interface RuleConfig {
  name: string
  source: string // IPFS CID or HTTPS URL or on-chain address
  parameters: Record<string, unknown>
  ruleAuthority: string
  ttlSeconds: number
  chainId: number
  status: 'active' | 'expired' | 'unknown'
}

interface RuleCardProps {
  rule: RuleConfig
  className?: string
}

export function RuleCard({ rule, className = '' }: RuleCardProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const getStatusBadge = () => {
    switch (rule.status) {
      case 'active':
        return <span className="badge badge-allow">● Active</span>
      case 'expired':
        return <span className="badge badge-expired">● Expired</span>
      default:
        return <span className="badge badge-pending">● Unknown</span>
    }
  }

  return (
    <div className={`card p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(82, 152, 255, 0.1)' }}>
            <span className="text-lg">📋</span>
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Rule: {rule.name}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs address">{rule.source.slice(0, 20)}...</span>
              <button
                onClick={() => copyToClipboard(rule.source)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <span className="text-xs" style={{ color: 'var(--status-allow)' }}>✓</span>
                ) : (
                  <Copy style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
                )}
              </button>
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="separator mb-4" />

      {/* Parameters Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Object.entries(rule.parameters).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-sm address">{String(value)}</span>
          </div>
        ))}
      </div>

      <div className="separator mb-4" />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>Authority:</span>
            <span className="address">{shortAddr(rule.ruleAuthority)}</span>
            <button
              onClick={() => copyToClipboard(rule.ruleAuthority)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <Copy style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>TTL:</span>
            <span className="address">{rule.ttlSeconds}s</span>
          </div>
        </div>
        <a
          href={`https://etherscan.io/address/${rule.ruleAuthority}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-400 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>View on Scan</span>
          <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      </div>
    </div>
  )
}
