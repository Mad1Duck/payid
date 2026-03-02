import { useDroppable } from '@dnd-kit/core'
import type { CartridgeState } from './DraggableCartridge'
import { cn } from '@/lib/utils'

interface DroppableSlotProps {
  slotNumber: number
  side: 'left' | 'right'
  isOccupied: boolean
  isActive: boolean
  isHovering?: boolean
  cartridgeState?: CartridgeState
  children?: React.ReactNode
}

const DroppableSlot = ({
  slotNumber,
  side,
  isOccupied,
  isActive,
  cartridgeState,
  children,
}: DroppableSlotProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slotNumber}`,
  })

  const showValidDropZone = isOver && !isOccupied
  const showInvalidDropZone = isOver && isOccupied

  return (
    <div className="relative">
      {/* Slot Label */}
      <span
        className={cn(
          'slot-label mb-1',
          side === 'left' ? 'right-0 text-right' : 'left-0 text-left',
        )}
        style={{
          position: 'absolute',
          top: '-14px',
          [side === 'left' ? 'right' : 'left']: '0',
        }}
      >
        SLOT {slotNumber}
      </span>

      {/* Slot Container - SD card slot style */}
      <div
        ref={setNodeRef}
        className={cn(
          'relative h-17.5 w-13 flex items-end justify-center overflow-hidden transition-all duration-200',
          'bg-linear-to-b from-zinc-900 via-zinc-850 to-zinc-950',
          'border-2 rounded-sm',
          showValidDropZone &&
            'border-screen-text shadow-[0_0_15px_hsl(140_60%_50%/0.4)]',
          showInvalidDropZone &&
            'border-destructive shadow-[0_0_15px_hsl(0_84%_60%/0.4)]',
          !isOver && isOccupied && isActive && 'border-cartridge-glow/50',
          !isOver && isOccupied && !isActive && 'border-zinc-700',
          !isOver && !isOccupied && 'border-zinc-800',
        )}
      >
        {/* Slot Rails - internal guide rails */}
        <div className="absolute top-1 left-1 bottom-1 w-0.75 bg-linear-to-b from-zinc-800 via-zinc-700 to-zinc-800 rounded-sm" />
        <div className="absolute top-1 right-1 bottom-1 w-0.75 bg-linear-to-b from-zinc-800 via-zinc-700 to-zinc-800 rounded-sm" />

        {/* Spring mechanism indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-zinc-700 rounded-b-sm" />

        {/* Inner depth shadow */}
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/40 pointer-events-none" />

        {/* Cartridge container with proper positioning based on state */}
        {children && (
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 transition-all duration-300',
              cartridgeState === 'inserted' && 'bottom-1',
              cartridgeState === 'half-inserted' && 'bottom-8',
              cartridgeState === 'ejecting' && 'bottom-6',
            )}
          >
            {children}

            {/* Contact shadow when inserted */}
            {(cartridgeState === 'inserted' ||
              cartridgeState === 'half-inserted') && (
              <div className="absolute -bottom-1 left-0 right-0 h-2 bg-linear-to-t from-black/80 to-transparent blur-sm" />
            )}
          </div>
        )}

        {/* Drop zone indicator */}
        {showValidDropZone && (
          <div className="absolute inset-2 border-2 border-dashed border-screen-text/50 rounded animate-pulse" />
        )}

        {/* Empty slot indicator */}
        {!isOccupied && !isOver && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="w-8 h-1 bg-zinc-700 rounded-full" />
            <div className="w-6 h-0.5 bg-zinc-700 rounded-full mt-1 mx-auto" />
          </div>
        )}
      </div>
    </div>
  )
}

export default DroppableSlot
