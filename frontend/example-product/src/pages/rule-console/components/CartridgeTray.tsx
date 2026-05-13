import { DraggableCartridge } from './DraggableCartridge'
import type { CartridgeType } from './RuleCartridge'

export interface CartridgeData {
  id: string
  type: CartridgeType
  name: string
  summary: string
  image?: string
  ruleHash?: string
  authorityAddress?: string
  active?: boolean
}

interface CartridgeTrayProps {
  cartridges: Array<CartridgeData>
  showAdvanced?: boolean
  onCartridgeDrop?: (cartridgeId: string, slotId: string) => void
  onCartridgeClick?: (cartridgeId: string) => void
  onHoverSlot?: (slotId: string | null) => void
}

export function CartridgeTray({
  cartridges,
  showAdvanced = false,
  onCartridgeDrop,
  onCartridgeClick,
  onHoverSlot,
}: CartridgeTrayProps) {
  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(100,116,139,0.7)' }}>
          Cartridge Tray
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(100,116,139,0.4)' }}>
          {cartridges.length} loaded
        </span>
      </div>

      {/* Tray shelf */}
      <div
        style={{
          width: '100%',
          background: 'linear-gradient(180deg, #d8dce0 0%, #c8ccd0 100%)',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.15)',
          padding: '12px 16px 8px',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Shelf surface line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 12,
            right: 12,
            height: 3,
            background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06) 20%, rgba(0,0,0,0.06) 80%, transparent)',
            borderRadius: '0 0 8px 8px',
          }}
        />

        {/* Cartridges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 16,
            minHeight: 110,
            paddingBottom: 4,
          }}
        >
          {cartridges.map((cartridge) => (
            <div key={cartridge.id} style={{ flexShrink: 0 }}>
              <DraggableCartridge
                id={cartridge.id}
                type={cartridge.type}
                name={cartridge.name}
                summary={cartridge.summary}
                image={cartridge.image}
                isActive={cartridge.active}
                showAdvanced={showAdvanced}
                ruleHash={cartridge.ruleHash}
                authorityAddress={cartridge.authorityAddress}
                onDrop={(slotId) => onCartridgeDrop?.(cartridge.id, slotId)}
                onTap={() => onCartridgeClick?.(cartridge.id)}
                onHoverSlot={onHoverSlot}
              />
            </div>
          ))}

          {cartridges.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(90,93,96,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                All rules in slots
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
