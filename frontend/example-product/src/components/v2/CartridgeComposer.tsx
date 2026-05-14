import { useState } from 'react'
import { CartridgeGrid } from './CartridgeGrid'
import type { CartridgeData } from './CartridgeGrid'
import { RuleSlot, type SlotCartridge } from './RuleSlot'

interface CartridgeComposerProps {
  availableCartridges: CartridgeData[]
  onEvaluate?: (activeCartridges: CartridgeData[]) => void
  className?: string
}

export function CartridgeComposer({ availableCartridges, onEvaluate, className = '' }: CartridgeComposerProps) {
  const [activeCartridges, setActiveCartridges] = useState<SlotCartridge[]>([])

  const handleCartridgeClick = (cartridge: CartridgeData) => {
    // Check if cartridge is already in slot
    if (activeCartridges.some((c) => c.id === cartridge.id)) {
      return
    }

    // Add to slot
    setActiveCartridges((prev) => [
      ...prev,
      { ...cartridge, index: prev.length },
    ])
  }

  const handleRemove = (index: number) => {
    setActiveCartridges((prev) => {
      const newCartridges = prev.filter((_, i) => i !== index)
      return newCartridges.map((c, i) => ({ ...c, index: i }))
    })
  }

  const handleDrop = (cartridgeId: string) => {
    const cartridge = availableCartridges.find((c) => c.id === cartridgeId)
    if (!cartridge) return

    handleCartridgeClick(cartridge)
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setActiveCartridges((prev) => {
      const newCartridges = [...prev]
      const [removed] = newCartridges.splice(fromIndex, 1)
      newCartridges.splice(toIndex, 0, removed)
      return newCartridges.map((c, i) => ({ ...c, index: i }))
    })
  }

  const handleEvaluate = () => {
    onEvaluate?.(activeCartridges)
  }

  // Get cartridges not in slot
  const trayCartridges = availableCartridges.filter(
    (c) => !activeCartridges.some((ac) => ac.id === c.id)
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Available Cartridges */}
      <div>
        <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Available Rules
        </div>
        <CartridgeGrid
          cartridges={trayCartridges}
          onCartridgeClick={handleCartridgeClick}
        />
      </div>

      {/* Active Slot */}
      <div>
        <RuleSlot
          cartridges={activeCartridges}
          onRemove={handleRemove}
          onDrop={handleDrop}
          onReorder={handleReorder}
        />
      </div>

      {/* Evaluate Button */}
      {activeCartridges.length > 0 && onEvaluate && (
        <button
          onClick={handleEvaluate}
          className="btn btn-primary w-full"
          style={{ fontSize: '14px', padding: '12px 24px' }}
        >
          Evaluate Rules ({activeCartridges.length})
        </button>
      )}
    </div>
  )
}
