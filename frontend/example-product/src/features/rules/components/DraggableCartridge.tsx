import { useDraggable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import { RuleCartridge } from './RuleCartridge'
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
  onEject?: () => void
  onTap?: () => void
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
  onEject,
  onTap,
}: DraggableCartridgeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { isInSlot },
  })

  return (
    <div
      ref={setNodeRef}
      className="relative select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.3 : 1, transition: 'opacity 0.1s' }}
      {...listeners}
      {...attributes}
      onClick={() => { if (!isDragging) onTap?.() }}
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

      {/* Eject button — only for in-slot cartridges */}
      {isInSlot && onEject && (
        <button
          className="absolute -top-1.5 -right-1.5 z-50 w-5 h-5 rounded-full bg-rose-600 border border-rose-400/50 flex items-center justify-center shadow-lg"
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEject() }}
        >
          <X size={9} color="#fff" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
