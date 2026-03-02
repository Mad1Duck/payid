import DraggableCartridge from './DraggableCartridge'
import type { CartridgeState } from './DraggableCartridge'
import { cn } from '@/lib/utils'

interface CartridgeTrayProps {
  cartridges: Array<{
    id: string
    name: string
    color: string
    state: CartridgeState
  }>
}

const CartridgeTray = ({ cartridges }: CartridgeTrayProps) => {
  const trayCartridges = cartridges.filter((c) => c.state === 'tray')

  return (
    <div className="w-full">
      {/* Tray Label */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-medium">
          Available Cartridges
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
      </div>

      {/* Tray Container */}
      <div
        className={cn(
          'relative p-4 rounded-xl',
          'bg-gradient-to-b from-zinc-800/50 via-zinc-900/80 to-zinc-950',
          'border border-zinc-700/50',
          'shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]',
        )}
      >
        {/* Tray surface texture */}
        <div className="absolute inset-0 rounded-xl opacity-30 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

        {/* Cartridge holders */}
        <div className="relative flex items-center justify-center gap-4 min-h-[80px]">
          {trayCartridges.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
              All cartridges inserted
            </p>
          ) : (
            trayCartridges.map((cartridge) => (
              <div key={cartridge.id} className="relative">
                {/* Cartridge rest shadow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/50 rounded-full blur-md" />

                <DraggableCartridge
                  id={cartridge.id}
                  name={cartridge.name}
                  state={cartridge.state}
                  color={cartridge.color}
                  isActive={false}
                />
              </div>
            ))
          )}
        </div>

        {/* Drag hint */}
        {trayCartridges.length > 0 && (
          <p className="text-center text-[8px] text-muted-foreground/40 mt-3 uppercase tracking-wider">
            Drag cartridge to slot to insert
          </p>
        )}
      </div>
    </div>
  )
}

export default CartridgeTray
