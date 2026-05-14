import { Cartridge } from './Cartridge'
import type { CartridgeData } from './Cartridge'

export type { CartridgeData } from './Cartridge'

interface CartridgeGridProps {
  cartridges: CartridgeData[]
  onCartridgeClick?: (cartridge: CartridgeData) => void
  onCartridgeDragStart?: (id: string) => void
  className?: string
}

export function CartridgeGrid({
  cartridges,
  onCartridgeClick,
  onCartridgeDragStart,
  className = '',
}: CartridgeGridProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${className}`}>
      {cartridges.map((cartridge) => (
        <Cartridge
          key={cartridge.id}
          cartridge={cartridge}
          onClick={() => onCartridgeClick?.(cartridge)}
          onDragStart={onCartridgeDragStart}
        />
      ))}
    </div>
  )
}
