import { motion } from 'framer-motion'

interface Props {
  score: number
  isBlacklisted: boolean
  isTrusted: boolean
  repLoading: boolean
  p: any
}

export function ReputationCard({ score, isBlacklisted, isTrusted, repLoading, p }: Props) {
  const status = isBlacklisted ? 'Blacklisted' : isTrusted ? 'Trusted' : !repLoading ? 'Neutral' : null
  const statusColor = isBlacklisted ? '#EF4444' : isTrusted ? '#00D084' : '#F59E0B'
  const statusBg = isBlacklisted ? 'bg-[#EF4444]/10 text-[#EF4444]' : isTrusted ? 'bg-[#00D084]/10 text-[#00D084]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 }}
      className="rounded-2xl p-5 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-sm font-semibold ${p.textMain}`}>VRAN Reputation</h3>
            <p className={`text-xs ${p.textMuted} mt-0.5`}>Vindex Anti-Scam Network</p>
          </div>
          {status && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`px-2 py-1 rounded-full ${statusBg} text-xs font-medium`}
            >
              {status}
            </motion.span>
          )}
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={`flex items-center gap-3 p-3 rounded-xl ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
        >
          <motion.div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{
              background: statusColor,
              boxShadow: `0 0 15px ${statusColor}66`,
            }}
            animate={repLoading ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {repLoading ? '…' : score}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${p.textMain}`}>
              {repLoading ? 'Loading reputation…' : `${score} / 1000`}
            </div>
            <div className={`text-xs ${p.textMuted}`}>
              {isBlacklisted
                ? 'Account flagged by community'
                : isTrusted
                  ? 'High reputation account'
                  : 'Reputation score pending'}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
