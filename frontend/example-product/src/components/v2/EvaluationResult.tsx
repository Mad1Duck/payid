import { Check, X, Skip, Clock } from 'lucide-react'

// Types from sdk-core
export type Decision = 'ALLOW' | 'DENY' | 'ABSTAIN' | 'PENDING'

export interface RuleTraceEntry {
  ruleName: string
  passed: boolean
  skipped: boolean
  duration: number
}

export interface RuleResult {
  decision: Decision
  sender: string
  receiver: string
  receiverPayID?: string
  amount: string
  token: string
  chain: string
  chainId: number
  trace: RuleTraceEntry[]
  evaluatedAt: string
}

interface EvaluationResultProps {
  result: RuleResult
  onProve?: () => void
  className?: string
}

export function EvaluationResult({ result, onProve, className = '' }: EvaluationResultProps) {
  const getDecisionBadge = () => {
    switch (result.decision) {
      case 'ALLOW':
        return (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--status-allow)', fontSize: '16px' }}>██</span>
            <span className="badge badge-allow">ALLOW</span>
          </div>
        )
      case 'DENY':
        return (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--status-deny)', fontSize: '16px' }}>██</span>
            <span className="badge badge-deny">DENY</span>
          </div>
        )
      case 'ABSTAIN':
        return (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--status-abstain)', fontSize: '16px' }}>██</span>
            <span className="badge badge-abstain">ABSTAIN</span>
          </div>
        )
      case 'PENDING':
        return (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--status-pending)', fontSize: '16px' }}>██</span>
            <span className="badge badge-pending">PENDING</span>
          </div>
        )
    }
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div className={`card p-5 ${className}`}>
      {/* Decision Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Decision:
        </div>
        {getDecisionBadge()}
      </div>

      <div className="separator mb-4" />

      {/* Context Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Sender
          </span>
          <span className="text-sm address">{shortAddr(result.sender)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Receiver
          </span>
          <span className="text-sm address">
            {shortAddr(result.receiver)}
            {result.receiverPayID && <span className="ml-2" style={{ color: 'var(--text-muted)' }}>({result.receiverPayID})</span>}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Amount
          </span>
          <span className="text-sm address">{result.amount} {result.token}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Chain
          </span>
          <span className="text-sm address">{result.chain} ({result.chainId})</span>
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Rule Trace */}
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Rule trace:
        </div>
        <div className="space-y-2">
          {result.trace.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg animate-slide-up"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                {entry.skipped ? (
                  <Skip style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                ) : entry.passed ? (
                  <Check style={{ width: 16, height: 16, color: 'var(--status-allow)' }} />
                ) : (
                  <X style={{ width: 16, height: 16, color: 'var(--status-deny)' }} />
                )}
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {entry.ruleName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span style={{ color: entry.skipped ? 'var(--text-muted)' : entry.passed ? 'var(--status-allow)' : 'var(--status-deny)' }}>
                  {entry.skipped ? 'skipped' : entry.passed ? 'passed' : 'failed'}
                </span>
                <span className="address" style={{ color: 'var(--text-muted)' }}>
                  {entry.duration}ms
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock style={{ width: 14, height: 14 }} />
          <span>Evaluated at: {new Date(result.evaluatedAt).toLocaleString()}</span>
        </div>
        {onProve && (
          <button onClick={onProve} className="btn btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Prove
          </button>
        )}
      </div>
    </div>
  )
}
