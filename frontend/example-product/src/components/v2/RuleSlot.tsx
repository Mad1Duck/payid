import { useState } from 'react'
import type { CartridgeData } from './Cartridge'
import { X, Zap, Ban, Check, Key, BarChart3, Link2 } from 'lucide-react'

export interface SlotCartridge extends CartridgeData {
  index: number
}

interface RuleSlotProps {
  cartridges: SlotCartridge[]
  onRemove?: (index: number) => void
  onDrop?: (cartridgeId: string) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  className?: string
}

const CARTRIDGE_ICONS: Record<CartridgeData['type'], typeof Zap> = {
  velocity: Zap,
  blocklist: Ban,
  allowlist: Check,
  kyc: Key,
  volume: BarChart3,
  chain: Link2,
}

export function RuleSlot({ cartridges, onRemove, onDrop, onReorder, className = '' }: RuleSlotProps) {
  const [isOver, setIsOver] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const cartridgeId = e.dataTransfer.getData('cartridgeId')
    onDrop?.(cartridgeId)
  }

  const handleCartridgeDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleCartridgeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder?.(draggedIndex, index)
    }
  }

  const handleCartridgeDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-4 rounded-lg transition-all duration-200 ${className}`}
      style={{
        background: cartridges.length === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(82, 152, 255, 0.05)',
        border: cartridges.length === 0 ? '2px dashed rgba(82, 152, 255, 0.2)' : '1px solid rgba(82, 152, 255, 0.3)',
        minHeight: '120px',
      }}
    >
      {/* Label */}
      <div className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Active Slot
      </div>

      {/* Empty State */}
      {cartridges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-3xl mb-2">🎮</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Drop rule cartridges here to activate
          </div>
          {isOver && (
            <div className="text-xs mt-2 animate-pulse" style={{ color: 'var(--accent-blue)' }}>
              Release to insert
            </div>
          )}
        </div>
      )}

      {/* Cartridge Chips */}
      {cartridges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cartridges.map((cartridge, index) => {
            const Icon = CARTRIDGE_ICONS[cartridge.type]
            return (
              <div
                key={`${cartridge.id}-${index}`}
                draggable
                onDragStart={() => handleCartridgeDragStart(index)}
                onDragOver={(e) => handleCartridgeDragOver(e, index)}
                onDragEnd={handleCartridgeDragEnd}
                className="flex items-center gap-2 px-3 py-2 rounded-lg animate-slide-up cursor-grab active:cursor-grabbing"
                style={{
                  background: 'rgba(26, 26, 46, 0.8)',
                  border: '1px solid rgba(82, 152, 255, 0.3)',
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <Icon style={{ width: 14, height: 14, color: '#5298FF' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {cartridge.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove?.(index)
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
