import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Wrench } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { CartridgeTray } from './components/CartridgeTray'
import { GameConsole } from './components/GameConsole'
import type { CartridgeData } from './components/CartridgeTray'
import type { SlotData } from './components/GameConsole'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/Layouts/MobileLayout'
import { Switch } from '@/components/ui/switch'

// Mock data for available cartridges
const availableCartridges: Array<CartridgeData> = [
  {
    id: 'rule_001',
    type: 'minAmount',
    name: 'Min Amount',
    summary: '≥ 10 USDC',
    ruleHash: '0x7f3a8b2c',
    authorityAddress: '0xAuth9d4e',
  },
  {
    id: 'rule_002',
    type: 'allowedToken',
    name: 'Token',
    summary: 'USDC only',
    ruleHash: '0x9c4d2e1f',
    authorityAddress: '0xAuth7b3a',
  },
  {
    id: 'rule_003',
    type: 'allowedSender',
    name: 'Sender',
    summary: 'Whitelist',
    ruleHash: '0x2b5e8f4a',
    authorityAddress: '0xAuth2c8d',
  },
  {
    id: 'rule_004',
    type: 'expiration',
    name: 'Expires',
    summary: '24 hours',
    ruleHash: '0x6a1c9d3b',
    authorityAddress: '0xAuth5f2e',
  },
]

export default function RuleConsole() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const [slotPositions, setSlotPositions] = useState<
    Array<{ id: string; x: number; y: number; width: number; height: number }>
  >([])

  // Initialize slots
  const [slots, setSlots] = useState<Array<SlotData>>([
    {
      id: 'slot_a',
      label: 'SLOT A',
      cartridge: {
        id: 'rule_001',
        type: 'minAmount',
        name: 'Min Amount',
        summary: '≥ 10 USDC',
        ruleHash: '0x7f3a8b2c',
        authorityAddress: '0xAuth9d4e',
      },
    },
    { id: 'slot_b', label: 'SLOT B', cartridge: undefined },
    { id: 'slot_c', label: 'SLOT C', cartridge: undefined },
  ])

  // Update slot positions for drag detection
  const updateSlotPositions = useCallback(() => {
    const slotElements = document.querySelectorAll('[data-slot-id]')
    const positions: Array<{
      id: string
      x: number
      y: number
      width: number
      height: number
    }> = []

    slotElements.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const slotId = el.getAttribute('data-slot-id')
      if (slotId) {
        positions.push({
          id: slotId,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
      }
    })

    setSlotPositions(positions)
  }, [])

  useEffect(() => {
    updateSlotPositions()
    window.addEventListener('resize', updateSlotPositions)
    window.addEventListener('scroll', updateSlotPositions)

    // Update positions after a short delay to ensure DOM is ready
    const timeout = setTimeout(updateSlotPositions, 100)

    return () => {
      window.removeEventListener('resize', updateSlotPositions)
      window.removeEventListener('scroll', updateSlotPositions)
      clearTimeout(timeout)
    }
  }, [updateSlotPositions, slots])

  // Get cartridges that are not in slots
  const trayCartridges = availableCartridges.filter(
    (cart) => !slots.some((slot) => slot.cartridge?.id === cart.id),
  )

  const handleSlotClick = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)

    if (!slot?.cartridge) {
      // Highlight slot for insertion
      setHighlightedSlot((prev) => (prev === slotId ? null : slotId))
    }
  }

  const handleCartridgeEject = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (slot?.cartridge) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, cartridge: undefined } : s)),
      )
      toast('Rule Ejected', {
        description: `${slot.cartridge.name} removed from ${slot.label}`,
      })
    }
  }

  const handleCartridgeDrop = (cartridgeId: string, slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (slot?.cartridge) {
      toast.error('Slot Occupied', {
        description: 'Remove the current cartridge first',
      })
      return
    }

    const cartridge = availableCartridges.find((c) => c.id === cartridgeId)
    if (!cartridge) return

    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, cartridge } : s)),
    )

    setHighlightedSlot(null)

    toast.success('Rule Loaded', {
      description: `${cartridge.name} inserted into ${slot?.label}`,
    })
  }

  const handleCartridgeClick = (cartridgeId: string) => {
    if (!highlightedSlot) {
      // Find first empty slot
      const emptySlot = slots.find((s) => !s.cartridge)
      if (!emptySlot) {
        toast.error('No Empty Slots', {
          description: 'Remove a cartridge first',
        })
        return
      }
      handleCartridgeDrop(cartridgeId, emptySlot.id)
    } else {
      handleCartridgeDrop(cartridgeId, highlightedSlot)
    }
  }

  return (
    <MobileLayout hideNav className="bg-console-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button className="flex items-center gap-1 text-console-label hover:text-console-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-mono uppercase">Back</span>
        </button>

        {/* Advanced View Toggle */}
        <div className="flex items-center gap-2">
          <Wrench
            className={cn(
              'w-4 h-4 transition-colors',
              showAdvanced ? 'text-amber-500' : 'text-console-label/50',
            )}
          />
          <span className="text-[10px] font-mono uppercase text-console-label">
            Advanced
          </span>
          <Switch
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            className="data-[state=checked]:bg-amber-600"
          />
        </div>
      </div>

      {/* Advanced View Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 overflow-hidden"
          >
            <div
              className={cn(
                'p-3 rounded-lg',
                'bg-gradient-to-b from-amber-950/50 to-black/40',
                'border border-amber-900/30',
                'shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-amber-500/80">
                  Debug Mode Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-console-label/60">
                <div className="p-2 bg-black/30 rounded">
                  <span className="block text-console-label/40 mb-0.5">
                    Console ID
                  </span>
                  <span className="text-amber-400/80">PAYID-CON-001</span>
                </div>
                <div className="p-2 bg-black/30 rounded">
                  <span className="block text-console-label/40 mb-0.5">
                    Authority
                  </span>
                  <span className="text-amber-400/80 truncate">
                    0x8f4a...2d7e
                  </span>
                </div>
                <div className="p-2 bg-black/30 rounded col-span-2">
                  <span className="block text-console-label/40 mb-0.5">
                    Active Rules Hash
                  </span>
                  <span className="text-amber-400/80">
                    {slots.filter((s) => s.cartridge).length > 0
                      ? '0x' +
                        slots
                          .filter((s) => s.cartridge)
                          .map((s) => s.cartridge?.ruleHash?.slice(2, 4))
                          .join('')
                      : 'NULL'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Console */}
      <div
        ref={consoleRef}
        className="flex-1 px-4 pb-4 flex flex-col justify-between"
      >
        <div className="flex-1 flex items-center justify-center">
          <GameConsole
            slots={slots}
            highlightedSlot={highlightedSlot}
            showAdvanced={showAdvanced}
            onSlotClick={handleSlotClick}
            onCartridgeEject={handleCartridgeEject}
          />
        </div>

        {/* Cartridge Tray */}
        <div className="mt-4">
          <CartridgeTray
            cartridges={trayCartridges}
            showAdvanced={showAdvanced}
            slotPositions={slotPositions}
            onCartridgeDrop={handleCartridgeDrop}
            onCartridgeClick={handleCartridgeClick}
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-mono text-console-label/50 uppercase tracking-wider">
            Drag cartridge to slot • Pull up to eject
          </p>
        </div>
      </div>
    </MobileLayout>
  )
}
