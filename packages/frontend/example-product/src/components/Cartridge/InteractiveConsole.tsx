import { useCallback, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import CartridgeTray from './CartridgeTray'
import ConsoleScreen from './ConsoleScreen'
import DroppableSlot from './DroppableSlot'
import DraggableCartridge from './DraggableCartridge'
import type { CartridgeState } from './DraggableCartridge'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

import { cn } from '@/lib/utils'

interface Cartridge {
  id: string
  name: string
  color: string
  state: CartridgeState
  slotId?: number
  isActive: boolean
}

interface Slot {
  id: number
  side: 'left' | 'right'
  cartridgeId?: string
}

const initialCartridges: Array<Cartridge> = [
  {
    id: 'cart-1',
    name: 'Speed Boost',
    color: 'emerald',
    state: 'inserted',
    slotId: 1,
    isActive: true,
  },
  {
    id: 'cart-2',
    name: 'Power Up',
    color: 'amber',
    state: 'half-inserted',
    slotId: 2,
    isActive: false,
  },
  {
    id: 'cart-3',
    name: 'Shield',
    color: 'cyan',
    state: 'tray',
    isActive: false,
  },
  {
    id: 'cart-4',
    name: 'Stealth',
    color: 'violet',
    state: 'tray',
    isActive: false,
  },
  {
    id: 'cart-5',
    name: 'Radar',
    color: 'rose',
    state: 'tray',
    isActive: false,
  },
  {
    id: 'cart-6',
    name: 'Turbo',
    color: 'blue',
    state: 'tray',
    isActive: false,
  },
]

const initialSlots: Array<Slot> = [
  { id: 1, side: 'left', cartridgeId: 'cart-1' },
  { id: 2, side: 'left', cartridgeId: 'cart-2' },
  { id: 3, side: 'left' },
  { id: 4, side: 'right' },
  { id: 5, side: 'right' },
  { id: 6, side: 'right' },
]

const InteractiveConsole = () => {
  const [cartridges, setCartridges] =
    useState<Array<Cartridge>>(initialCartridges)
  const [slots, setSlots] = useState<Array<Slot>>(initialSlots)
  const [activeId, setActiveId] = useState<string | null>(null)

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 100, tolerance: 5 },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      // Dropped outside - return to tray
      const cartridgeId = active.id as string
      const cartridge = cartridges.find((c) => c.id === cartridgeId)

      if (cartridge && cartridge.slotId) {
        setCartridges((prev) =>
          prev.map((c) =>
            c.id === cartridgeId
              ? {
                  ...c,
                  state: 'tray' as CartridgeState,
                  slotId: undefined,
                  isActive: false,
                }
              : c,
          ),
        )
        setSlots((prev) =>
          prev.map((s) =>
            s.cartridgeId === cartridgeId
              ? { ...s, cartridgeId: undefined }
              : s,
          ),
        )
        console.log('toast')
      }
      return
    }

    const cartridgeId = active.id as string
    const slotIdStr = over.id as string

    if (slotIdStr.startsWith('slot-')) {
      const slotNumber = parseInt(slotIdStr.replace('slot-', ''))
      const targetSlot = slots.find((s) => s.id === slotNumber)
      const cartridge = cartridges.find((c) => c.id === cartridgeId)

      if (!targetSlot || !cartridge) return

      // Check if slot is already occupied
      if (targetSlot.cartridgeId && targetSlot.cartridgeId !== cartridgeId) {
        console.log('toast')
        return
      }

      // Remove from old slot if any
      const oldSlot = cartridge.slotId

      setSlots((prev) =>
        prev.map((s) => {
          if (s.id === slotNumber) {
            return { ...s, cartridgeId }
          }
          if (s.cartridgeId === cartridgeId) {
            return { ...s, cartridgeId: undefined }
          }
          return s
        }),
      )

      setCartridges((prev) =>
        prev.map((c) =>
          c.id === cartridgeId
            ? { ...c, state: 'inserted' as CartridgeState, slotId: slotNumber }
            : c,
        ),
      )

      if (!oldSlot) {
        console.log('toast')
      }
    }
  }

  const handleCartridgeClick = useCallback(
    (cartridgeId: string) => {
      const cartridge = cartridges.find((c) => c.id === cartridgeId)
      if (!cartridge || cartridge.state !== 'inserted') return

      // Toggle active state
      setCartridges((prev) =>
        prev.map((c) => ({
          ...c,
          isActive: c.id === cartridgeId ? !c.isActive : false,
        })),
      )

      if (!cartridge.isActive) {
        console.log('toast')
      }
    },
    [cartridges],
  )

  const handleSlotDoubleClick = useCallback(
    (slotId: number) => {
      const slot = slots.find((s) => s.id === slotId)
      if (!slot?.cartridgeId) return

      const cartridge = cartridges.find((c) => c.id === slot.cartridgeId)
      if (!cartridge) return

      // Eject cartridge
      setCartridges((prev) =>
        prev.map((c) =>
          c.id === slot.cartridgeId
            ? { ...c, state: 'ejecting' as CartridgeState }
            : c,
        ),
      )

      setTimeout(() => {
        setCartridges((prev) =>
          prev.map((c) =>
            c.id === slot.cartridgeId
              ? {
                  ...c,
                  state: 'tray' as CartridgeState,
                  slotId: undefined,
                  isActive: false,
                }
              : c,
          ),
        )
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, cartridgeId: undefined } : s,
          ),
        )
        console.log('toast')
      }, 300)
    },
    [slots, cartridges],
  )

  const activeCartridge = cartridges.find(
    (c) => c.isActive && c.state === 'inserted',
  )
  const occupiedSlots = slots.filter((s) => s.cartridgeId).length
  const leftSlots = slots.filter((s) => s.side === 'left')
  const rightSlots = slots.filter((s) => s.side === 'right')
  const draggingCartridge = activeId
    ? cartridges.find((c) => c.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-full flex flex-col items-center justify-between p-4 pb-6 bg-linear-to-b from-zinc-800 via-zinc-900 to-black">
        {/* Ambient glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Console Container */}
        <div className="console-body w-full max-w-sm relative">
          {/* Top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-linear-to-r from-transparent via-primary/50 to-transparent rounded-full" />

          {/* Speaker grills */}
          <div className="absolute top-3 left-4 flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 h-2.5 bg-muted-foreground/20 rounded-full"
              />
            ))}
          </div>
          <div className="absolute top-3 right-4 flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 h-2.5 bg-muted-foreground/20 rounded-full"
              />
            ))}
          </div>

          {/* Main Layout */}
          <div className="flex items-stretch gap-2 mt-5">
            {/* Left Cartridge Slots */}
            <div className="flex flex-col gap-5 justify-center pt-4">
              {leftSlots.map((slot) => {
                const cartridge = cartridges.find(
                  (c) => c.id === slot.cartridgeId,
                )
                return (
                  <div
                    key={slot.id}
                    onDoubleClick={() => handleSlotDoubleClick(slot.id)}
                    onClick={() =>
                      cartridge && handleCartridgeClick(cartridge.id)
                    }
                  >
                    <DroppableSlot
                      slotNumber={slot.id}
                      side="left"
                      isOccupied={!!slot.cartridgeId}
                      isActive={cartridge?.isActive || false}
                      cartridgeState={cartridge?.state}
                    >
                      {cartridge &&
                        cartridge.state !== 'tray' &&
                        activeId !== cartridge.id && (
                          <DraggableCartridge
                            id={cartridge.id}
                            name={cartridge.name}
                            state={cartridge.state}
                            color={cartridge.color}
                            isActive={cartridge.isActive}
                          />
                        )}
                    </DroppableSlot>
                  </div>
                )
              })}
            </div>

            {/* Central Screen */}
            <div className="flex-1">
              <ConsoleScreen
                activeCartridge={
                  activeCartridge
                    ? {
                        name: activeCartridge.name,
                        id: activeCartridge.slotId || 0,
                      }
                    : undefined
                }
                totalSlots={6}
                occupiedSlots={occupiedSlots}
              />
            </div>

            {/* Right Cartridge Slots */}
            <div className="flex flex-col gap-5 justify-center pt-4">
              {rightSlots.map((slot) => {
                const cartridge = cartridges.find(
                  (c) => c.id === slot.cartridgeId,
                )
                return (
                  <div
                    key={slot.id}
                    onDoubleClick={() => handleSlotDoubleClick(slot.id)}
                    onClick={() =>
                      cartridge && handleCartridgeClick(cartridge.id)
                    }
                  >
                    <DroppableSlot
                      slotNumber={slot.id}
                      side="right"
                      isOccupied={!!slot.cartridgeId}
                      isActive={cartridge?.isActive || false}
                      cartridgeState={cartridge?.state}
                    >
                      {cartridge &&
                        cartridge.state !== 'tray' &&
                        activeId !== cartridge.id && (
                          <DraggableCartridge
                            id={cartridge.id}
                            name={cartridge.name}
                            state={cartridge.state}
                            color={cartridge.color}
                            isActive={cartridge.isActive}
                          />
                        )}
                    </DroppableSlot>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom controls area */}
          <div className="mt-4 flex items-center justify-between px-2">
            {/* Power indicator */}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-screen-text shadow-[0_0_6px_hsl(140_60%_50%/0.6)]" />
              <span className="text-[7px] text-muted-foreground/50 uppercase tracking-wider">
                Power
              </span>
            </div>

            {/* Model number */}
            <span className="text-[7px] text-muted-foreground/30 tracking-widest">
              CRC-MK2
            </span>

            {/* Status LEDs */}
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  activeCartridge
                    ? 'bg-primary animate-glow-pulse'
                    : 'bg-muted-foreground/30',
                )}
              />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
          </div>

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-0.5 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent rounded-full" />
        </div>

        {/* Cartridge Tray */}
        <div className="w-full max-w-sm mt-6">
          <CartridgeTray cartridges={cartridges} />
        </div>

        {/* Instructions */}
        <p className="text-[8px] text-muted-foreground/30 uppercase tracking-wider mt-4 text-center">
          Drag to insert • Click to activate • Double-click to eject
        </p>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggingCartridge ? (
          <DraggableCartridge
            id={draggingCartridge.id}
            name={draggingCartridge.name}
            state="dragging"
            color={draggingCartridge.color}
            isActive={false}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default InteractiveConsole
