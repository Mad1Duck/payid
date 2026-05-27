import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, ChevronRight, Copy, Check } from 'lucide-react'

interface Props {
  p: any
  showAddress: boolean
  setShowAddress: (show: boolean) => void
  walletAddress: string
  copiedWallet: boolean
  handleCopyWallet: () => void
}

export function WalletAddress({ p, showAddress, setShowAddress, walletAddress, copiedWallet, handleCopyWallet }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="rounded-2xl p-4 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <button
        onClick={() => setShowAddress(!showAddress)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-[#0EA5E9]" />
          <span className={`text-xs font-semibold ${p.textMain}`}>
            Wallet Address
          </span>
          <span className={`text-[10px] ${p.textMuted}`}>
            For advanced users
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-[#64748B] transition-transform ${showAddress ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence>
        {showAddress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-3 flex items-center gap-2.5 p-3 rounded-xl ${p.dark ? 'bg-white/5' : 'bg-black/3'} border ${p.cardBorder}`}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-mono ${p.textMain} truncate`}>
                  {walletAddress || '—'}
                </div>
              </div>
              <button
                onClick={handleCopyWallet}
                className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
              >
                {copiedWallet ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
