import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import {
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
  const [activeItem, setActiveItem] = useState<NavItem | undefined>(undefined)

  useEffect(() => {
    const item = navItems.find((item) => currentPath === item.to)
    if (item) {
      setActiveItem(item)
    } else if (navItems.length > 0) {
      setActiveItem(navItems[0])
    }
  }, [currentPath, navItems])

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isExpanded])

  if (!activeItem) return null

  return (
    <div className="md:hidden">
      {/* Backdrop for Expanded Sheet */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-45"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isExpanded ? (
          /* Expanded Bottom Sheet Navigation Drawer */
          <motion.div
            key="expanded-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] border-t overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${
              p.dark ? 'bg-[#0E121E]/95 border-white/10' : 'bg-white/95 border-black/5'
            } safe-area-bottom`}
            style={{
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Top Drag Handle Indicator */}
            <div className="flex flex-col items-center pt-3 pb-1">
              <div className={`w-12 h-1 rounded-full ${p.dark ? 'bg-white/15' : 'bg-black/10'}`} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-2 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-5.5 h-5.5 rounded-lg bg-[#00D084]/15 flex items-center justify-center border border-[#00D084]/25">
                  <div className="w-2 h-2 rounded-sm bg-[#00D084]" />
                </div>
                <span className={`text-[14px] font-bold tracking-tight ${p.textMain}`}>
                  pay.id menu
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors ${
                  p.dark
                    ? 'bg-white/5 hover:bg-white/10 text-white/80'
                    : 'bg-black/5 hover:bg-black/10 text-black/80'
                }`}
              >
                Dismiss
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="px-5 pt-5 pb-8 max-h-[60vh] overflow-y-auto smooth-scroll">
              <div className="grid grid-cols-3 gap-y-5 gap-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPath === item.to
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsExpanded(false)}
                      className="flex flex-col items-center gap-2 p-1.5 rounded-2xl transition-all cursor-pointer group"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-[#00D084] text-[#0B0F1A] shadow-[0_0_15px_rgba(0,208,132,0.4)] scale-105'
                            : p.dark
                            ? 'bg-white/5 text-white/80 group-hover:bg-white/10 group-hover:text-white'
                            : 'bg-black/5 text-black/80 group-hover:bg-black/10 group-hover:text-black'
                        }`}
                      >
                        <Icon className="w-5.5 h-5.5 transition-transform duration-200 group-hover:scale-105 group-active:scale-95" />
                      </div>
                      <span
                        className={`text-[11px] font-medium text-center leading-tight transition-colors ${
                          isActive
                            ? 'text-[#00D084] font-semibold'
                            : p.dark
                            ? 'text-white/60 group-hover:text-white/90'
                            : 'text-black/60 group-hover:text-black/90'
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Collapsed State - Floating Pill */
          <motion.div
            key="collapsed-pill"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            {/* Soft Glow Shadow behind the Pill */}
            <div className="absolute inset-2 bg-[#00D084]/20 blur-xl rounded-full pointer-events-none" />

            {/* Main Pill Container */}
            <div
              className="relative rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] border"
              style={{
                background: p.glass.bg,
                borderColor: p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Expand Trigger Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-full cursor-pointer select-none"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#00D084] shadow-[0_0_10px_rgba(0,208,132,0.3)]">
                  {(() => {
                    const Icon = activeItem.icon
                    return <Icon className="w-4.5 h-4.5 text-[#0B0F1A]" />
                  })()}
                </div>
                <div className="text-left pr-1">
                  <div className={`text-[12px] font-bold tracking-tight leading-tight ${p.textMain}`}>
                    {activeItem.label}
                  </div>
                  <div className={`text-[9px] font-medium leading-none mt-0.5 ${p.textMuted}`}>
                    Tap to navigate
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <ChevronUp className={`w-3.5 h-3.5 ${p.textSecondary}`} />
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
