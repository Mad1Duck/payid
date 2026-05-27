import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import PremiumButton from '@/components/v4/PremiumButton'

interface Props {
  p: any
}

export function DisconnectButton({ p }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl p-5 relative backdrop-blur-20"
      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}
    >
      <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#EF4444]/10">
          <LogOut className="w-5 h-5 text-[#EF4444]" />
        </div>
        <div className="flex-1">
          <div className={`text-sm font-medium ${p.textMain}`}>Disconnect Wallet</div>
          <div className={`text-xs ${p.textMuted}`}>Sign out of your account</div>
        </div>
        <PremiumButton
          variant="ghost"
          size="sm"
          className="text-[#EF4444] hover:bg-[#EF4444]/10"
        >
          Disconnect
        </PremiumButton>
      </div>
    </motion.div>
  )
}
