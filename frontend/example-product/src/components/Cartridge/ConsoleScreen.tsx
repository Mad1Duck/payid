import { cn } from '@/lib/utils'

interface ConsoleScreenProps {
  activeCartridge?: {
    name: string
    id: number
  }
  totalSlots: number
  occupiedSlots: number
}

const ConsoleScreen = ({
  activeCartridge,
  totalSlots,
  occupiedSlots,
}: ConsoleScreenProps) => {
  return (
    <div className="console-screen w-full h-44 p-3 flex flex-col justify-between">
      {/* Screen content */}
      <div className="relative z-0 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-screen-glow animate-glow-pulse" />
            <span className="text-[8px] text-screen-glow/80 uppercase tracking-widest">
              Combined Rule Console
            </span>
          </div>
          <span className="text-[7px] text-muted-foreground/50 font-mono">
            v2.04
          </span>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {activeCartridge ? (
            <>
              <p className="text-base text-screen-text font-bold tracking-wider animate-screen-flicker text-glow">
                SYSTEM READY
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-screen-glow animate-glow-pulse" />
                <p className="text-[10px] text-screen-glow font-medium tracking-wide">
                  {String(activeCartridge.id).padStart(2, '0')}{' '}
                  {activeCartridge.name.toUpperCase()} ACTIVE
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground/60 tracking-wider">
                NO CARTRIDGE ACTIVE
              </p>
              <p className="text-[9px] text-muted-foreground/40 mt-1.5 tracking-wide">
                INSERT & TAP TO ACTIVATE
              </p>
            </>
          )}
        </div>

        {/* Footer status bar */}
        <div className="flex items-center justify-between pt-2 border-t border-muted-foreground/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <span className="text-[7px] text-muted-foreground/50">SLOTS</span>
              <span className="text-[7px] text-screen-glow">
                {occupiedSlots}/{totalSlots}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[7px] text-muted-foreground/50">PWR</span>
              <span className="text-[7px] text-screen-text">OK</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-0.5 h-2 rounded-sm',
                  i < 4 ? 'bg-screen-text/80' : 'bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsoleScreen
