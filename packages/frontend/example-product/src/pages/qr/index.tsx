import { ArrowLeft, Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/QRCodeDisplay'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/Layouts/MobileLayout'

const tokenOptions = ['USDC', 'USDT', 'ETH', 'SOL']
const expirationOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 1440 },
]

export default function QRPayment() {
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
    await navigator.clipboard.writeText(`https://pay.id/session/abc123`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <header className="flex items-center gap-4 py-4">
          <button className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Payment QR</h1>
            <p className="text-sm text-muted-foreground">
              Generate session payment
            </p>
          </div>
          {isGenerated && (
            <button
              onClick={handleReset}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </header>

        {isGenerated ? (
          /* Generated QR View */
          <div className="mt-8 animate-scale-in">
            <QRCodeDisplay
              amount={parseFloat(amount)}
              token={selectedToken}
              expiresAt={expiresAt}
              label="Session Rule (off-chain)"
            />

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <Button variant="default" size="default" className="w-full">
                <Share2 className="w-5 h-5 mr-2" />
                Share QR
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleCopyLink}
              >
                {isCopied ? (
                  <>
                    <Check className="w-5 h-5 mr-2 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" />
                    Copy Payment Link
                  </>
                )}
              </Button>
            </div>

            {/* Session info */}
            <div className="mt-6 p-4 rounded-2xl bg-secondary/50 border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                This is a temporary session payment. The QR code will expire
                after the countdown. Rules are evaluated off-chain for speed.
              </p>
            </div>
          </div>
        ) : (
          /* Configuration View */
          <div className="mt-6 space-y-6 animate-fade-in">
            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    'w-full h-16 px-6 text-3xl font-bold text-foreground',
                    'bg-card border border-border/50 rounded-2xl',
                    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                    'transition-all duration-200',
                  )}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Token Selection */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Token
              </label>
              <div className="grid grid-cols-4 gap-2">
                {tokenOptions.map((token) => (
                  <button
                    key={token}
                    onClick={() => setSelectedToken(token)}
                    className={cn(
                      'py-3 px-4 rounded-xl font-medium transition-all duration-200',
                      selectedToken === token
                        ? 'bg-primary text-primary-foreground shadow-soft-md'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    )}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration Selection */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Expiration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {expirationOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedExpiration(option.value)}
                    className={cn(
                      'py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200',
                      selectedExpiration === option.value
                        ? 'bg-primary text-primary-foreground shadow-soft-md'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Requesting</span>
                <span className="font-bold text-foreground">
                  {amount || '0'} {selectedToken}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Valid for</span>
                <span className="font-medium text-foreground">
                  {
                    expirationOptions.find(
                      (o) => o.value === selectedExpiration,
                    )?.label
                  }
                </span>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              size="default"
              className="w-full mt-4 h-12"
              onClick={handleGenerate}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Generate QR Code
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
