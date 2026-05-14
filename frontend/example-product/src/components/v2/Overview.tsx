import { useAccount } from 'wagmi'
import { Check, X, Clock } from 'lucide-react'

interface OverviewProps {
  stats?: {
    rules: number
    proofs: number
    sessions: number
  }
  recentActivity?: Array<{
    type: 'ALLOW' | 'DENY'
    amount: string
    recipient: string
    recipientPayID?: string
    timeAgo: string
  }>
  className?: string
}

export function Overview({ stats = { rules: 3, proofs: 14, sessions: 2 }, recentActivity, className = '' }: OverviewProps) {
  const { address, isConnected } = useAccount()

  const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  const defaultActivity: OverviewProps['recentActivity'] = [
    { type: 'ALLOW', amount: '0.5 ETH', recipient: '0xabc...def', recipientPayID: 'alice$pay.id', timeAgo: '2m ago' },
    { type: 'DENY', amount: '$200', recipient: '0x123...456', recipientPayID: 'suspicious.eth', timeAgo: '5m ago' },
    { type: 'ALLOW', amount: '100 USDC', recipient: '0x789...012', recipientPayID: 'bob$pay.id', timeAgo: '1h ago' },
  ]

  const activity = recentActivity || defaultActivity

  if (!isConnected) {
    return (
      <div className={`card p-8 text-center ${className}`}>
        <div className="text-4xl mb-4">🔐</div>
        <div className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Connect wallet to continue
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect your wallet to view your PayID dashboard
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Welcome,
        </div>
        <div className="text-2xl font-semibold text-gradient">
          {shortAddr(address || '')}
        </div>
      </div>

      <div className="separator mb-6" />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold mb-1" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.rules}
          </div>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Rules
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold mb-1" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.proofs}
          </div>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Proofs
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold mb-1" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.sessions}
          </div>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Sessions
          </div>
        </div>
      </div>

      <div className="separator mb-6" />

      {/* Recent Activity */}
      <div>
        <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Activity
        </div>
        <div className="space-y-2">
          {activity.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg animate-slide-up"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-default)',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                {item.type === 'ALLOW' ? (
                  <Check style={{ width: 16, height: 16, color: 'var(--status-allow)' }} />
                ) : (
                  <X style={{ width: 16, height: 16, color: 'var(--status-deny)' }} />
                )}
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {item.type} {item.amount} → {item.recipientPayID || item.recipient}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.recipientPayID ? item.recipient : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock style={{ width: 12, height: 12 }} />
                <span>{item.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
