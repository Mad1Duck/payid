import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'

interface Props {
  p: any
}

export function WalletConnectPrompt({ p }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center py-24"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#00D084]/10 border border-[#00D084]/20 flex items-center justify-center mx-auto mb-5">
        <Wallet className="w-7 h-7 text-[#00D084]" />
      </div>
      <h2 className={`text-xl font-bold ${p.textMain} mb-2`}>
        Connect Your Wallet
      </h2>
      <p className={`text-sm ${p.textMuted} max-w-xs mx-auto`}>
        Connect to instantly generate your PayID QR code and start receiving payments.
      </p>
    </motion.div>
  )
}
