import { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

// Types from sdk-core
export interface DecisionProof {
  signer: string
  ruleAuthority: string
  decision: 'ALLOW' | 'DENY' | 'ABSTAIN' | 'PENDING'
  nonce: string
  chainId: number
  ttlSeconds: number
  easUids: string[]
  rawSignature: string
  rawJson: string
}

interface DecisionProofPanelProps {
  proof: DecisionProof
  className?: string
}

export function DecisionProofPanel({ proof, className = '' }: DecisionProofPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1000)
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const getDecisionBadge = () => {
    switch (proof.decision) {
      case 'ALLOW':
        return <span className="badge badge-allow">ALLOW</span>
      case 'DENY':
        return <span className="badge badge-deny">DENY</span>
      case 'ABSTAIN':
        return <span className="badge badge-abstain">ABSTAIN</span>
      case 'PENDING':
        return <span className="badge badge-pending">PENDING</span>
    }
  }

  const timeRemaining = proof.ttlSeconds > 0 ? `${Math.floor(proof.ttlSeconds / 60)}m ${proof.ttlSeconds % 60}s` : 'Expired'

  return (
    <div className={`card p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          EIP-712 Decision Proof
        </div>
        {getDecisionBadge()}
      </div>

      <div className="separator mb-4" />

      {/* Proof Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Signer
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm address">{shortAddr(proof.signer)}</span>
            <button
              onClick={() => copyToClipboard(proof.signer, 'signer')}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              {copied === 'signer' ? (
                <span className="text-xs" style={{ color: 'var(--status-allow)' }}>✓</span>
              ) : (
                <Copy style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Rule Authority
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm address">{shortAddr(proof.ruleAuthority)}</span>
            <button
              onClick={() => copyToClipboard(proof.ruleAuthority, 'authority')}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              {copied === 'authority' ? (
                <span className="text-xs" style={{ color: 'var(--status-allow)' }}>✓</span>
              ) : (
                <Copy style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Nonce
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm address">{shortAddr(proof.nonce)}</span>
            <button
              onClick={() => copyToClipboard(proof.nonce, 'nonce')}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              {copied === 'nonce' ? (
                <span className="text-xs" style={{ color: 'var(--status-allow)' }}>✓</span>
              ) : (
                <Copy style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Chain ID
          </span>
          <span className="text-sm address">{proof.chainId}</span>
        </div>
        <div className="flex flex-col col-span-2">
          <span className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            TTL
          </span>
          <span className="text-sm address">
            {proof.ttlSeconds}s (expires in {timeRemaining})
          </span>
        </div>
      </div>

      <div className="separator mb-4" />

      {/* EAS UIDs */}
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          EAS UIDs:
        </div>
        <div className="space-y-2">
          {proof.easUids.map((uid, index) => (
            <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
              <span className="text-sm address">{shortAddr(uid)}</span>
              <button
                onClick={() => copyToClipboard(uid, `uid-${index}`)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                {copied === `uid-${index}` ? (
                  <span className="text-xs" style={{ color: 'var(--status-allow)' }}>✓</span>
                ) : (
                  <Copy style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
                )}
              </button>
            </div>
          ))}
        </div>
        {proof.ruleAuthority && (
          <a
            href={`https://base.easscan.org/attestation/${proof.easUids[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-2 text-xs hover:text-blue-400 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>Verify on EAS</span>
            <ExternalLink style={{ width: 12, height: 12 }} />
          </a>
        )}
      </div>

      <div className="separator mb-4" />

      {/* Raw Signature */}
      <div>
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Raw Signature:
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm address" style={{ wordBreak: 'break-all' }}>
            {shortAddr(proof.rawSignature)}
          </span>
          <button
            onClick={() => copyToClipboard(proof.rawSignature, 'signature')}
            className="btn btn-ghost"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            {copied === 'signature' ? 'Copied!' : 'Copy Raw'}
          </button>
          <button
            onClick={() => copyToClipboard(proof.rawJson, 'json')}
            className="btn btn-ghost"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            {copied === 'json' ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>

        {/* Expandable JSON */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {expanded ? (
            <ChevronUp style={{ width: 14, height: 14 }} />
          ) : (
            <ChevronDown style={{ width: 14, height: 14 }} />
          )}
          <span>{expanded ? 'Hide' : 'Show'} raw JSON</span>
        </button>

        {expanded && (
          <div
            className="mt-3 p-3 rounded-lg overflow-auto animate-slide-up"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              maxHeight: '200px',
            }}
          >
            <pre className="text-xs address" style={{ whiteSpace: 'pre-wrap' }}>
              {proof.rawJson}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
