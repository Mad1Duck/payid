import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Copy, Check, Globe, DollarSign, ArrowRight, Sparkles } from 'lucide-react'
import { useV4Palette } from './theme'

type FiatCurrency = 'IDR' | 'SGD' | 'MYR' | 'THB' | 'PHP' | 'VND'

type QRISData = {
  merchantId: string
  amount: number
  currency: FiatCurrency
  expiry: number
  reference: string
}

export default function FiatAdapter() {
  const p = useV4Palette()
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>('IDR')
  const [amount, setAmount] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [generatedQR, setGeneratedQR] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const CURRENCIES: FiatCurrency[] = ['IDR', 'SGD', 'MYR', 'THB', 'PHP', 'VND']
  const CURRENCY_SYMBOLS: Record<FiatCurrency, string> = {
    IDR: 'Rp',
    SGD: 'S$',
    MYR: 'RM',
    THB: '฿',
    PHP: '₱',
    VND: '₫',
  }

  const generateQRISPayload = () => {
    if (!amount || !merchantId) return

    const data: QRISData = {
      merchantId,
      amount: parseFloat(amount),
      currency: selectedCurrency,
      expiry: Date.now() + 30 * 60 * 1000, // 30 minutes
      reference: `PAYID-${Date.now()}`,
    }

    // QRIS payload format (simplified for demo)
    const payload = `00020101021226580016ID.CO.QRIS.WWW011893600${merchantId}5204580259${data.amount}5303${data.currency}5802ID5910${data.reference}6007${data.expiry}6304${Math.floor(Math.random() * 10000)}`
    setGeneratedQR(payload)
  }

  const copyToClipboard = () => {
    if (generatedQR) {
      navigator.clipboard.writeText(generatedQR)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className={`text-lg font-semibold ${p.textMain} flex items-center gap-2`}>
          <Globe className="w-5 h-5 text-[#00D084]" />
          Fiat Bridge
        </h2>
        <p className={`text-xs ${p.textMuted} mt-0.5`}>Generate QRIS-compatible payloads for Southeast Asia payments</p>
      </div>

      {!generatedQR ? (
        <div className="rounded-2xl relative overflow-hidden p-5" style={{ background: p.cardBg }}>
          <div className={`absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`} />

          <div className="relative space-y-4">
            {/* Currency Selector */}
            <div>
              <label className={`text-[13px] font-medium ${p.textMain} mb-2 block`}>Select Currency</label>
              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map((curr) => (
                  <motion.button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedCurrency === curr
                        ? 'bg-[#00D084] text-[#0B0F1A]'
                        : `${p.dark ? 'bg-white/5 border border-white/10' : 'bg-black/4 border border-black/8'} ${p.textMain} ${p.cardHover}`
                    }`}
                  >
                    {curr}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Merchant ID */}
            <div>
              <label className={`text-[13px] font-medium ${p.textMain} mb-2 block`}>Merchant ID</label>
              <input
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="ID1029384756"
                className={`w-full px-4 py-3 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors font-mono text-sm`}
              />
            </div>

            {/* Amount */}
            <div>
              <label className={`text-[13px] font-medium ${p.textMain} mb-2 block`}>Amount ({CURRENCY_SYMBOLS[selectedCurrency]})</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${p.textMuted} font-mono`}>
                  {CURRENCY_SYMBOLS[selectedCurrency]}
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 rounded-xl font-mono text-sm"
                  style={{ background: p.inputBg, border: p.inputBorder, color: p.textMain }}
                />
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={generateQRISPayload}
              disabled={!amount || !merchantId}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate QRIS Payload
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* QR Code Display */}
            <div className="rounded-2xl relative overflow-hidden p-6 text-center" style={{ background: p.cardBg }}>
              <div className={`absolute inset-0 rounded-2xl border pointer-events-none ${p.cardBorder}`} />
              
              <div className="relative">
                <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-4 flex items-center justify-center mb-4">
                  <QrCode className="w-32 h-32 text-[#0B0F1A]" />
                </div>
                
                <div className={`text-[13px] font-medium ${p.textMain} mb-1`}>
                  {CURRENCY_SYMBOLS[selectedCurrency]} {amount}
                </div>
                <div className={`text-[11px] ${p.textMuted}`}>
                  Valid for 30 minutes
                </div>
              </div>
            </div>

            {/* Payload Display */}
            <div className="rounded-xl p-3 font-mono text-[11px] break-all relative overflow-hidden" style={{ background: p.terminalBg }}>
              <div className={`${p.dark ? 'text-slate-700' : 'text-slate-300'} mb-2`}>// QRIS Payload</div>
              <div className={p.textMain}>{generatedQR}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <motion.button
                onClick={copyToClipboard}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${p.dark ? 'bg-white/6 border border-white/8' : 'bg-black/4 border border-black/8'} ${p.textMain} text-sm font-medium ${p.cardHover} transition-colors cursor-pointer`}
              >
                {copied ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Payload'}
              </motion.button>
              <motion.button
                onClick={() => { setGeneratedQR(null); setAmount(''); setMerchantId(''); }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer"
              >
                Generate New
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Info Box */}
      <div className={`rounded-xl p-4 border ${p.cardBorder} space-y-2`}>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#00D084]" />
          <div className={`text-[13px] font-medium ${p.textMain}`}>Supported Networks</div>
        </div>
        <div className={`text-[11px] ${p.textMuted} leading-relaxed`}>
          QRIS (Indonesia), PayNow (Singapore), DuitNow (Malaysia), PromptPay (Thailand), InstaPay (Philippines), NAPAS (Vietnam)
        </div>
      </div>
    </div>
  )
}
