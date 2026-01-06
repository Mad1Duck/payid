import { DraggableCartridge } from './DraggableCartridge'
import type { CartridgeType } from './RuleCartridge'
import { cn } from '@/lib/utils'

export interface CartridgeData {
  id: string
  type: CartridgeType
  name: string
  summary: string
  ruleHash?: string
  authorityAddress?: string
}

interface CartridgeTrayProps {
  cartridges: Array<CartridgeData>
  showAdvanced?: boolean
  slotPositions?: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
  }>
  onCartridgeDrop?: (cartridgeId: string, slotId: string) => void
  onCartridgeClick?: (cartridgeId: string) => void
}

export function CartridgeTray({
  cartridges,
  showAdvanced = false,
  slotPositions = [],
  onCartridgeDrop,
  onCartridgeClick,
}: CartridgeTrayProps) {
  return (
    <div className="w-full">
      {/* Tray Label */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-console-label">
          Rule Cartridges
        </span>
        <span className="text-[9px] font-mono text-console-label/50">
          {cartridges.length} available
        </span>
      </div>

      {/* Tray Container - looks like a cartridge organizer box */}
      <div
        className={cn(
          'relative w-full rounded-xl',
          'bg-linear-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#1a1a1a]',
          'shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.02)_inset]',
          'border border-black/40',
          'overflow-visible p-4',
        )}
      >
        {/* Inner felt/foam lining */}
        <div
          className={cn(
            'relative rounded-lg p-3',
            'bg-linear-to-b from-[#1a1a1a] to-[#0f0f0f]',
            'shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]',
          )}
        >
          {/* Foam texture */}
          <div
            className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Cartridge slots */}
          <div className="flex items-end justify-center gap-5 min-h-25 overflow-x-auto py-2">
            {cartridges.map((cartridge) => (
              <div
                key={cartridge.id}
                className="shrink-0"
                onClick={() => onCartridgeClick?.(cartridge.id)}
              >
                <DraggableCartridge
                  id={cartridge.id}
                  type={cartridge.type}
                  name={cartridge.name}
                  summary={cartridge.summary}
                  showAdvanced={showAdvanced}
                  ruleHash={cartridge.ruleHash}
                  authorityAddress={cartridge.authorityAddress}
                  slotPositions={slotPositions}
                  onDrop={(slotId) => onCartridgeDrop?.(cartridge.id, slotId)}
                />
              </div>
            ))}

            {cartridges.length === 0 && (
              <div className="flex items-center justify-center h-25">
                <span className="text-[11px] font-mono text-console-label/30 uppercase tracking-wider">
                  All cartridges inserted
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tray hinge/handle */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-linear-to-b from-[#4a4a4a] to-[#3a3a3a] rounded-b-lg shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-black/30 rounded-full" />
        </div>

        {/* Corner screws */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-linear-to-br from-[#5a5a5a] to-[#3a3a3a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0.5 bg-[#2a2a2a] rounded-full">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-black/40 -translate-y-1/2" />
          </div>
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-linear-to-br from-[#5a5a5a] to-[#3a3a3a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0.5 bg-[#2a2a2a] rounded-full">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-black/40 -translate-y-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}
