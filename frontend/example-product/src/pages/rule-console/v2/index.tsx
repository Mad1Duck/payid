import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Wrench, Zap, Info, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  DndContext, DragOverlay, rectIntersection,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { useAccount } from 'wagmi'
import {
  useMyRules,
  useActiveCombinedRule,
  usePayIDContext,
} from 'payid-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { keccak256, encodePacked } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CartridgeTray } from './components/CartridgeTray'
import { GameConsole } from './components/GameConsole'
import { WalletButton } from '@/components/v2/WalletButton'
import type { CartridgeData } from './components/CartridgeTray'
import type { SlotData } from './components/GameConsole'
import { RuleCartridge } from './components/RuleCartridge'
import type { CartridgeType } from './components/RuleCartridge'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/v2/Layouts/MobileLayout'
import { Switch } from '@/components/v2/ui/switch'

// CombinedRuleStorage ABI (registerCombinedRule)
const COMBINED_ABI = [
  {
    name: 'registerCombinedRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ruleSetHash', type: 'bytes32' },
      { name: 'ruleNFTs', type: 'address[]' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'version', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    name: 'registerCombinedRuleForDirection',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ruleSetHash', type: 'bytes32' },
      { name: 'direction', type: 'uint8' },
      { name: 'ruleNFTs', type: 'address[]' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'version', type: 'uint64' },
    ],
    outputs: [],
  },
] as const

/** Build a deterministic rule-set hash from selected rules */
function buildRuleSetHash(
  ruleNFT: `0x${string}`,
  tokenIds: bigint[],
  version: bigint
): `0x${string}` {
  const ruleNFTs = Array(tokenIds.length).fill(ruleNFT)
  return keccak256(
    encodePacked(['address[]', 'uint256[]', 'uint64'], [ruleNFTs, tokenIds, version])
  ) as `0x${string}`
}

