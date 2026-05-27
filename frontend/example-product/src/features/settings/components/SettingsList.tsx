import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface SettingItem {
  icon: any
  label: string
  value: string
  color: string
  onClick?: () => void
}

interface Props {
  p: any
  settings: SettingItem[]
}

export function SettingsList({ p, settings }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="rounded-2xl p-2 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className="relative space-y-1">
        {settings.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.label}
              onClick={item.onClick}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl w-full text-left transition-colors ${p.cardHover} cursor-pointer`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${p.textMain}`}>{item.label}</div>
              </div>
              <div className={`text-xs ${p.textMuted}`}>{item.value}</div>
              <ChevronRight className={`w-4 h-4 ${p.textMuted}`} />
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
