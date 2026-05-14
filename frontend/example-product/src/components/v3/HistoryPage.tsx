import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Transaction {
  id: string
  type: 'sent' | 'received'
  name: string
  payId: string
  amount: string
  token: string
  fiatAmount: string
  date: string
  status: 'completed' | 'pending' | 'failed'
  txHash: string
  fee: string
  feeFiat: string
}

const mockHistory: Transaction[] = [
  {
    id: 'tx1',
    type: 'sent',
    name: 'Alice Johnson',
    payId: 'alice@payid.app',
    amount: '0.05',
    token: 'ETH',
    fiatAmount: 'Rp 2.450.000',
    date: '14 May 2026, 14:32',
    status: 'completed',
    txHash: '0xabc123...def789',
    fee: '0.0001',
    feeFiat: 'Rp 4.900',
  },
  {
    id: 'tx2',
    type: 'received',
    name: 'Bob Smith',
    payId: 'bob@payid.app',
    amount: '0.12',
    token: 'ETH',
    fiatAmount: 'Rp 5.880.000',
    date: '13 May 2026, 09:15',
    status: 'completed',
    txHash: '0xfed456...cba321',
    fee: '0.0001',
    feeFiat: 'Rp 4.900',
  },
  {
    id: 'tx3',
    type: 'sent',
    name: 'Carol White',
    payId: 'carol@payid.app',
    amount: '0.03',
    token: 'ETH',
    fiatAmount: 'Rp 1.470.000',
    date: '12 May 2026, 18:45',
    status: 'completed',
    txHash: '0x123abc...789fed',
    fee: '0.0001',
    feeFiat: 'Rp 4.900',
  },
  {
    id: 'tx4',
    type: 'sent',
    name: 'David Lee',
    payId: 'david@payid.app',
    amount: '0.08',
    token: 'ETH',
    fiatAmount: 'Rp 3.920.000',
    date: '10 May 2026, 11:20',
    status: 'pending',
    txHash: '0x456def...123abc',
    fee: '0.0001',
    feeFiat: 'Rp 4.900',
  },
]

type FilterTab = 'all' | 'sent' | 'received'

const statusLabels: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'badge-allow' },
  pending: { label: 'Pending', className: 'badge-pending' },
  failed: { label: 'Failed', className: 'badge-deny' },
}

function TxDetail({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const [showExplain, setShowExplain] = useState(false)

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft style={{ width: 20, height: 20 }} />
        </button>
        <h2 className="text-lg font-semibold">Transaction Details</h2>
      </div>

      <div className="card p-5 space-y-5">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`badge ${statusLabels[tx.status].className}`}>
            {statusLabels[tx.status].label}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {tx.date}
          </span>
        </div>

        {/* Amount */}
        <div className="text-center py-2">
          <p
            className="text-3xl font-bold"
            style={{ color: tx.type === 'sent' ? '#EF4444' : 'var(--accent-green)' }}
          >
            {tx.type === 'sent' ? '-' : '+'}{tx.fiatAmount}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {tx.amount} {tx.token}
          </p>
        </div>

        {/* Participants */}
        <div className="space-y-3" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="flex justify-between pt-3">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {tx.type === 'sent' ? 'To' : 'From'}
            </span>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {tx.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tx.payId}
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Network fee</span>
            <div className="text-right">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{tx.feeFiat}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.fee} ETH</p>
            </div>
          </div>
        </div>

        {/* Transaction ID */}
        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Transaction ID</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono flex-1 break-all" style={{ color: 'var(--text-secondary)' }}>
              {tx.txHash}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(tx.txHash)}
              className="p-1.5 rounded-lg hover:bg-gray-200"
            >
              <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
            </button>
            <a
              href={`https://etherscan.io/tx/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-gray-200"
            >
              <ExternalLink style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
            </a>
          </div>
        </div>

        {/* Explainer */}
        <button
          onClick={() => setShowExplain(!showExplain)}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            What does this mean?
          </span>
          {showExplain ? (
            <ChevronUp style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          )}
        </button>

        {showExplain && (
          <div className="text-sm space-y-2 p-3 rounded-xl animate-slide-up" style={{ background: 'var(--bg-elevated)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              This is a payment {tx.type === 'sent' ? 'you sent' : 'you received'} on the blockchain.
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              The "Transaction ID" is like a receipt number — it proves this payment happened and can be verified by anyone.
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              The "Network fee" is a small charge paid to process this payment securely.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export function HistoryPage() {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const filtered = mockHistory.filter((tx) => {
    if (filter === 'all') return true
    return tx.type === filter
  })

  if (selectedTx) {
    return <TxDetail tx={selectedTx} onClose={() => setSelectedTx(null)} />
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Transaction History
      </h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'sent', 'received'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{
              background: filter === tab ? 'var(--accent-blue)' : 'var(--bg-elevated)',
              color: filter === tab ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filtered.map((tx) => (
          <button
            key={tx.id}
            onClick={() => setSelectedTx(tx)}
            className="card w-full p-4 flex items-center gap-4 text-left hover:scale-[1.01] transition-transform"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: tx.type === 'sent'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(0, 200, 150, 0.08)',
              }}
            >
              {tx.type === 'sent' ? (
                <ArrowUpRight style={{ width: 20, height: 20, color: '#EF4444' }} />
              ) : (
                <ArrowDownLeft style={{ width: 20, height: 20, color: 'var(--accent-green)' }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {tx.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {tx.date}
              </p>
            </div>

            <div className="text-right">
              <p
                className="text-sm font-semibold"
                style={{
                  color: tx.type === 'sent' ? '#EF4444' : 'var(--accent-green)',
                }}
              >
                {tx.type === 'sent' ? '-' : '+'}{tx.fiatAmount}
              </p>
              <span className={`badge ${statusLabels[tx.status].className} mt-1`}>
                {statusLabels[tx.status].label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