export default function RuleConsole() {
  const { address, isConnected } = useAccount()
  const { data: myRules = [] } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const { contracts } = usePayIDContext()

  const {
    writeContract,
    data: registerHash,
    isPending: isRegistering,
    error: registerError,
  } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null)
  const [activeCartridgeId, setActiveCartridgeId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )
  const consoleRef = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState<'none' | 'inbound' | 'outbound'>('none')
  const [version, setVersion] = useState('1')
  const [registerStage, setRegisterStage] = useState<'idle' | 'registering' | 'done' | 'error'>('idle')
  const [txLog, setTxLog] = useState<Array<{ time: string; msg: string; type: 'info' | 'ok' | 'err' }>>([])

  // ── Fetch NFT images from IPFS metadata ──
  const [nftImages, setNftImages] = useState<Record<string, string>>({})
  useEffect(() => {
    async function loadImages() {
      const images: Record<string, string> = {}
      for (const r of myRules) {
        if (!r.uri) continue
        const metaUrl = r.uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
        try {
          const res = await fetch(metaUrl)
          const meta = await res.json()
          if (meta.image) {
            const imgUrl = meta.image.startsWith('ipfs://')
              ? meta.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
              : meta.image
            images[`rule_${r.ruleId.toString()}`] = imgUrl
          }
        } catch {
          /* ignore fetch errors — metadata may be unavailable */
        }
      }
      setNftImages(images)
    }
    if (myRules.length > 0) loadImages()
  }, [myRules])

  // ── Build cartridges from ALL user rules ──
  const allRules = myRules
  const activeRules = allRules.filter((r) => r.active)
  const availableCartridges: Array<CartridgeData> = allRules.map((r) => {
    const name = r.uri?.startsWith('ipfs://')
      ? `Rule #${r.ruleId.toString()}`
      : `Rule #${r.ruleId.toString()}`
    return {
      id: `rule_${r.ruleId.toString()}`,
      type: 'minAmount' as const,
      name,
      summary: r.active ? `Token #${r.tokenId.toString()}` : 'INACTIVE',
      image: nftImages[`rule_${r.ruleId.toString()}`],
      ruleHash: r.ruleHash,
      authorityAddress: r.creator,
      active: r.active,
    }
  })

  // Slots start empty — user fills from their active rules
  const [slots, setSlots] = useState<Array<SlotData>>([
    { id: 'slot_a', label: 'SLOT A', cartridge: undefined },
    { id: 'slot_b', label: 'SLOT B', cartridge: undefined },
    { id: 'slot_c', label: 'SLOT C', cartridge: undefined },
  ])

  // Get cartridges that are not in slots
  const trayCartridges = availableCartridges.filter(
    (cart) => !slots.some((slot) => slot.cartridge?.id === cart.id),
  )

  const selectedSlots = slots.filter((s) => s.cartridge)
  const canRegister = selectedSlots.length > 0 && isConnected && !isRegistering && !isConfirming

  const handleSlotClick = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot?.cartridge) {
      setHighlightedSlot((prev) => (prev === slotId ? null : slotId))
    }
  }

  const handleCartridgeEject = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (slot?.cartridge) {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, cartridge: undefined } : s)))
      toast('Rule Ejected', { description: `${slot.cartridge.name} removed from ${slot.label}` })
    }
  }

  const handleCartridgeDrop = (cartridgeId: string, slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (slot?.cartridge) {
      toast.error('Slot Occupied', { description: 'Remove the current cartridge first' })
      return
    }
    const cartridge = availableCartridges.find((c) => c.id === cartridgeId)
    if (!cartridge) return
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, cartridge } : s)))
    setHighlightedSlot(null)
    if (!cartridge.active) {
      toast.warning('Rule Inactive', { description: `${cartridge.name} loaded — activate this rule to make it effective` })
    } else {
      toast.success('Rule Loaded', { description: `${cartridge.name} inserted into ${slot?.label}` })
    }
  }

  const handleCartridgeClick = (cartridgeId: string) => {
    if (!highlightedSlot) {
      const emptySlot = slots.find((s) => !s.cartridge)
      if (!emptySlot) {
        toast.error('No Empty Slots', { description: 'Remove a cartridge first' })
        return
      }
      handleCartridgeDrop(cartridgeId, emptySlot.id)
    } else {
      handleCartridgeDrop(cartridgeId, highlightedSlot)
    }
  }

  // ── dnd-kit handlers ──
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCartridgeId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id
    if (typeof overId === 'string' && overId.startsWith('slot_')) {
      setHighlightedSlot(overId)
    } else {
      setHighlightedSlot(null)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveCartridgeId(null)
    setHighlightedSlot(null)

    if (!over) return

    const cartridgeId = active.id as string
    const overId = over.id as string

    if (overId === 'tray') {
      // Eject from slot back to tray
      const srcSlot = slots.find((s) => s.cartridge?.id === cartridgeId)
      if (srcSlot) handleCartridgeEject(srcSlot.id)
      return
    }

    // Dropped onto a slot
    const isFromSlot = slots.some((s) => s.cartridge?.id === cartridgeId)
    if (isFromSlot) {
      // Slot → slot: swap
      const srcSlot = slots.find((s) => s.cartridge?.id === cartridgeId)!
      if (srcSlot.id === overId) return
      setSlots((prev) => prev.map((s) => {
        const src = prev.find((x) => x.id === srcSlot.id)!
        const tgt = prev.find((x) => x.id === overId)!
        if (s.id === srcSlot.id) return { ...s, cartridge: tgt.cartridge }
        if (s.id === overId)     return { ...s, cartridge: src.cartridge }
        return s
      }))
      toast.success('Rules Swapped', { description: `Swapped ${srcSlot.label} ↔ ${overId.replace('slot_', 'SLOT ').toUpperCase()}` })
    } else {
      // Tray → slot
      handleCartridgeDrop(cartridgeId, overId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // ── Register Combined Rule on-chain ──
  const handleRegister = () => {
    const filled = slots.filter((s) => s.cartridge)
    if (filled.length === 0 || !isConnected) return

    const selectedRules = filled
      .map((s) => activeRules.find((r) => `rule_${r.ruleId.toString()}` === s.cartridge!.id))
      .filter(Boolean) as typeof activeRules

    if (selectedRules.length === 0) return

    const tokenIds = selectedRules.map((r) => r.tokenId)
    const ver = BigInt(version || '1')
    const ruleNFTs = Array(tokenIds.length).fill(contracts.ruleItemERC721) as `0x${string}`[]
    const ruleSetHash = buildRuleSetHash(contracts.ruleItemERC721, tokenIds, ver)

    setRegisterStage('registering')
    setTxLog([
      { time: nowStr(), msg: `> Registering ${selectedRules.length} rule(s)`, type: 'info' },
      { time: nowStr(), msg: `  Hash: ${ruleSetHash.slice(0, 18)}…`, type: 'info' },
      { time: nowStr(), msg: '  Waiting for wallet…', type: 'info' },
    ])

    if (direction === 'none') {
      writeContract({
        address: contracts.combinedRuleStorage,
        abi: COMBINED_ABI,
        functionName: 'registerCombinedRule',
        args: [ruleSetHash, ruleNFTs, tokenIds, ver],
      })
    } else {
      writeContract({
        address: contracts.combinedRuleStorage,
        abi: COMBINED_ABI,
        functionName: 'registerCombinedRuleForDirection',
        args: [ruleSetHash, direction === 'inbound' ? 0 : 1, ruleNFTs, tokenIds, ver],
      })
    }
  }

  // Watch register result
  useEffect(() => {
    if (registerSuccess) {
      setRegisterStage('done')
      setTxLog((prev) => [
        ...prev,
        { time: nowStr(), msg: '  ✓ Transaction confirmed', type: 'ok' },
        { time: nowStr(), msg: `  Hash: ${(registerHash ?? '').slice(0, 18)}…`, type: 'ok' },
        { time: nowStr(), msg: '  Policy active', type: 'ok' },
      ])
      toast.success('Combined Rule Registered', { description: 'Your policy is now active.' })
    }
    if (registerError) {
      setRegisterStage('error')
      const msg = (registerError as { shortMessage?: string }).shortMessage ?? 'Unknown error'
      setTxLog((prev) => [
        ...prev,
        { time: nowStr(), msg: `  ✗ ${msg}`, type: 'err' },
      ])
      toast.error('Registration Failed', { description: msg })
    }
  }, [registerSuccess, registerError, registerHash])

  // Find the active cartridge data for DragOverlay
  const activeCartridge = activeCartridgeId
    ? (availableCartridges.find((c) => c.id === activeCartridgeId)
      ?? slots.flatMap((s) => s.cartridge ? [s.cartridge] : []).find((c) => c.id === activeCartridgeId))
    : null

  return (
    <MobileLayout hideNav>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between p-4"
      >
        <Link to="/rules">
          <button className="btn-tactile flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-mono uppercase font-semibold">Back</span>
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
        <div className="flex items-center gap-2">
          <Wrench
            className={cn('w-4 h-4 transition-colors', showAdvanced ? 'text-amber-500' : 'text-slate-400')}
          />
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Advanced</span>
          <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} className="data-[state=checked]:bg-amber-600" />
        </div>
      </motion.div>

      {/* Active Policy Banner */}
      {activeCombined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-3"
        >
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                Active Policy
              </span>
            </div>
            <p className="text-[10px] font-mono text-emerald-500/60 mt-1 truncate">
              {activeCombined.hash}
            </p>
            <p className="text-[10px] text-emerald-500/40 mt-0.5">
              {activeCombined.ruleRefs.length} rule{activeCombined.ruleRefs.length > 1 ? 's' : ''} · v{activeCombined.version.toString()}
            </p>
          </div>
        </motion.div>
      )}

      {!activeCombined && isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-3"
        >
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 shadow-sm">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-600" />
              <span className="text-[10px] font-mono uppercase text-slate-700 tracking-wider font-bold">
                No Active Policy
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Load active rules into slots and register a combined policy.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── MAIN: Console + Tray wrapped in DndContext ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
      <motion.div
        ref={consoleRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col items-center px-4 pb-4"
      >
        {/* Console centered */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <GameConsole
            slots={slots}
            highlightedSlot={highlightedSlot}
            showAdvanced={showAdvanced}
            txLog={txLog}
            onSlotClick={handleSlotClick}
            onCartridgeEject={handleCartridgeEject}
          />
        </div>

        {/* Hint */}
        <p className="text-[9px] font-mono text-slate-400/40 uppercase tracking-wider mt-1 mb-3">
          drag to slot · drag to tray to eject · tap to quick-insert
        </p>

        {/* Cartridge Tray */}
        <CartridgeTray
          cartridges={trayCartridges}
          showAdvanced={showAdvanced}
          onCartridgeClick={handleCartridgeClick}
        />

        {/* ── Register panel ── */}
        {selectedSlots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wide">
                Register Policy
              </span>
              <span className="ml-auto text-[10px] font-mono text-slate-400">
                {selectedSlots.length}/{slots.length} slots
              </span>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex gap-2">
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as 'none' | 'inbound' | 'outbound')}
                  className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="none">Both directions</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
                <input
                  type="number"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  min={1}
                  placeholder="v"
                  className="w-14 px-2 py-1.5 rounded border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {registerStage !== 'idle' && (
                <div
                  className={cn(
                    'py-2 px-3 rounded text-[11px] font-mono text-center',
                    registerStage === 'done' ? 'bg-emerald-50 text-emerald-700' :
                    registerStage === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700',
                  )}
                >
                  {registerStage === 'registering' && '⏳ Registering...'}
                  {registerStage === 'done' && '✓ Policy registered!'}
                  {registerStage === 'error' && '✗ Registration failed'}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={!canRegister}
                className={cn(
                  'w-full h-9 rounded-lg btn-tactile font-semibold text-xs text-white',
                  'bg-teal-600 hover:bg-teal-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isRegistering || isConfirming ? 'Registering...' : 'Register Combined Rule'}
              </button>
            </div>
          </motion.div>
        )}

        {!isConnected && (
          <p className="text-center text-[10px] text-slate-400 mt-4">Connect wallet to register</p>
        )}
      </motion.div>

      {/* DragOverlay — floating cartridge preview while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeCartridge ? (
          <div style={{ transform: 'scale(1.08)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.55))' }}>
            <RuleCartridge
              id={activeCartridge.id}
              type={(activeCartridge as { type: CartridgeType }).type ?? 'minAmount'}
              name={activeCartridge.name}
              summary={activeCartridge.summary}
              image={activeCartridge.image}
              isActive
            />
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>
    </MobileLayout>
  )
}
