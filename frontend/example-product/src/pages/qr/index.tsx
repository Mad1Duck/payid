import { ArrowLeft, Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/QRCodeDisplay'
import { WalletButton } from '@/components/WalletButton'
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
    await navigator.clipboard.writeText(`https://pay.id/session/abc123`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 py-4"
        >
          <Link to="/">
            <button className="btn-tactile p-2.5 -ml-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Payment QR
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet'}
            </p>
          </div>
          {isGenerated && (
            <button
              onClick={handleReset}
              className="btn-tactile p-2.5 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20"
            >
              <RefreshCw className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </motion.header>

        {isGenerated ? (
          /* Generated QR View */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-8"
          >
            <QRCodeDisplay
              amount={parseFloat(amount)}
              token={selectedToken}
              expiresAt={expiresAt}
              label="Session Rule (off-chain)"
            />

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <Button
                size="default"
                className="w-full h-12 rounded-xl btn-tactile bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share QR
              </Button>
              <Button
                variant="outline"
                size="default"
                className="w-full h-12 rounded-xl btn-tactile border-slate-200 hover:bg-slate-50"
                onClick={handleCopyLink}
              >
                {isCopied ? (
                  <>
                    <Check className="w-5 h-5 mr-2 text-emerald-600" />
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
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-600 text-center">
                This is a temporary session payment. The QR code will expire
                after the countdown. Rules are evaluated off-chain for speed.
              </p>
            </div>
          </motion.div>
        ) : (
          /* Configuration View */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 space-y-6"
          >
            {/* Amount Input */}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    'w-full h-16 px-6 text-3xl font-bold text-foreground',
                    'bg-white border border-slate-200 rounded-xl',
                    'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
                    'transition-all duration-200',
                  )}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Token Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Token
              </label>
              <div className="grid grid-cols-4 gap-2">
                {tokenOptions.map((token) => (
                  <button
                    key={token}
                    onClick={() => setSelectedToken(token)}
                    className={cn(
                      'py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 btn-tactile',
                      selectedToken === token
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Expiration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {expirationOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedExpiration(option.value)}
                    className={cn(
                      'py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-200 btn-tactile',
                      selectedExpiration === option.value
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Requesting</span>
                <span className="font-bold text-slate-900">
                  {amount || '0'} {selectedToken}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-600 font-medium">Valid for</span>
                <span className="font-semibold text-slate-900">
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
              className="w-full mt-4 h-12 rounded-xl btn-tactile bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleGenerate}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Generate QR Code
            </Button>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  )
}
