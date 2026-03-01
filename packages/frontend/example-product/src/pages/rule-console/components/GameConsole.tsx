import { motion } from 'framer-motion'
import { CartridgeSlot } from './CartridgeSlot'
import { DraggableCartridge } from './DraggableCartridge'
import type { CartridgeType } from './RuleCartridge'
import { cn } from '@/lib/utils'

export interface SlotData {
  id: string
  label: string
  cartridge?: {
    id: string
    type: CartridgeType
    name: string
    summary: string
    ruleHash?: string
    authorityAddress?: string
  }
}

interface GameConsoleProps {
  slots: Array<SlotData>
  highlightedSlot?: string | null
  showAdvanced?: boolean
  onSlotClick?: (slotId: string) => void
  onCartridgeEject?: (slotId: string) => void
}

export function GameConsole({
  slots,
  highlightedSlot,
  showAdvanced = false,
  onSlotClick,
  onCartridgeEject,
}: GameConsoleProps) {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Console Body */}
      <div
        className={cn(
          'relative rounded-2xl p-6 pb-8',
          'bg-linear-to-b from-console-body-top to-console-body-bottom',
          'shadow-[8px_12px_24px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.05)_inset]',
          'border border-white/5',
        )}
      >
        {/* Top vent holes */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-black/40 rounded-full" />
          ))}
        </div>

        {/* Console screen/display area */}
        <div
          className={cn(
            'relative mb-6 p-4 rounded-lg',
            'bg-linear-to-b from-console-screen-top to-console-screen-bottom',
            'shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.05)]',
            'border border-black/40',
          )}
        >
          {/* Screen bezel */}
          <div className="absolute inset-1 rounded border border-black/20" />

          {/* Title */}
          <div className="text-center mb-4">
            <h2 className="text-sm font-mono font-bold text-console-text uppercase tracking-[0.2em]">
              Rule Console
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
              <span className="text-[9px] font-mono text-console-label uppercase">
                System Ready
              </span>
            </div>
          </div>

          {/* Slot status display */}
          <div className="flex justify-center gap-3 text-[8px] font-mono text-console-label/70">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    slot.cartridge ? 'bg-green-500' : 'bg-gray-600',
                  )}
                />
                <span>{slot.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cartridge Slots Area */}
        <div
          className={cn(
            'relative p-4 rounded-lg',
            'bg-linear-to-b from-black/40 to-black/20',
            'shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]',
          )}
        >
          {/* Section label */}
          <div className="absolute -top-2 left-4 px-2 bg-console-body-bottom">
            <span className="text-[8px] font-mono uppercase tracking-widest text-console-label">
              Active Rule Slots
            </span>
          </div>

          {/* Slots grid */}
          <div className="flex justify-center gap-4 pt-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                onClick={() => !slot.cartridge && onSlotClick?.(slot.id)}
                className="cursor-pointer"
              >
                <CartridgeSlot
                  slotId={slot.id}
                  label={slot.label}
                  isHighlighted={highlightedSlot === slot.id}
                >
                  {slot.cartridge && (
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -30, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <DraggableCartridge
                        id={slot.cartridge.id}
                        type={slot.cartridge.type}
                        name={slot.cartridge.name}
                        summary={slot.cartridge.summary}
                        isActive
                        isInSlot
                        showAdvanced={showAdvanced}
                        ruleHash={slot.cartridge.ruleHash}
                        authorityAddress={slot.cartridge.authorityAddress}
                        onEject={() => onCartridgeEject?.(slot.id)}
                      />
                    </motion.div>
                  )}
                </CartridgeSlot>
              </div>
            ))}
          </div>

          {/* Advanced: Slot mapping */}
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-3 border-t border-white/5"
            >
              <div className="text-[8px] font-mono text-console-label/60 space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="uppercase tracking-wider">Slot Mapping</span>
                </div>
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex justify-between px-2 py-0.5 bg-black/20 rounded"
                  >
                    <span>{slot.label}</span>
                    <span className="text-console-label/40">
                      {slot.cartridge ? `→ ${slot.cartridge.id}` : '→ NULL'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Console branding */}
        <div className="mt-4 text-center">
          <span className="text-[10px] font-mono font-bold text-console-label/30 uppercase tracking-[0.3em]">
            PayID™ Console
          </span>
        </div>

        {/* Side screws */}
        <div className="absolute top-6 left-3 w-2 h-2 rounded-full bg-console-screw shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0.5 bg-black/20 rounded-full" />
        </div>
        <div className="absolute top-6 right-3 w-2 h-2 rounded-full bg-console-screw shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0.5 bg-black/20 rounded-full" />
        </div>
        <div className="absolute bottom-6 left-3 w-2 h-2 rounded-full bg-console-screw shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0.5 bg-black/20 rounded-full" />
        </div>
        <div className="absolute bottom-6 right-3 w-2 h-2 rounded-full bg-console-screw shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0.5 bg-black/20 rounded-full" />
        </div>

        {/* Plastic texture overlay */}
        <div
          className="absolute inset-0 rounded-2xl opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Console shadow on surface */}
      <div className="absolute -bottom-2 left-4 right-4 h-4 bg-black/20 blur-xl rounded-full" />
    </div>
  )
}
