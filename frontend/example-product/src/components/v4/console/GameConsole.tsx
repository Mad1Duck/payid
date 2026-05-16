import { motion } from 'framer-motion'
import { DroppableSlotZone, type SlotData } from '@/features/rules'

interface GameConsoleProps {
  slots: Array<SlotData>
  highlightedSlot?: string | null
  showAdvanced?: boolean
  txLog?: Array<{ time: string; msg: string; type: 'info' | 'ok' | 'err' }>
  onSlotClick?: (slotId: string) => void
  onCartridgeEject?: (slotId: string) => void
}

export function GameConsole({
  slots,
  highlightedSlot,
  showAdvanced = false,
  txLog = [],
  onSlotClick,
  onCartridgeEject,
}: GameConsoleProps) {
  return (
    <div className="flex flex-col items-center select-none">
      {/* ── CONSOLE BODY ── */}
      <div
        className="relative w-[244px] rounded-[20px] z-10"
        style={{
          background: 'linear-gradient(165deg, #d8dce0 0%, #c4c8cc 40%, #b0b4b8 100%)',
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {/* Corner screws */}
        {[['top-2.5 left-2.5'], ['top-2.5 right-2.5'], ['bottom-3.5 left-2.5'], ['bottom-3.5 right-2.5']].map(
          (pos, i) => (
            <div
              key={i}
              className={`absolute ${pos[0]} w-2 h-2 rounded-full`}
              style={{
                background: 'radial-gradient(circle at 35% 35%, #a0a4a8, #6a6e72)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5), 0 0.5px 1px rgba(255,255,255,0.2)',
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ fontSize: '5px', color: 'rgba(0,0,0,0.35)', fontWeight: 900 }}
              >
                ✕
              </div>
            </div>
          ),
        )}

        {/* Top section */}
        <div className="px-5 pt-5 pb-3">
          {/* Brand */}
          <div className="flex justify-between items-center mb-2.5">
            <span
              className="text-[7px] font-black tracking-[0.35em] uppercase"
              style={{ color: '#5a5d60', fontFamily: 'monospace' }}
            >
              PAYID
            </span>
            <span
              className="text-[7px] font-bold tracking-[0.2em] uppercase"
              style={{ color: '#5a5d60', fontFamily: 'monospace' }}
            >
              ADVANCE
            </span>
          </div>

          {/* Screen bezel */}
          <div
            className="rounded-xl p-[5px]"
            style={{
              background: '#1a1e18',
              boxShadow:
                'inset 0 3px 10px rgba(0,0,0,0.9), inset 0 -1px 3px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {/* LCD Screen */}
            <div
              className="rounded-[8px] overflow-hidden relative"
              style={{ background: '#060e06', aspectRatio: '4/3' }}
            >
              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)',
                }}
              />
              {/* Screen glare */}
              <div
                className="absolute top-0 left-0 w-1/2 h-1/3 pointer-events-none z-10"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
                }}
              />
              {/* Content */}
              <div className="relative z-0 p-3 font-mono">
                {txLog.length > 0 ? (
                  /* TX LOG MODE */
                  <>
                    <div
                      className="text-[8px] mb-1.5 font-bold tracking-wider"
                      style={{ color: '#3dff3d', textShadow: '0 0 6px #3dff3d80' }}
                    >
                      ◢ TX MONITOR
                    </div>
                    <div className="space-y-0.5">
                      {txLog.map((entry, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <span style={{ color: '#1a5a1a', fontSize: 5, whiteSpace: 'nowrap', marginTop: 1 }}>
                            {entry.time}
                          </span>
                          <span
                            style={{
                              fontSize: 6,
                              color: entry.type === 'ok' ? '#5bff5b' : entry.type === 'err' ? '#ff5555' : '#90ff90',
                              wordBreak: 'break-all',
                              lineHeight: 1.3,
                            }}
                          >
                            {entry.msg}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-1.5 text-[5px] tracking-wide animate-pulse"
                      style={{ color: '#1a4a1a' }}
                    >
                      _
                    </div>
                  </>
                ) : (
                  /* NORMAL MODE */
                  <>
                    <div
                      className="text-[8px] mb-2 font-bold tracking-wider"
                      style={{ color: '#3dff3d', textShadow: '0 0 6px #3dff3d80' }}
                    >
                      ◢ RULE ENGINE v1
                    </div>
                    <div className="space-y-1.5">
                      {slots.map((slot) => (
                        <div key={slot.id}>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-500"
                              style={{
                                background: slot.cartridge ? '#3dff3d' : '#163016',
                                boxShadow: slot.cartridge ? '0 0 5px #3dff3d' : 'none',
                              }}
                            />
                            <span
                              className="text-[7px] truncate flex-1"
                              style={{ color: slot.cartridge ? '#90ff90' : '#1e3a1e' }}
                            >
                              {slot.cartridge ? slot.cartridge.name : `${slot.label}: —`}
                            </span>
                          </div>
                          {slot.cartridge && (
                            <div className="pl-3 space-y-0.5">
                              <span
                                className="block text-[5.5px] truncate"
                                style={{ color: '#2a8a2a' }}
                              >
                                {slot.cartridge.summary}
                              </span>
                              <span
                                className="block text-[5px] truncate"
                                style={{ color: '#1a5a1a' }}
                              >
                                {slot.cartridge.ruleHash?.slice(0, 18)}…
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-2.5 text-[6px] tracking-wide"
                      style={{ color: '#1a4a1a' }}
                    >
                      {slots.filter((s) => s.cartridge).length === 0
                        ? '_ INSERT CARTRIDGE'
                        : `${slots.filter((s) => s.cartridge).length} RULE(S) LOADED`}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Divider + status LEDs */}
        <div
          className="flex items-center justify-between px-5 py-1.5"
          style={{
            borderTop: '1px solid rgba(0,0,0,0.12)',
            borderBottom: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <span
            className="text-[6px] font-mono font-bold tracking-[0.2em] uppercase"
            style={{ color: '#5a5d60' }}
          >
            RULE SLOTS
          </span>
          <div className="flex gap-1.5">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="w-1.5 h-1.5 rounded-full transition-all duration-400"
                style={{
                  background: slot.cartridge ? '#5bff5b' : '#c0c4c8',
                  boxShadow: slot.cartridge ? '0 0 5px #5bff5b' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Slot openings at bottom of console — highlight driven by overSlot prop */}
        <div
          className="flex justify-center gap-2.5 px-4 pt-2.5 pb-3 rounded-b-[20px]"
          style={{
            background: 'linear-gradient(180deg, #a8acb0 0%, #989c9e 100%)',
          }}
        >
          {slots.map((slot) => {
            const lit = highlightedSlot === slot.id
            return (
              <div key={slot.id} className="flex flex-col items-center" style={{ width: '56px' }}>
                <span
                  className="text-[6px] font-mono mb-1 font-bold tracking-widest transition-colors duration-150"
                  style={{ color: lit ? '#00cc00' : '#6a6e72' }}
                >
                  {slot.label}
                </span>
                {/* Slot opening hole */}
                <div
                  className="w-full h-7 rounded-t-sm relative overflow-hidden transition-all duration-150"
                  style={{
                    background: lit ? '#0a1a0a' : '#060906',
                    border: lit ? '1px solid rgba(93,255,93,0.35)' : '1px solid rgba(0,0,0,0.7)',
                    borderBottom: 'none',
                    boxShadow: lit
                      ? 'inset 0 2px 8px rgba(0,0,0,0.8), inset 0 0 12px rgba(61,255,61,0.15)'
                      : 'inset 0 2px 8px rgba(0,0,0,0.95)',
                  }}
                >
                  <div className="flex justify-center gap-px items-end h-full pb-px">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '4px',
                          height: '16px',
                          background: lit ? 'rgba(61,255,61,0.4)' : 'rgba(184,150,64,0.45)',
                          borderRadius: '1px 1px 0 0',
                          transition: 'background 0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CARTRIDGE DISPLAY ZONE — each slot is a dnd-kit droppable ── */}
      <div className="flex justify-center gap-2.5 px-4 relative z-0" style={{ width: '244px', marginTop: '-1px' }}>
        {slots.map((slot) => (
          <DroppableSlotZone
            key={slot.id}
            slot={slot}
            highlighted={highlightedSlot === slot.id}
            showAdvanced={showAdvanced}
            onSlotClick={onSlotClick}
            onCartridgeEject={onCartridgeEject}
          />
        ))}
      </div>
    </div>
  )
}
