import { motion } from 'framer-motion'
import { Database, Save, FileText, History } from 'lucide-react'

interface Props {
  cacheStats: { rules: number; contacts: number; drafts: number; history: number }
  p: any
}

const CACHE_ITEMS = [
  { label: 'Rules', key: 'rules', icon: Database },
  { label: 'Contacts', key: 'contacts', icon: Save },
  { label: 'Drafts', key: 'drafts', icon: FileText },
  { label: 'History', key: 'history', icon: History },
]

export function CacheStats({ cacheStats, p }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.14 }}
      className="rounded-2xl p-5 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-sm font-semibold ${p.textMain}`}>Offline Cache</h3>
            <p className={`text-xs ${p.textMuted} mt-0.5`}>IndexedDB local storage</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">
            Local
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CACHE_ITEMS.map((item) => (
            <motion.div
              key={item.label}
              whileHover={{
                scale: 1.05,
                borderColor: 'rgba(0, 208, 132, 0.3)',
                backgroundColor: p.dark ? 'rgba(0, 208, 132, 0.04)' : 'rgba(0, 208, 132, 0.03)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`p-2.5 rounded-xl text-center border border-transparent transition-colors duration-200 cursor-default ${
                p.dark ? 'bg-white/3' : 'bg-black/3'
              }`}
            >
              <item.icon className="w-3.5 h-3.5 mx-auto mb-1 text-[#64748B]" />
              <div className={`text-sm font-bold font-mono ${p.textMain}`}>
                {cacheStats[item.key as keyof typeof cacheStats]}
              </div>
              <div className={`text-[10px] ${p.textMuted}`}>{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
