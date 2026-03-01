import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

export type CartridgeState =
  | 'tray'
  | 'dragging'
  | 'half-inserted'
  | 'inserted'
  | 'ejecting'

interface DraggableCartridgeProps {
  id: string
  name: string
  state: CartridgeState
  isActive?: boolean
  color?: string
  isDragging?: boolean
}

const DraggableCartridge = ({
  id,
  name,
  state,
  isActive = false,
  color = 'emerald',
  isDragging = false,
}: DraggableCartridgeProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    // Remove the disabled constraint - allow dragging even when active
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 100,
      }
    : undefined

  const isBeingDragged = isDragging || !!transform

  // SD Card style color accents
  const accentColors: Record<string, string> = {
    emerald: 'bg-gradient-to-b from-emerald-500 to-emerald-600',
    amber: 'bg-gradient-to-b from-amber-500 to-amber-600',
    violet: 'bg-gradient-to-b from-violet-500 to-violet-600',
    cyan: 'bg-gradient-to-b from-cyan-500 to-cyan-600',
    rose: 'bg-gradient-to-b from-rose-500 to-rose-600',
    blue: 'bg-gradient-to-b from-blue-500 to-blue-600',
  }

  const glowColors: Record<string, string> = {
    emerald: 'shadow-emerald-500/50',
    amber: 'shadow-amber-500/50',
    violet: 'shadow-violet-500/50',
    cyan: 'shadow-cyan-500/50',
    rose: 'shadow-rose-500/50',
    blue: 'shadow-blue-500/50',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'cartridge relative h-16 w-12 cursor-grab active:cursor-grabbing select-none touch-none',
        'transition-all duration-150',
        isBeingDragged && 'scale-110 rotate-2 shadow-2xl',
        state === 'inserted' && isActive && `shadow-lg ${glowColors[color]}`,
        state === 'half-inserted' && 'opacity-90',
        state === 'ejecting' && 'translate-y-2',
      )}
    >
      {/* Main SD Card Body - Dark gray shell */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 rounded-sm">
        {/* Notched corner (top-right) */}
        <div className="absolute top-0 right-0 w-2 h-2 bg-gradient-to-br from-zinc-900 to-zinc-950 clip-notch" />

        {/* Edge bevels */}
        <div className="absolute inset-0 rounded-sm border border-zinc-500/30" />
        <div className="absolute inset-[1px] rounded-sm border-t border-l border-zinc-400/20" />
        <div className="absolute inset-[1px] rounded-sm border-b border-r border-zinc-900/40" />

        {/* Right side notches (SD card style) */}
        <div className="absolute right-0 top-4 w-0.5 h-1.5 bg-zinc-900" />
        <div className="absolute right-0 top-7 w-0.5 h-1.5 bg-zinc-900" />
        <div className="absolute right-0 top-10 w-0.5 h-1.5 bg-zinc-900" />
      </div>

      {/* Top accent bar (colored) */}
      <div
        className={cn(
          'absolute top-1 left-1 right-2 h-3 rounded-t-sm',
          accentColors[color],
        )}
      >
        {/* Diagonal stripe pattern */}
        <div className="absolute inset-0 overflow-hidden rounded-t-sm">
          <div
            className="absolute -inset-1 bg-gradient-to-r from-white/20 via-transparent to-transparent"
            style={{ transform: 'skewX(-20deg)' }}
          />
        </div>
      </div>

      {/* ID Badge (top-left corner) */}
      <div className="absolute top-0.5 left-0.5 bg-zinc-900 px-1 py-0.5 rounded-br-sm">
        <span className="text-[5px] font-mono font-bold text-zinc-400">
          ▶{id.slice(-2).toUpperCase()}
        </span>
      </div>

      {/* Lock indicator */}
      <div className="absolute top-5 left-1.5 flex flex-col items-start gap-0.5">
        <span className="text-[4px] font-mono font-bold text-zinc-500">
          LOCK
        </span>
        <div className="w-1 h-2 bg-zinc-600 rounded-sm">
          <div
            className={cn(
              'w-full h-1 rounded-sm transition-colors',
              isActive ? 'bg-emerald-500' : 'bg-zinc-500',
            )}
          />
        </div>
      </div>

      {/* Main label area - metallic inset */}
      <div className="absolute top-6 left-1 right-1 bottom-4 bg-gradient-to-b from-zinc-400 via-zinc-300 to-zinc-400 rounded-sm overflow-hidden">
        {/* Brushed metal texture */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)',
          }}
        />

        {/* Decorative scan lines */}
        <div className="absolute bottom-1 left-1 right-1 flex items-center gap-px">
          <span className="text-[4px] font-mono text-zinc-600 font-bold">
            {id.slice(-3).toUpperCase()}STL
          </span>
          <div className="flex-1 flex gap-px ml-0.5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[2px] bg-zinc-500"
                style={{
                  height: `${2 + Math.sin(i) * 1}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Active glow overlay */}
        {isActive && state === 'inserted' && (
          <div className="absolute inset-0 bg-gradient-to-b from-cartridge-glow/20 to-cartridge-glow/10 animate-glow-pulse" />
        )}
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-0.5 left-0.5 right-0.5 text-center">
        <span className="text-[5px] font-mono font-bold text-zinc-300 uppercase tracking-tight truncate block px-0.5">
          {name}
        </span>
      </div>

      {/* Contact pins on bottom */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 h-1.5 rounded-sm',
              isActive ? 'bg-cartridge-glow' : 'bg-zinc-500',
            )}
          />
        ))}
      </div>

      {/* Finger drag indicator when dragging */}
      {isBeingDragged && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="w-6 h-6 rounded-full bg-white/20 border-2 border-white/40 shadow-lg animate-pulse" />
        </div>
      )}
    </div>
  )
}

export default DraggableCartridge
