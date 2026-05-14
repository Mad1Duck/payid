import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Copy, Share2, ChevronDown, ChevronUp, QrCode } from 'lucide-react'
import { useAccount } from 'wagmi'

function shortAddr(addr?: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
}

export function ReceivePage() {
  const { address } = useAccount()
  const [copied, setCopied] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Mock PayID — in production this would come from user registration
  const payId = address ? `user${address.slice(2, 6)}@payid.app` : '—'

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'My Payment Address',
        text: `Send me money using my Payment Address: ${payId}`,
      })
    } else {
      handleCopy(payId)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft style={{ width: 20, height: 20, color: 'var(--text-primary)' }} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Receive Money
        </h1>
      </div>

      <div className="space-y-6">
        {/* PayID Card */}
        <div className="card p-6 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Your Payment Address
          </p>
          <p
            className="text-2xl font-bold mt-2 break-all"
            style={{ color: 'var(--accent-blue)' }}
          >
            {payId}
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Share this address — anyone can send you money using it
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleCopy(payId)}
              className="btn btn-outline flex-1 justify-center gap-2 py-2.5"
            >
              <Copy style={{ width: 16, height: 16 }} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShare}
              className="btn btn-primary flex-1 justify-center gap-2 py-2.5"
            >
              <Share2 style={{ width: 16, height: 16 }} />
              Share
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="card p-6 flex flex-col items-center">
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
            Scan to Pay
          </p>
          <div
            className="w-48 h-48 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <QrCode style={{ width: 80, height: 80, color: 'var(--text-muted)' }} />
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Others can scan this code to send you money instantly
          </p>
        </div>

        {/* Advanced: Wallet Address */}
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between"
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Advanced: Wallet Address
            </span>
            {showAdvanced ? (
              <ChevronUp style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
            )}
          </button>

          {showAdvanced && (
            <div className="px-4 pb-4 space-y-3 animate-slide-up">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Wallet Address
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono flex-1 break-all" style={{ color: 'var(--text-secondary)' }}>
                    {shortAddr(address)}
                  </p>
                  <button
                    onClick={() => address && handleCopy(address)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                This is your on-chain wallet address. You can also receive payments directly to this address.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
