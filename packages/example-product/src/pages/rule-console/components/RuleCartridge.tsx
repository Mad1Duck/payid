import { motion } from 'framer-motion'
import { Clock, Coins, DollarSign, Shield, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CartridgeType =
  | 'minAmount'
  | 'maxAmount'
  | 'allowedToken'
  | 'allowedSender'
  | 'expiration'

interface RuleCartridgeProps {
  id: string
  type: CartridgeType
  name: string
  summary: string
  isActive?: boolean
  isInSlot?: boolean
  isDragging?: boolean
  showAdvanced?: boolean
  ruleHash?: string
  authorityAddress?: string
}

const cartridgeConfig: Record<
  CartridgeType,
  {
    icon: LucideIcon
    shellColor: string
    labelColor: string
    accentColor: string
  }
> = {
  minAmount: {
    icon: DollarSign,
    shellColor: 'from-[#2d4a3e] via-[#1e3a2f] to-[#152a22]',
    labelColor: 'from-[#4ade80] to-[#22c55e]',
    accentColor: '#4ade80',
  },
  maxAmount: {
    icon: DollarSign,
    shellColor: 'from-[#4a3d2d] via-[#3a2f1e] to-[#2a2215]',
    labelColor: 'from-[#fbbf24] to-[#f59e0b]',
    accentColor: '#fbbf24',
  },
  allowedToken: {
    icon: Coins,
    shellColor: 'from-[#2d3a4a] via-[#1e2f3a] to-[#15222a]',
    labelColor: 'from-[#60a5fa] to-[#3b82f6]',
    accentColor: '#60a5fa',
  },
  allowedSender: {
    icon: User,
    shellColor: 'from-[#3d2d4a] via-[#2f1e3a] to-[#22152a]',
    labelColor: 'from-[#c084fc] to-[#a855f7]',
    accentColor: '#c084fc',
  },
  expiration: {
    icon: Clock,
    shellColor: 'from-[#4a2d3d] via-[#3a1e2f] to-[#2a1522]',
    labelColor: 'from-[#fb7185] to-[#f43f5e]',
    accentColor: '#fb7185',
  },
}

export function RuleCartridge({
  id,
  type,
  name,
  summary,
  isActive = false,
  isInSlot = false,
  isDragging = false,
  showAdvanced = false,
  ruleHash = '0x7f3a...8b2c',
}: RuleCartridgeProps) {
  const config = cartridgeConfig[type]
  const Icon = config.icon

  return (
    <motion.div
      className={cn(
        'relative select-none',
        isInSlot ? 'w-15' : 'w-17',
        isDragging && 'z-50',
      )}
      animate={{
        scale: isDragging ? 1.15 : 1,
        rotate: isDragging ? -3 : 0,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* GBA Cartridge Shell */}
      <div
        className={cn(
          'relative rounded-t-lg rounded-b-[6px]',
          isInSlot ? 'w-15 h-18' : 'w-17 h-20.5',
          'bg-linear-to-b',
          config.shellColor,
          'shadow-[4px_6px_12px_rgba(0,0,0,0.5),-2px_-2px_4px_rgba(255,255,255,0.03)_inset,2px_2px_4px_rgba(0,0,0,0.3)_inset]',
          'border-[1.5px] border-black/50',
          isActive &&
            'shadow-[4px_6px_12px_rgba(0,0,0,0.5),0_0_20px_rgba(76,175,80,0.3)]',
          'transition-shadow duration-300',
        )}
      >
        {/* Top notch / grip area */}
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-linear-to-b from-black/60 to-black/40 rounded-b-sm border-x border-b border-black/30">
          {/* Grip ridges */}
          <div className="flex justify-center gap-0.5 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-0.5 h-1.5 bg-black/40 rounded-full" />
            ))}
          </div>
        </div>

        {/* Main label sticker */}
        <div
          className={cn(
            'absolute left-1.5 right-1.5 rounded-[3px]',
            isInSlot ? 'top-4 h-9.5' : 'top-5 h-11',
            'bg-linear-to-b',
            config.labelColor,
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)]',
            'border border-white/20',
            'flex flex-col items-center justify-center overflow-hidden',
          )}
        >
          {/* Label shine effect */}
          <div className="absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-transparent" />

          {/* Icon */}
          <div
            className={cn(
              'relative rounded-full p-1 mb-0.5',
              'bg-black/20 backdrop-blur-sm',
            )}
          >
            <Icon
              className={cn(
                'text-white drop-shadow-sm',
                isInSlot ? 'w-3 h-3' : 'w-3.5 h-3.5',
              )}
              strokeWidth={2.5}
            />
          </div>

          {/* Name */}
          <span
            className={cn(
              'relative font-bold text-white uppercase tracking-tight text-center leading-none drop-shadow-sm',
              isInSlot ? 'text-[7px]' : 'text-[8px]',
            )}
          >
            {name}
          </span>

          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.1) 2px,
                rgba(0,0,0,0.1) 4px
              )`,
            }}
          />
        </div>

        {/* Bottom connector pins area */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-4 rounded-b-[5px]',
            'bg-linear-to-t from-black/60 to-transparent',
          )}
        >
          {/* Connector edge */}
          <div className="absolute bottom-0 left-2 right-2 h-0.75 bg-linear-to-r from-[#4a4a4a] via-[#5a5a5a] to-[#4a4a4a] rounded-t-sm">
            {/* Gold pins */}
            <div className="flex justify-center gap-0.75 -mt-px">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-linear-to-b from-[#d4a853] to-[#a67c3a] rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Rating badge (like GBA games) */}
        <div
          className={cn(
            'absolute flex items-center gap-0.5',
            isInSlot ? 'bottom-4 left-1.5' : 'bottom-5 left-2',
          )}
        >
          <Shield className="w-2 h-2 text-white/40" />
          <span className="text-[5px] font-bold text-white/40 uppercase">
            Rule
          </span>
        </div>

        {/* Active glow LED */}
        {isActive && (
          <motion.div
            className={cn(
              'absolute rounded-full',
              isInSlot
                ? 'top-13 right-2 w-1.5 h-1.5'
                : 'top-15 right-2 w-2 h-2',
            )}
            style={{ backgroundColor: config.accentColor }}
            animate={{
              boxShadow: [
                `0 0 4px ${config.accentColor}`,
                `0 0 10px ${config.accentColor}`,
                `0 0 4px ${config.accentColor}`,
              ],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Plastic texture overlay */}
        <div
          className="absolute inset-0 rounded-t-lg rounded-b-[6px] opacity-[0.04] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent rounded-t" />
      </div>

      {/* Summary (only in tray) */}
      {!isInSlot && (
        <div className="mt-1.5 text-center">
          <span className="text-[8px] text-console-label/60 font-mono">
            {summary}
          </span>
        </div>
      )}

      {/* Advanced view info */}
      {showAdvanced && isInSlot && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-20 bg-black/90 rounded px-1.5 py-1 text-[6px] font-mono text-console-label/80 space-y-0.5 border border-amber-900/30"
        >
          <div className="truncate text-amber-400/80">ID: {id.slice(-6)}</div>
          <div className="truncate text-amber-400/60">Hash: {ruleHash}</div>
        </motion.div>
      )}
    </motion.div>
  )
}
