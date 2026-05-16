import { motion } from 'framer-motion'
import { Link2 } from 'lucide-react'

export function BlockChainLink({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-8 h-8 rounded-lg border flex items-center justify-center"
          style={{ borderColor: active ? '#00D084' : '#334155', background: active ? 'rgba(0,208,132,0.08)' : 'transparent' }}
          animate={active ? { scale: [1, 1.1, 1], borderColor: ['#334155', '#00D084', '#334155'] } : {}}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        >
          <Link2 className="w-3.5 h-3.5" style={{ color: active ? '#00D084' : '#475569' }} />
        </motion.div>
      ))}
    </div>
  )
}
