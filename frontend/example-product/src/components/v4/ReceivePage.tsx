import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Copy, Share2, Wallet, ChevronRight, Check, Download } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useV4Palette } from './theme'

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function ReceivePage() {
  const p = useV4Palette()
  const { address, isConnected } = useAccount()
  const payId = isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id'
  const walletAddress = address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
  const [copied, setCopied] = useState(false)
  const [showAddress, setShowAddress] = useState(false)

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Receive</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>Share your PayID or scan QR to get paid.</p>
      </div>

      {/* QR Code Card — PIVY Style */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-[24px] p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)' }}
      >
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-white/80 text-sm font-medium">Your PayID QR</span>
          </div>
          <div className="w-48 h-48 mx-auto mb-4 rounded-2xl bg-white p-4 flex items-center justify-center">
            <QrCode className="w-32 h-32 text-[#0F172A]" />
          </div>
          <div className="text-white text-lg font-mono font-medium">{payId}</div>
          <div className="text-white/60 text-xs font-mono mt-1">{shortAddr(walletAddress)}</div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      {/* PayID Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>Your PayID</h3>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Share this link to receive payments</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
            <div className="w-8 h-8 rounded-full bg-[#00D084]/15 flex items-center justify-center">
              <span className="text-[#00D084] font-bold text-xs">P</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-mono font-medium ${p.textMain} truncate`}>{payId}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(payId)}
                className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              >
                {copied ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
              </button>
              <button className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}>
                <Share2 className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallet Address — Expandable */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative">
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#64748B]/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#64748B]" />
              </div>
              <div className="text-left">
                <div className={`text-sm font-medium ${p.textMain}`}>Wallet Address</div>
                <div className={`text-xs ${p.textMuted}`}>Advanced — direct transfer</div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 ${p.textMuted} transition-transform ${showAddress ? 'rotate-90' : ''}`} />
          </button>

          {showAddress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 rounded-xl bg-black/3 dark:bg-white/3"
            >
              <div className="flex items-center justify-between">
                <div className={`text-sm font-mono ${p.textMain}`}>{shortAddr(walletAddress)}</div>
                <button
                  onClick={() => handleCopy(walletAddress)}
                  className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
                >
                  {copied ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Download QR */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="text-center"
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#00D084] hover:bg-[#00D084]/10 transition-colors cursor-pointer">
          <Download className="w-4 h-4" /> Save QR Code
        </button>
      </motion.div>
    </div>
  )
}
