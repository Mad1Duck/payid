import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { shortAddr } from '@/features/shared'

interface Props {
  p: any
  displayPayId: string
  walletAddress: string
  activeQrUrl: string
  isLoading: boolean
  isExpired: boolean
  hasSecureQr: boolean
  timeLeft: string
}

export function QRCard({ p, displayPayId, walletAddress, activeQrUrl, isLoading, isExpired, hasSecureQr, timeLeft }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #00D084 0%, #00B86E 50%, #009E5C 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-400' : hasSecureQr ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
          <span className="text-white/90 text-xs font-medium">
            {isExpired ? 'Expired — regenerate' : hasSecureQr ? 'Secure' : 'Simple QR'}
          </span>
        </div>
        {hasSecureQr && timeLeft && !isExpired && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/10 text-white text-[10px] font-mono font-bold backdrop-blur-md">
            <Clock className="w-3 h-3" />
            {timeLeft}
          </div>
        )}
      </div>

      <div className="relative w-56 h-56 mx-auto mb-5 rounded-2xl bg-white p-3 shadow-xl">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-3 border-[#00D084]/20 border-t-[#00D084] rounded-full"
            />
          </div>
        ) : (
          <img
            src={activeQrUrl}
            alt="PayID QR"
            className="w-full h-full object-contain rounded-xl"
          />
        )}
      </div>

      <div className="text-center">
        <div className="text-white text-lg font-mono font-semibold tracking-tight">
          {displayPayId}
        </div>
        <div className="text-white/50 text-xs font-mono mt-0.5">
          {walletAddress ? shortAddr(walletAddress) : '—'}
        </div>
      </div>

      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
    </motion.div>
  )
}
