import { motion } from 'framer-motion'
import { Copy, Check, QrCode, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Avatar } from '@/features/shared/components/Avatar'

interface Props {
  isConnected: boolean
  address: `0x${string}` | undefined
  payId: string
  copied: boolean
  handleCopy: () => void
  p: any
}

export function PersonalLinkCard({ isConnected, address, payId, copied, handleCopy, p }: Props) {
  return (
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
            <h3 className={`text-sm font-semibold ${p.textMain}`}>Your Personal Link</h3>
            <p className={`text-xs ${p.textMuted} mt-0.5`}>Share to get paid</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          </motion.button>
        </div>

        <div className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}>
          <Avatar name={isConnected && address ? address : 'demo'} size={36} />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${p.textMain} truncate`}>{payId}</div>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={handleCopy}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
            >
              {copied ? <Check className="w-4 h-4 text-[#00D084]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
            >
              <QrCode className="w-4 h-4 text-[#64748B]" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-lg ${p.cardHover} transition-colors cursor-pointer`}
            >
              <ArrowUpRight className="w-4 h-4 text-[#64748B]" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
