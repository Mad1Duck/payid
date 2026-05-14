import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

export interface SessionPolicy {
  type: 'time' | 'count' | 'volume'
  maxTx: number
  window: number // seconds
  maxVolume: string // in USD
  currentTx: number
  currentVolume: string
  expiresAt: number // timestamp
  enabled: boolean
}

interface SessionPolicyPanelProps {
  policy: SessionPolicy
  onUpdate?: (policy: SessionPolicy) => void
  onReset?: () => void
  className?: string
}

export function SessionPolicyPanel({ policy, onUpdate, onReset, className = '' }: SessionPolicyPanelProps) {
  const [localPolicy, setLocalPolicy] = useState(policy)
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    setLocalPolicy(policy)
  }, [policy])

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, policy.expiresAt - now)
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setTimeRemaining(`${mins}m ${secs}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [policy.expiresAt])

  const handleSave = () => {
    onUpdate?.(localPolicy)
  }

  const txPercentage = (policy.currentTx / policy.maxTx) * 100
  const volumeNum = parseFloat(policy.currentVolume.replace(/[^0-9.-]+/g, ''))
  const maxVolumeNum = parseFloat(policy.maxVolume.replace(/[^0-9.-]+/g, ''))
  const volumePercentage = (volumeNum / maxVolumeNum) * 100

  return (
    <div className={`card p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Session Policy
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localPolicy.enabled}
            onChange={(e) => setLocalPolicy({ ...localPolicy, enabled: e.target.checked })}
            className="w-4 h-4 rounded"
            style={{ accentColor: 'var(--accent-blue)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Enabled
          </span>
        </label>
      </div>

      <div className="separator mb-4" />

      {/* Policy Configuration */}
      <div className="space-y-4 mb-4">
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Policy Type
          </label>
          <select
            value={localPolicy.type}
            onChange={(e) => setLocalPolicy({ ...localPolicy, type: e.target.value as any })}
            className="input"
            disabled={!localPolicy.enabled}
          >
            <option value="time">Time-based</option>
            <option value="count">Transaction Count</option>
            <option value="volume">Volume Cap</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Max Tx
            </label>
            <input
              type="number"
              value={localPolicy.maxTx}
              onChange={(e) => setLocalPolicy({ ...localPolicy, maxTx: parseInt(e.target.value) || 0 })}
              className="input"
              disabled={!localPolicy.enabled}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Window (s)
            </label>
            <input
              type="number"
              value={localPolicy.window}
              onChange={(e) => setLocalPolicy({ ...localPolicy, window: parseInt(e.target.value) || 0 })}
              className="input"
              disabled={!localPolicy.enabled}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Max Volume
          </label>
          <input
            type="text"
            value={localPolicy.maxVolume}
            onChange={(e) => setLocalPolicy({ ...localPolicy, maxVolume: e.target.value })}
            className="input"
            placeholder="$10,000"
            disabled={!localPolicy.enabled}
          />
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Current Session Status */}
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Current session:
        </div>

        <div className="space-y-3">
          {/* Tx Count Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>Tx count</span>
              <span className="address">
                {policy.currentTx} / {policy.maxTx}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${txPercentage}%`,
                  background: 'var(--accent-gradient)',
                }}
              />
            </div>
          </div>

          {/* Volume Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>Volume</span>
              <span className="address">
                {policy.currentVolume} / {policy.maxVolume}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${volumePercentage}%`,
                  background: 'var(--accent-gradient)',
                }}
              />
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Remaining</span>
            <span className="address">{timeRemaining}</span>
          </div>
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="btn btn-ghost"
          style={{ fontSize: '12px', padding: '8px 16px' }}
        >
          <RotateCcw style={{ width: 14, height: 14 }} />
          Reset Session
        </button>
        <button
          onClick={handleSave}
          disabled={!localPolicy.enabled}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '8px 16px' }}
        >
          Save Policy
        </button>
      </div>
    </div>
  )
}
