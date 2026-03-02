import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CartridgeSlotProps {
  slotId: string
  label: string
  isHighlighted?: boolean
  children?: React.ReactNode
  onDrop?: () => void
}

export const CartridgeSlot = forwardRef<HTMLDivElement, CartridgeSlotProps>(
  ({ slotId, label, isHighlighted = false, children }, ref) => {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* Slot Label */}
        <span className="text-[10px] font-mono uppercase tracking-widest text-console-label">
          {label}
        </span>

        {/* Slot Container */}
        <motion.div
          ref={ref}
          data-slot-id={slotId}
          className={cn(
            'relative w-[72px] h-[88px] rounded-sm',
            'bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]',
            'shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),inset_0_-2px_4px_rgba(255,255,255,0.02)]',
            'border-2 border-black/60',
            'transition-all duration-200',
          )}
          animate={{
            boxShadow: isHighlighted
              ? 'inset 0 4px 12px rgba(0,0,0,0.8), inset 0 -2px 4px rgba(255,255,255,0.02), 0 0 24px rgba(76, 175, 80, 0.4), inset 0 0 20px rgba(76, 175, 80, 0.1)'
              : 'inset 0 4px 12px rgba(0,0,0,0.8), inset 0 -2px 4px rgba(255,255,255,0.02)',
            borderColor: isHighlighted
              ? 'rgba(76, 175, 80, 0.5)'
              : 'rgba(0,0,0,0.6)',
          }}
          transition={{ duration: 0.2 }}
        >
          {/* Inner slot depth with beveled edges */}
          <div className="absolute inset-1 rounded-sm bg-gradient-to-b from-black/80 to-black/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]">
            {/* Guide rails */}
            <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#3a3a3a] rounded-r-sm shadow-[1px_0_2px_rgba(0,0,0,0.5)]" />
            <div className="absolute right-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#3a3a3a] rounded-l-sm shadow-[-1px_0_2px_rgba(0,0,0,0.5)]" />

            {/* Bottom connector socket */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-3 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-t-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              {/* Connector pins */}
              <div className="flex justify-center gap-[3px] pt-0.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-2 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] rounded-sm shadow-[inset_0_-1px_1px_rgba(0,0,0,0.4)]"
                  />
                ))}
              </div>
            </div>

            {/* Slot interior texture */}
            <div
              className="absolute inset-0 rounded-sm opacity-10 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                180deg,
                transparent,
                transparent 4px,
                rgba(0,0,0,0.2) 4px,
                rgba(0,0,0,0.2) 5px
              )`,
              }}
            />
          </div>

          {/* Cartridge placeholder */}
          {children}

          {/* Empty slot indicator */}
          {!children && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                className="text-[8px] font-mono text-console-label/20 uppercase tracking-wider"
                animate={
                  isHighlighted
                    ? { opacity: [0.2, 0.6, 0.2] }
                    : { opacity: 0.2 }
                }
                transition={
                  isHighlighted ? { duration: 1, repeat: Infinity } : {}
                }
              >
                {isHighlighted ? 'Drop Here' : 'Empty'}
              </motion.span>
            </div>
          )}

          {/* Highlight glow ring */}
          {isHighlighted && (
            <motion.div
              className="absolute -inset-1 rounded-md border-2 border-cartridge-glow/50 pointer-events-none"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
    )
  },
)

CartridgeSlot.displayName = 'CartridgeSlot'
