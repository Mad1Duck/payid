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
      className="max-w-md mx-auto text-center py-20"
    >
      <Wallet className="w-10 h-10 text-[#64748B] mx-auto mb-4" />
      <h2 className={`text-lg font-semibold ${p.textMain} mb-1`}>
        Connect Wallet
      </h2>
      <p className={`text-xs ${p.textMuted}`}>
        Link your wallet to view transaction history.
      </p>
    </motion.div>
  )
}
