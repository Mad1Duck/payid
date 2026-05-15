import { useDroppable } from '@dnd-kit/core'
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
  onCartridgeClick?: (cartridgeId: string) => void
}

export function CartridgeTray({
  cartridges,
  showAdvanced = false,
  onCartridgeClick,
}: CartridgeTrayProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'tray' })

  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span style={{
          fontSize: 9,
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: isOver ? 'rgba(244,63,94,0.85)' : 'rgba(100,116,139,0.7)',
          transition: 'color 0.15s',
        }}>
          {isOver ? '↓ Drop to Eject' : 'Cartridge Tray'}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(100,116,139,0.4)' }}>
          {cartridges.length} loaded
        </span>
      </div>

      {/* Tray shelf — doubles as eject drop zone */}
      <div
        ref={setNodeRef}
        style={{
          width: '100%',
          background: isOver
            ? 'linear-gradient(180deg, #ffffff 0%, #86efac 100%)'
            : 'linear-gradient(180deg, #d8dce0 0%, #c8ccd0 100%)',
          borderRadius: 12,
          border: isOver ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: isOver
            ? 'inset 0 1px 3px rgba(255,255,255,0.04), 0 4px 20px rgba(244,63,94,0.25), 0 0 0 2px rgba(244,63,94,0.12)'
            : 'inset 0 1px 3px rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.15)',
          padding: '12px 16px 8px',
          overflow: 'visible',
          position: 'relative',
          transition: 'background 0.15s, border 0.15s, box-shadow 0.15s',
        }}
      >
        {/* Dashed eject border hint */}
        {isOver && (
          <div style={{
            position: 'absolute',
            inset: 4,
            borderRadius: 9,
            border: '1.5px dashed rgba(244,63,94,0.45)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Shelf surface line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 12,
          right: 12,
          height: 3,
          background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06) 20%, rgba(0,0,0,0.06) 80%, transparent)',
          borderRadius: '0 0 8px 8px',
        }} />

        {/* Cartridges */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 16,
          minHeight: 110,
          paddingBottom: 4,
        }}>
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
                onTap={() => onCartridgeClick?.(cartridge.id)}
              />
            </div>
          ))}

          {cartridges.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110 }}>
              <span style={{
                fontSize: 10,
                fontFamily: 'monospace',
                color: isOver ? 'rgba(244,63,94,0.55)' : 'rgba(90,93,96,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                transition: 'color 0.15s',
              }}>
                {isOver ? '↓ Release to Eject' : 'All rules in slots'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
