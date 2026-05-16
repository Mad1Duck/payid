import { motion } from 'framer-motion'
import { Database, Hexagon } from 'lucide-react'

export function StorageHexGrid({ active }: { active: boolean }) {
  return (
    <div className="relative w-full h-24 flex items-center justify-center">
      <div className="grid grid-cols-6 gap-1">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-5 h-5 flex items-center justify-center"
            animate={active ? { scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] } : { opacity: 0.2 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
          >
            <Hexagon className="w-4 h-4 text-[#8B5CF6]" strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>
      {active && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Database className="w-8 h-8 text-[#8B5CF6]" />
        </motion.div>
      )}
    </div>
  )
}
