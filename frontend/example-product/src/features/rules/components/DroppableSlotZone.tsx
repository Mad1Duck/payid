import { motion, AnimatePresence } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { DraggableCartridge } from '@/components/v4/console/DraggableCartridge'
import type { CartridgeType } from '@/components/v4/console/RuleCartridge'

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
    image?: string
  }
}

interface DroppableSlotZoneProps {
  slot: SlotData
  highlighted: boolean
  showAdvanced: boolean
  onSlotClick?: (slotId: string) => void
  onCartridgeEject?: (slotId: string) => void
}

export function DroppableSlotZone({ slot, highlighted, showAdvanced, onSlotClick, onCartridgeEject }: DroppableSlotZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: slot.id })
  const active = isOver || highlighted

  return (
    <div
      style={{ width: '56px', minHeight: 36, position: 'relative' }}
      className="cursor-pointer"
      onClick={() => !slot.cartridge && onSlotClick?.(slot.id)}
    >
      {/* Invisible tall hit area: extends 80px upward into the console slot opening */}
      <div
        ref={setNodeRef}
        style={{
          position: 'absolute',
          top: '-80px',
          left: 0,
          right: 0,
          height: '116px',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />
      {/* Green glow ring when active drop target */}
      {active && !slot.cartridge && (
        <motion.div
          className="absolute -inset-1 rounded pointer-events-none z-10"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 0.65, repeat: Infinity }}
          style={{ border: '1.5px solid rgba(61,255,61,0.5)', borderRadius: 4 }}
        />
      )}

      <AnimatePresence>
        {slot.cartridge ? (
          <motion.div
            key={slot.cartridge.id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: -58, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute top-0 left-0 right-0"
            style={{ zIndex: 5 }}
          >
            <DraggableCartridge
              id={slot.cartridge.id}
              type={slot.cartridge.type}
              name={slot.cartridge.name}
              summary={slot.cartridge.summary}
              image={slot.cartridge.image}
              isActive
              isInSlot
              showAdvanced={showAdvanced}
              ruleHash={slot.cartridge.ruleHash}
              authorityAddress={slot.cartridge.authorityAddress}
              onEject={() => onCartridgeEject?.(slot.id)}
            />
          </motion.div>
        ) : (
          <motion.div key="empty" className="h-9 flex items-center justify-center">
            {active && (
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                className="text-[7px] font-mono font-bold tracking-widest"
                style={{ color: '#3dff3d', textShadow: '0 0 6px #3dff3d' }}
              >
                ↑ INSERT
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
