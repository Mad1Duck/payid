import { AnimatePresence, motion } from 'framer-motion'
import { Fingerprint } from 'lucide-react'

export function SignatureAnimation({ active }: { active: boolean }) {
  return (
    <div className="relative w-full h-20 flex items-center justify-center">
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            exit={{ opacity: 0 }}
            className="absolute"
          >
            <Fingerprint className="w-12 h-12 text-[#06B6D4]" />
          </motion.div>
        )}
      </AnimatePresence>
      {active && (
        <motion.div
          className="absolute text-[10px] font-mono text-[#06B6D4]"
          animate={{ opacity: [0, 1, 0], y: [10, -10, -20] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          0x7a3f...e91b
        </motion.div>
      )}
    </div>
  )
}
