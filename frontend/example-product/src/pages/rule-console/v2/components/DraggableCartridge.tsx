import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RuleCartridge } from './RuleCartridge'
import type { PanInfo } from 'framer-motion'
import type { CartridgeType } from './RuleCartridge'

interface DraggableCartridgeProps {
  id: string
  type: CartridgeType
  name: string
  summary: string
  image?: string
  isInSlot?: boolean
  isActive?: boolean
  showAdvanced?: boolean
  ruleHash?: string
  authorityAddress?: string
  onDrop?: (slotId: string) => void
  onEject?: () => void
  onTap?: () => void
  onHoverSlot?: (slotId: string | null) => void
}

/** Find nearest slot to the given point */
function findNearestSlot(point: { x: number; y: number }): string | null {
  const slots = document.querySelectorAll('[data-slot-id]')
  let bestId: string | null = null
  let bestDist = Infinity

  for (const slot of slots) {
    const rect = slot.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      bestId = slot.getAttribute('data-slot-id')
    }
  }

  // No threshold - always snap to nearest slot
  return bestId
}

export function DraggableCartridge({
  id,
  type,
  name,
  summary,
  image,
  isInSlot = false,
  isActive = false,
  showAdvanced = false,
  ruleHash,
  authorityAddress,
  onDrop,
  onEject,
  onTap,
  onHoverSlot,
}: DraggableCartridgeProps) {
  const motionRef = useRef<HTMLDivElement>(null)
  const tapLock = useRef(false)
  const [nearSlot, setNearSlot] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleTap = useCallback(() => {
    if (tapLock.current) return
    tapLock.current = true
    onTap?.()
    setTimeout(() => { tapLock.current = false }, 300)
  }, [onTap])

  const handleDragStart = () => setIsDragging(true)

  const handleDrag = (_event: unknown, info: PanInfo) => {
    if (isInSlot) return
    const slotId = findNearestSlot(info.point)
    setNearSlot(slotId)
    onHoverSlot?.(slotId)
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    setNearSlot(null)
    onHoverSlot?.(null)

    if (isInSlot) {
      // Eject by pulling DOWN (cartridge hangs below console)
      if (info.offset.y > 30) {
        onEject?.()
      }
      return
    }

    // Get pointer coordinates from native event
    let clientX: number
    let clientY: number
    if ('changedTouches' in event && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX
      clientY = event.changedTouches[0].clientY
    } else {
      clientX = (event as MouseEvent).clientX
      clientY = (event as MouseEvent).clientY
    }

    // Hide dragged element so elementFromPoint can see the slot underneath
    const motionEl = motionRef.current
    if (motionEl) {
      motionEl.style.visibility = 'hidden'
    }

    const target = document.elementFromPoint(clientX, clientY)

    if (motionEl) {
      motionEl.style.visibility = ''
    }

    if (target) {
      const slot = target.closest('[data-slot-id]')
      if (slot) {
        const slotId = slot.getAttribute('data-slot-id')
        if (slotId) {
          onDrop?.(slotId)
          return
        }
      }
    }

    // Fallback: nearest slot by distance
    const slotId = findNearestSlot({ x: clientX, y: clientY })
    if (slotId) {
      onDrop?.(slotId)
    }
  }

  return (
    <div
      className="relative"
      data-cartridge={id}
      onClick={() => {
        // Fallback click handler — onTap can be unreliable with drag
        if (!isInSlot && !isDragging) handleTap()
      }}
    >
      {/* Drop hint during drag */}
      {isDragging && nearSlot && !isInSlot && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
          <div className="px-2 py-0.5 bg-emerald-500/40 rounded-full border border-emerald-400/60 backdrop-blur-sm">
            <span className="text-[8px] font-mono text-emerald-200 uppercase font-bold tracking-wide">
              Release to Insert
            </span>
          </div>
        </div>
      )}

      {/* Eject hint during drag */}
      {isDragging && isInSlot && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
          <div className="px-2 py-0.5 bg-rose-500/40 rounded-full border border-rose-400/60 backdrop-blur-sm">
            <span className="text-[8px] font-mono text-rose-200 uppercase font-bold tracking-wide">
              Pull Down to Eject
            </span>
          </div>
        </div>
      )}

      <motion.div
        ref={motionRef}
        drag
        dragSnapToOrigin
        dragElastic={0.1}
        whileDrag={{
          scale: 1.06,
          zIndex: 9999,
          boxShadow: isInSlot
            ? '0 0 16px rgba(244,63,94,0.25)'
            : '0 0 16px rgba(16,185,129,0.25)',
        }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <RuleCartridge
          id={id}
          type={type}
          name={name}
          summary={summary}
          image={image}
          isActive={isActive}
          isInSlot={isInSlot}
          showAdvanced={showAdvanced}
          ruleHash={ruleHash}
          authorityAddress={authorityAddress}
        />
      </motion.div>
    </div>
  )
}
