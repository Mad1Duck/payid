import { useEffect, useState } from 'react'
import type { RuleDefinition, usePayIDContext } from 'payid-react'
import type { Address } from 'viem'

const shortAddr = (addr?: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
const shortHash = (h?: string) =>
  h ? `${h.slice(0, 10)}...${h.slice(-6)}` : '—'
const formatExpiry = (ts?: bigint) =>
  !ts || ts === 0n
    ? 'No expiry'
    : new Date(Number(ts) * 1000).toLocaleDateString()

interface TxState {
  send: (args: any) => Promise<void>
  hash: `0x${string}` | null
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error'
  error: string | null
  reset: () => void
  isPending: boolean
}

const RULE_NFT_ABI = [
  {
    name: 'activateRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ruleId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const toHttpUrl = (uri: string): string => {
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
  }
  return uri
}

function useNFTImage(uri: string | undefined) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!uri) return
    setLoading(true)
    fetch(toHttpUrl(uri))
      .then((r) => r.json())
      .then((meta) => {
        const img = meta?.image
        if (img) setImageUrl(toHttpUrl(img))
      })
      .catch(() => setImageUrl(null))
      .finally(() => setLoading(false))
  }, [uri])

  return { imageUrl, loading }
}

export function RuleNFTCard({
  rule,
  myAddress,
  tx,
  contracts,
}: {
  rule: RuleDefinition
  myAddress: Address | undefined
  tx: TxState
  contracts: ReturnType<typeof usePayIDContext>['contracts']
}) {
  const { imageUrl, loading } = useNFTImage(rule.uri)

  return (
    <div
      key={rule.ruleId.toString()}
      className="rule-card"
      style={{ display: 'flex', gap: 14 }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          flexShrink: 0,
          background: 'var(--bg)',
          border: '1px solid var(--border2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <span className="spin" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`Rule #${rule.ruleId}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span style={{ fontSize: 24, opacity: 0.2 }}>◈</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="rule-id">
          RULE #{rule.ruleId.toString()} · v{rule.version} ·{' '}
          {shortHash(rule.ruleHash)}
        </div>
        <div className="rule-uri" title={rule.uri}>
          {rule.uri || '—'}
        </div>
        <div className="rule-footer">
          <div className="row" style={{ gap: 6 }}>
            <span
              className={`badge ${rule.active ? 'badge-active' : 'badge-inactive'}`}
            >
              {rule.active ? '● ACTIVE' : '○ INACTIVE'}
            </span>
            {rule.deprecated && (
              <span className="badge badge-red">DEPRECATED</span>
            )}
          </div>
          <div className="rule-meta">
            <span>BY {shortAddr(rule.creator)}</span>
            {rule.tokenId > 0n && <span>TOKEN #{rule.tokenId.toString()}</span>}
            {rule.expiry > 0n && <span>EXP {formatExpiry(rule.expiry)}</span>}
          </div>
          {!rule.active &&
            rule.creator.toLowerCase() === myAddress?.toLowerCase() && (
              <button
                className="btn btn-amber btn-sm"
                disabled={tx.isPending}
                onClick={() =>
                  void tx.send({
                    address: contracts.ruleItemERC721,
                    abi: RULE_NFT_ABI,
                    functionName: 'activateRule',
                    args: [rule.ruleId],
                    chain: undefined,
                    account: null,
                  })
                }
              >
                {tx.isPending ? <span className="spin" /> : '⚡ Activate'}
              </button>
            )}
        </div>
      </div>
    </div>
  )
}
