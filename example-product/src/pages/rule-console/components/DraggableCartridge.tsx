import { useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { createPortal } from 'react-dom'
import { RuleCartridge } from './RuleCartridge'
import type { PanInfo } from 'framer-motion'
import type { CartridgeType } from './RuleCartridge'
import { cn } from '@/lib/utils'

interface DraggableCartridgeProps {
  id: string
  type: CartridgeType
  name: string
  summary: string
  isInSlot?: boolean
  isActive?: boolean
  showAdvanced?: boolean
  ruleHash?: string
  authorityAddress?: string
  onDragStart?: () => void
  onDragEnd?: (info: PanInfo) => void
  onDrop?: (slotId: string) => void
  onEject?: () => void
  slotPositions?: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
  }>
}

export function DraggableCartridge({
  id,
  type,
  name,
  summary,
  isInSlot = false,
  isActive = false,
  showAdvanced = false,
  ruleHash,
  authorityAddress,
  onDragStart,
  onDragEnd,
  onDrop,
  onEject,
  slotPositions = [],
}: DraggableCartridgeProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [nearSlot, setNearSlot] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 })

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent) => {
    const target = event.target as HTMLElement
    const rect = target.closest('[data-cartridge]')?.getBoundingClientRect()
    if (rect) {
      setInitialPosition({ x: rect.left, y: rect.top })
    }

    setIsDragging(true)
    onDragStart?.()
  }

  const handleDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // Update drag position for portal
    setDragPosition({ x: info.offset.x, y: info.offset.y })

    if (isInSlot) {
      return
    }

    // Check proximity to slots
    const cartridgeCenter = {
      x: info.point.x,
      y: info.point.y,
    }

    let foundSlot: string | null = null
    const snapThreshold = 80

    for (const slot of slotPositions) {
      const slotCenter = {
        x: slot.x + slot.width / 2,
        y: slot.y + slot.height / 2,
      }

      const distance = Math.sqrt(
        Math.pow(cartridgeCenter.x - slotCenter.x, 2) +
          Math.pow(cartridgeCenter.y - slotCenter.y, 2),
      )

      if (distance < snapThreshold) {
        foundSlot = slot.id
        break
      }
    }

    setNearSlot(foundSlot)
  }

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false)
    setDragPosition({ x: 0, y: 0 })

    if (isInSlot) {
      if (info.offset.y < -60) {
        onEject?.()
      }
    } else if (nearSlot) {
      onDrop?.(nearSlot)
    }

    setNearSlot(null)
    onDragEnd?.(info)
  }

  // Dragging cartridge rendered in portal for visibility
  const draggingCartridge =
    isDragging &&
    createPortal(
      <motion.div
        initial={{
          x: initialPosition.x + dragPosition.x,
          y: initialPosition.y + dragPosition.y,
          scale: 1,
          rotate: 0,
        }}
        animate={{
          x: initialPosition.x + dragPosition.x,
          y: initialPosition.y + dragPosition.y,
          scale: 1.15,
          rotate: dragPosition.x / 15,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed top-0 left-0 z-9999 pointer-events-none"
        style={{ willChange: 'transform' }}
      >
        <RuleCartridge
          id={id}
          type={type}
          name={name}
          summary={summary}
          isActive={isActive}
          isInSlot={isInSlot}
          isDragging={true}
          showAdvanced={false}
          ruleHash={ruleHash}
          authorityAddress={authorityAddress}
        />

        {/* Glow outline */}
        <motion.div
          className="absolute -inset-2 rounded-[10px] pointer-events-none"
          animate={{
            opacity: [0.5, 1, 0.5],
            boxShadow: [
              '0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(100,200,255,0.2)',
              '0 0 25px rgba(255,255,255,0.5), 0 0 50px rgba(100,200,255,0.3)',
              '0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(100,200,255,0.2)',
            ],
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: '10px',
          }}
        />

        {/* Drop shadow */}
        <div
          className="absolute inset-0 -z-10 rounded-lg blur-xl opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
            transform: 'translateY(20px) scale(1.1)',
          }}
        />

        {/* Snap indicator */}
        {nearSlot && !isInSlot && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-cartridge-glow/40 rounded-full border-2 border-cartridge-glow backdrop-blur-sm whitespace-nowrap"
          >
            <span className="text-[10px] font-mono text-white uppercase font-bold tracking-wide">
              ✓ Release to Insert
            </span>
          </motion.div>
        )}

        {/* Eject indicator */}
        {isInSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <motion.div
              className="px-3 py-1.5 bg-rose-500/40 rounded-full border-2 border-rose-400 backdrop-blur-sm"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <span className="text-[10px] font-mono text-white uppercase font-bold tracking-wide">
                ↑ Pull to Eject
              </span>
            </motion.div>
          </motion.div>
        )}
      </motion.div>,
      document.body,
    )

  return (
    <div className="relative" data-cartridge>
      <motion.div
        drag
        dragSnapToOrigin={isInSlot ? true : !nearSlot}
        dragElastic={0.15}
        dragTransition={{
          bounceStiffness: 400,
          bounceDamping: 25,
        }}
        style={{ x, y }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={cn(
          'cursor-grab active:cursor-grabbing touch-none relative',
          isDragging && 'opacity-30',
        )}
      >
        <RuleCartridge
          id={id}
          type={type}
          name={name}
          summary={summary}
          isActive={isActive}
          isInSlot={isInSlot}
          isDragging={false}
          showAdvanced={showAdvanced}
          ruleHash={ruleHash}
          authorityAddress={authorityAddress}
        />
      </motion.div>

      {draggingCartridge}
    </div>
  )
}
