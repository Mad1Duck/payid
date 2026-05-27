import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { shortAddr } from '@/features/shared/utils/address'
import { Avatar } from '@/features/shared/components/Avatar'

interface Props {
  p: any
  isConnected: boolean
  address: string
  payId: string
}

export function ProfileCard({ p, isConnected, address, payId }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          <Avatar name={isConnected && address ? address : 'demo'} size={56} />
          <div className="flex-1">
            <div className="text-white text-lg font-semibold">{payId}</div>
            <div className="text-white/70 text-xs font-mono mt-0.5">
              {isConnected && address ? shortAddr(address) : 'Not connected'}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
    </motion.div>
  )
}
