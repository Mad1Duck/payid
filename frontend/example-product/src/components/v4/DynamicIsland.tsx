import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type NavItem = {
  to: string
  icon: React.ElementType
  label: string
}

type DynamicIslandProps = {
  navItems: NavItem[]
  currentPath: string
  p: any // useV4Palette return type
}

export default function DynamicIsland({ navItems, currentPath, p }: DynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeItem, setActiveItem] = useState(navItems[0])

  useEffect(() => {
    const item = navItems.find(item => currentPath === item.to)
    if (item) setActiveItem(item)
  }, [currentPath, navItems])

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence>
        {isExpanded ? (
          /* Expanded State */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative"
          >
            {/* Backdrop blur */}
            <div className="absolute inset-0 -m-4 bg-black/20 backdrop-blur-3xl rounded-full" />
            
            {/* Main island */}
            <div
              className="relative rounded-full shadow-2xl overflow-hidden"
              style={{
                background: p.glass.bg,
                border: p.glass.border,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(false)}
                className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
                  p.dark ? 'bg-white/10 border border-white/20' : 'bg-black/10 border border-black/20'
                } ${p.textMain}`}
              >
                <ChevronUp className="w-4 h-4" />
              </motion.button>

              {/* Expanded nav items */}
              <div className="px-6 py-8">
                <div className="grid grid-cols-3 gap-4">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeItem.to === item.to
                    return (
                      <motion.button
                        key={item.to}
                        onClick={() => {
                          setActiveItem(item)
                          setIsExpanded(false)
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer"
                        style={{
                          background: isActive ? 'rgba(0, 208, 132, 0.1)' : 'transparent',
                          border: isActive ? '1px solid rgba(0, 208, 132, 0.3)' : '1px solid transparent',
                        }}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive ? 'bg-[#00D084]' : p.dark ? 'bg-white/10' : 'bg-black/10'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${isActive ? 'text-[#0B0F1A]' : p.textMain}`}
                          />
                        </div>
                        <span className={`text-[11px] font-medium ${isActive ? 'text-[#00D084]' : p.textMuted}`}>
                          {item.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Collapsed State - Pill */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative"
          >
            {/* Backdrop blur */}
            <div className="absolute inset-0 -m-4 bg-black/20 backdrop-blur-3xl rounded-full" />
            
            {/* Main pill */}
            <div
              className="relative rounded-full shadow-2xl overflow-hidden px-2 py-2"
              style={{
                background: p.glass.bg,
                border: p.glass.border,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Expand button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-full cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00D084]">
                  {(() => {
                    const Icon = activeItem.icon
                    return <Icon className="w-5 h-5 text-[#0B0F1A]" />
                  })()}
                </div>
                <div className="text-left">
                  <div className={`text-[13px] font-semibold ${p.textMain}`}>{activeItem.label}</div>
                  <div className={`text-[10px] ${p.textMuted}`}>Tap to expand</div>
                </div>
                <ChevronDown className={`w-4 h-4 ${p.textMuted}`} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
