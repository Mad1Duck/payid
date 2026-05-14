import { useState } from 'react'
import { Plus, Search, ExternalLink } from 'lucide-react'
import { RuleCard, RuleConfig } from './RuleCard'

interface RuleRegistryPanelProps {
  rules: RuleConfig[]
  onAddRule?: (source: string) => void
  onSelectRule?: (rule: RuleConfig) => void
  className?: string
}

export function RuleRegistryPanel({ rules, onAddRule, onSelectRule, className = '' }: RuleRegistryPanelProps) {
  const [filter, setFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRuleSource, setNewRuleSource] = useState('')

  const filteredRules = rules.filter((rule) =>
    rule.name.toLowerCase().includes(filter.toLowerCase()) ||
    rule.source.toLowerCase().includes(filter.toLowerCase())
  )

  const handleAddRule = () => {
    if (newRuleSource.trim()) {
      onAddRule?.(newRuleSource)
      setNewRuleSource('')
      setShowAddModal(false)
    }
  }

  const getSourceBadge = (source: string) => {
    if (source.startsWith('ipfs://')) {
      return <span className="badge badge-abstain">IPFS</span>
    } else if (source.startsWith('https://')) {
      return <span className="badge badge-pending">HTTPS</span>
    } else if (source.startsWith('0x')) {
      return <span className="badge badge-allow">On-chain</span>
    }
    return <span className="badge badge-expired">Unknown</span>
  }

  const getStatusIndicator = (status: RuleConfig['status']) => {
    return status === 'active' ? (
      <div className="w-2 h-2 rounded-full bg-green-500" />
    ) : (
      <div className="w-2 h-2 rounded-full bg-gray-500" />
    )
  }

  return (
    <div className={`card p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Rule Registry
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '11px', padding: '6px 12px' }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Add Rule
        </button>
      </div>

      <div className="separator mb-4" />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter rules..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-full pl-10"
          style={{ height: '40px' }}
        />
      </div>

      <div className="separator mb-4" />

      {/* Rule List */}
      <div className="space-y-2 mb-4">
        {filteredRules.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <div className="text-4xl mb-2">📋</div>
            <div className="text-sm">No rules found</div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-outline mt-3"
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              Add your first rule
            </button>
          </div>
        ) : (
          filteredRules.map((rule) => (
            <div
              key={rule.source}
              onClick={() => onSelectRule?.(rule)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/5"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-3">
                {getStatusIndicator(rule.status)}
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {rule.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs address">{rule.source.slice(0, 16)}...</span>
                    {getSourceBadge(rule.source)}
                  </div>
                </div>
              </div>
              <ExternalLink style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
            </div>
          ))
        )}
      </div>

      <div className="separator mb-4" />

      {/* Footer */}
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''} loaded
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="card p-6 w-full max-w-md animate-scale-in">
            <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Add New Rule
            </div>
            <div className="separator mb-4" />
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  Rule Source
                </label>
                <input
                  type="text"
                  value={newRuleSource}
                  onChange={(e) => setNewRuleSource(e.target.value)}
                  placeholder="ipfs://Qm... or https://... or 0x..."
                  className="input w-full"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Enter an IPFS CID, HTTPS URL, or on-chain address
                </div>
              </div>
            </div>
            <div className="separator mb-4" />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewRuleSource('')
                }}
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                disabled={!newRuleSource.trim()}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
