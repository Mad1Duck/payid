import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Copy, Share2, Wallet, ChevronRight, Check, Download, RefreshCw } from 'lucide-react'
import PremiumButton from './PremiumButton'
import { shortAddr } from '@/features/shared'
import { useReceivePage } from './receive/useReceivePage'

export default function ReceivePage() {
  const {
    p, address, payId, walletAddress,
    copied, showAddress, setShowAddress,
    status, payload, qrDataUrl, qrError, reset,
    maxAmount, setMaxAmount, expiryMin, setExpiryMin,
    handleGenerate, handleSaveQR, handleCopy,
  } = useReceivePage()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Receive</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>Generate a payment QR code for your customers.</p>
      </div>

      {/* QR Config */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="w-4 h-4 text-[#00D084]" />
            <span className={`text-sm font-semibold ${p.textMain}`}>QR Configuration</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[11px] ${p.textMuted} block mb-1`}>Max Amount (ETH)</label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Unlimited"
                className={`w-full px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30`}
              />
            </div>
            <div>
              <label className={`text-[11px] ${p.textMuted} block mb-1`}>Expiry (minutes)</label>
              <input
                type="number"
                value={expiryMin}
                onChange={(e) => setExpiryMin(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30`}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <PremiumButton
              onClick={handleGenerate}
              disabled={!address}
              isLoading={status === 'signing' || status === 'encoding' || status === 'rendering'}
              icon={<QrCode />}
            >
              Generate QR
            </PremiumButton>
            {payload && (
              <button
                onClick={reset}
                className="px-3 py-2.5 rounded-xl border border-[#64748B]/20 text-[#64748B] hover:bg-[#64748B]/5"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* QR Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)' }}
      >
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-white/80 text-sm font-medium">Your PayID QR</span>
          </div>
          <div className="w-48 h-48 mx-auto mb-4 rounded-2xl bg-white p-3 flex items-center justify-center overflow-hidden">
            {payload ? (
              qrDataUrl ? (
                <img src={qrDataUrl} alt="PayID QR" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}&format=png&ecc=M`}
                  alt="PayID QR"
                  className="w-full h-full object-contain rounded-xl"
                />
              )
            ) : (
              <QrCode className="w-32 h-32 text-[#0F172A]" />
            )}
          </div>
          <div className="text-white text-lg font-mono font-medium">{payId}</div>
          <div className="text-white/60 text-xs font-mono mt-1">{walletAddress ? shortAddr(walletAddress) : '—'}</div>
          {payload && (
            <button
              onClick={() => handleCopy(payload)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs hover:bg-white/25 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Payload'}
            </button>
          )}
          {qrError && (
            <p className="mt-2 text-white/70 text-xs">{qrError}</p>
          )}
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      {/* QR Display */}
      {payload && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-3xl p-6 relative backdrop-blur-20"
          style={{ background: p.glass.bg, border: p.glass.border }}
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
      )}

      {/* PayID Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-sm font-semibold ${p.textMain}`}>Wallet Address</h3>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>Advanced users only</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddress(!showAddress)}
              className="text-[#64748B] hover:text-[#00D084] transition-colors cursor-pointer"
            >
              {showAddress ? <ChevronRight className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
            </motion.button>
          </div>

          <AnimatePresence>
            {showAddress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/15 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#0EA5E9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono ${p.textMain} truncate`}>{walletAddress || '—'}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCopy(walletAddress)}
                  className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
                >
                  {copied ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
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
      {(payload || qrDataUrl) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="text-center"
        >
          <button
            onClick={handleSaveQR}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#00D084] hover:bg-[#00D084]/10 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Save QR Code
          </button>
        </motion.div>
      )}
    </div>
  )
}
