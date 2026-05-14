import { useState } from 'react'
import { QrCode, RefreshCw, Share2, Copy, Check } from 'lucide-react'
import { useAccount } from 'wagmi'

const tokenOptions = ['USDC', 'USDT', 'ETH']
const expirationOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 1440 },
]

export function QRPage() {
  const { address, isConnected } = useAccount()
  const [amount, setAmount] = useState('100')
  const [selectedToken, setSelectedToken] = useState('USDC')
  const [selectedExpiration, setSelectedExpiration] = useState(15)
  const [isGenerated, setIsGenerated] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const expiresAt = new Date(Date.now() + selectedExpiration * 60 * 1000)

  const handleGenerate = () => {
    setIsGenerated(true)
  }

  const handleReset = () => {
    setIsGenerated(false)
  }

  const handleCopyLink = async () => {
    const payId = address ? `pay.id/${address.slice(0, 6)}...${address.slice(-4)}` : 'pay.id/unknown'
    await navigator.clipboard.writeText(`https://pay.id/${payId}?amount=${amount}&token=${selectedToken}`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Payment QR
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Generate QR code for payment requests
          </p>
        </div>
        {isGenerated && (
          <button
            onClick={handleReset}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {isGenerated ? (
        <div className="card p-6 space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div
              className="w-64 h-64 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            >
              <QrCode style={{ width: 200, height: 200 }} style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {amount} {selectedToken}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Expires: {expiresAt.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1">
              <Share2 style={{ width: 16, height: 16 }} />
              Share QR
            </button>
            <button
              className="btn btn-secondary flex-1"
              onClick={handleCopyLink}
            >
              {isCopied ? (
                <>
                  <Check style={{ width: 16, height: 16 }} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy style={{ width: 16, height: 16 }} />
                  Copy Link
                </>
              )}
            </button>
          </div>

          {/* Session Info */}
          <div
            className="p-4 rounded-lg text-xs text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              This is a temporary session payment. The QR code will expire after the countdown.
              Rules are evaluated off-chain for speed.
            </span>
          </div>
        </div>
      ) : (
        <div className="card p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0"
            />
          </div>

          {/* Token Selection */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Token
            </label>
            <div className="grid grid-cols-3 gap-2">
              {tokenOptions.map((token) => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token)}
                  className={`btn ${
                    selectedToken === token ? 'btn-primary' : 'btn-ghost'
                  }`}
                  style={{ padding: '8px' }}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Expiration Selection */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Expiration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {expirationOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedExpiration(option.value)}
                  className={`btn ${
                    selectedExpiration === option.value ? 'btn-primary' : 'btn-ghost'
                  }`}
                  style={{ padding: '8px', fontSize: '11px' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div
            className="p-4 rounded-lg space-y-2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Requesting</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {amount || '0'} {selectedToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Valid for</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {expirationOptions.find((o) => o.value === selectedExpiration)?.label}
              </span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="btn btn-primary w-full"
            onClick={handleGenerate}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Generate QR Code
          </button>
        </div>
      )}
    </div>
  )
}
