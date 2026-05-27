import { motion } from 'framer-motion'

interface Props {
  totalSent: number
  totalReceived: number
}

export function StatsCards({ totalSent, totalReceived }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-xl p-5 relative overflow-hidden cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="text-white/80 text-xs font-medium mb-1">
            Total Sent
          </div>
          <div className="text-2xl font-bold text-white">
            ${totalSent.toFixed(2)}
          </div>
        </div>
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-xl p-5 relative overflow-hidden cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #00D084 0%, #00B86E 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="text-white/80 text-xs font-medium mb-1">
            Total Received
          </div>
          <div className="text-2xl font-bold text-white">
            ${totalReceived.toFixed(2)}
          </div>
        </div>
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
      </motion.div>
    </div>
  )
}
