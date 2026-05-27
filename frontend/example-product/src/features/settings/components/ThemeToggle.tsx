import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'

interface Props {
  p: any
  toggle: () => void
}

export function ThemeToggle({ p, toggle }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="rounded-2xl p-5 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.dark ? 'bg-white/4' : 'bg-black/4'}`}
          >
            {p.dark ? (
              <Moon className="w-5 h-5 text-[#64748B]" />
            ) : (
              <Sun className="w-5 h-5 text-[#F59E0B]" />
            )}
          </div>
          <div>
            <div className={`text-sm font-medium ${p.textMain}`}>
              Appearance
            </div>
            <div className={`text-xs ${p.textMuted}`}>
              {p.dark ? 'Dark' : 'Light'} mode
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggle}
          className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${p.dark ? 'bg-[#00D084]/30' : 'bg-[#00D084]/20'}`}
        >
          <motion.div
            animate={{ x: p.dark ? 0 : 20 }}
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform`}
          />
        </motion.button>
      </div>
    </motion.div>
  )
}
