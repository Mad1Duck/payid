import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  useAccount,
  useChainId,
  useChains,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { encodePacked, keccak256, parseEther } from 'viem'
import {
  useActiveCombinedRule,
  useMyRules,
  usePayIDContext,
  useSubscribe,
  useSubscription,
  useSubscriptionPrice,
} from 'payid-react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Clock,
  Cpu,
  Crown,
  DollarSign,
  FlaskConical,
  Info,
  Loader2,
  Play,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import {
  CHAINLINK_ORACLE_ABI,
  CHAINLINK_ORACLE_ADDRESSES,
} from '../../constants/oracles'
import { GameConsole } from '../../pages/rule-console/v2/components/GameConsole'
import { CartridgeTray } from '../../pages/rule-console/v2/components/CartridgeTray'
import { RuleCartridge } from '../../pages/rule-console/v2/components/RuleCartridge'
import { useV4Palette } from './theme'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import type { SlotData } from '../../pages/rule-console/v2/components/GameConsole'
import type { CartridgeData } from '../../pages/rule-console/v2/components/CartridgeTray'
import type { CartridgeType } from '../../pages/rule-console/v2/components/RuleCartridge'
import { useTokenPrice } from '@/hooks/useTokenPrice'

// Utility to format price nicely
const formatPrice = (priceWei: bigint): string => {
  const price = Number(priceWei) / 1e18
  if (price < 0.0001) return price.toFixed(8)
  if (price < 0.01) return price.toFixed(6)
  if (price < 1) return price.toFixed(4)
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Utility to format price with USD equivalent
// Query Chainlink oracle for real-time ETH/USD price
const formatPriceWithUSD = (
  priceWei: bigint,
  nativeSymbol: string,
  ethUsdPrice?: bigint,
): string => {
  const formattedPrice = formatPrice(priceWei)
  const price = Number(priceWei) / 1e18

  // If oracle price is available, calculate USD equivalent
  if (ethUsdPrice && ethUsdPrice > 0n) {
    const ethPrice = Number(ethUsdPrice) / 1e8 // Chainlink uses 8 decimals
    const usdPrice = (price * ethPrice).toFixed(2)
    return `$${usdPrice} (${formattedPrice} ${nativeSymbol})`
  }

  // Fallback if oracle price not available
  return `${formattedPrice} ${nativeSymbol}`
}

/* ── Mini rule evaluator (no WASM, JS-only for demo) ── */
type Cond = { field: string; op: string; value: unknown }
type RuleObj = {
  if?: Cond
  conditions?: Array<Cond>
  logic?: string
  message?: string
}

function resolveField(
  field: string,
  ctx: { amount: number; timestamp: number; receiver: string },
): unknown {
  const [fieldPath, ...transforms] = field.split('|')
  let val: unknown = undefined
  if (fieldPath === 'tx.amount') val = ctx.amount
  else if (fieldPath === 'tx.receiver') val = ctx.receiver
  else if (fieldPath === 'env.timestamp') val = ctx.timestamp
  for (const t of transforms) {
    if (t === 'hour') val = new Date(Number(val) * 1000).getHours()
    else if (t === 'day') {
      const d = new Date(Number(val) * 1000).getDay()
      val = d === 0 ? 7 : d
    } else if (t === 'date') val = new Date(Number(val) * 1000).getDate()
    else if (t === 'month') val = new Date(Number(val) * 1000).getMonth() + 1
    else if (t === 'abs') val = Math.abs(Number(val))
    else if (t.startsWith('div:')) val = Number(val) / Number(t.slice(4))
    else if (t.startsWith('mod:')) val = Number(val) % Number(t.slice(4))
    else if (t === 'lower') val = String(val).toLowerCase()
    else if (t === 'upper') val = String(val).toUpperCase()
    else if (t === 'len') val = String(val).length
  }
  return val
}

function evalCond(
  c: Cond,
  ctx: { amount: number; timestamp: number; receiver: string },
): boolean {
  const lhs = resolveField(c.field, ctx)
  const n = Number(lhs)
  const v = c.value
  switch (c.op) {
    case '>=':
      return n >= Number(v)
    case '<=':
      return n <= Number(v)
    case '>':
      return n > Number(v)
    case '<':
      return n < Number(v)
    case '==':
      return lhs == v
    case '!=':
      return lhs != v
    case 'in':
      return (
        Array.isArray(v) &&
        (v as Array<unknown>).some((x) => Number(x) === n || x === lhs)
      )
    case 'not_in':
      return (
        Array.isArray(v) &&
        !(v as Array<unknown>).some((x) => Number(x) === n || x === lhs)
      )
    case 'between': {
      const [lo, hi] = v as [number, number]
      return n >= lo && n <= hi
    }
    case 'not_between': {
      const [lo, hi] = v as [number, number]
      return !(n >= lo && n <= hi)
    }
    case 'exists':
      return lhs !== undefined && lhs !== null
    case 'not_exists':
      return lhs === undefined || lhs === null
    default:
      return true
  }
}

function evalRule(
  rule: RuleObj,
  ctx: { amount: number; timestamp: number; receiver: string },
): { pass: boolean; reason: string } {
  if (rule.if) {
    const pass = evalCond(rule.if, ctx)
    return {
      pass,
      reason: pass
        ? `${rule.if.field} ${rule.if.op} ${JSON.stringify(rule.if.value)} ✓`
        : (rule.message ??
          `${rule.if.field} ${rule.if.op} ${JSON.stringify(rule.if.value)} ✗`),
    }
  }
  if (rule.conditions?.length) {
    const logic = rule.logic || 'AND'
    const results = rule.conditions.map((c) => evalCond(c, ctx))
    const pass =
      logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
    return {
      pass,
      reason: pass
        ? 'Conditions passed'
        : (rule.message ?? 'Conditions failed'),
    }
  }
  return { pass: true, reason: 'No conditions' }
}

/* ── ABI ── */
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

function buildRuleSetHash(
  ruleNFT: `0x${string}`,
  tokenIds: Array<bigint>,
  version: bigint,
): `0x${string}` {
  const ruleNFTs = Array(tokenIds.length).fill(ruleNFT) as Array<`0x${string}`>
  return keccak256(
    encodePacked(
      ['address[]', 'uint256[]', 'uint64'],
      [ruleNFTs, tokenIds, version],
    ),
  )
}

export default function RulesConsolePage() {
  const p = useV4Palette()
  const chainId = useChainId()
  const chains = useChains()
  const currentChain = chains.find((c) => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'
  const { address, isConnected } = useAccount()
  const { data: myRules = [] } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const { data: sub } = useSubscription(address)
  const { contracts } = usePayIDContext()

  /* ── Write contract ── */
  const {
    writeContract,
    data: registerHash,
    isPending: isRegistering,
    error: registerError,
  } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: registerSuccess } =
    useWaitForTransactionReceipt({ hash: registerHash })

  /* ── Subscribe ── */
  const {
    subscribe,
    isPending: subPending,
    isSuccess: subOk,
    isConfirming: subConfirming,
  } = useSubscribe()
  const { data: subPrice } = useSubscriptionPrice()
  const price = subPrice ? (subPrice as bigint) : parseEther('0.001')

  /* ── Query Chainlink Oracle for ETH/USD price ── */
  const { data: oracleData } = useReadContract({
    address:
      CHAINLINK_ORACLE_ADDRESSES[chainId] || CHAINLINK_ORACLE_ADDRESSES[31337],
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
  })
  const ethUsdPrice = oracleData?.[1]

  /* ── Token Price Oracles for Multi-Token Pricing ── */
  const usdcPriceHook = useTokenPrice('USDC')
  const usdtPriceHook = useTokenPrice('USDT')
  const daiPriceHook = useTokenPrice('DAI')
  const wbtcPriceHook = useTokenPrice('WBTC')
  const linkPriceHook = useTokenPrice('LINK')
  const uniPriceHook = useTokenPrice('UNI')

  /* ── UI state ── */
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null)
  const [activeCartridgeId, setActiveCartridgeId] = useState<string | null>(
    null,
  )
  const [direction, setDirection] = useState<'none' | 'inbound' | 'outbound'>(
    'none',
  )
  const [version, setVersion] = useState('1')
  const [registerStage, setRegisterStage] = useState<
    'idle' | 'registering' | 'done' | 'error'
  >('idle')
  const [txLog, setTxLog] = useState<
    Array<{ time: string; msg: string; type: 'info' | 'ok' | 'err' }>
  >([])

  /* ── Demo test state ── */
  const [demoAmount, setDemoAmount] = useState('100')
  const [demoReceiver, setDemoReceiver] = useState(
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  )
  const [demoResult, setDemoResult] = useState<
    'idle' | 'running' | 'ALLOW' | 'REJECT'
  >('idle')
  const [demoReason, setDemoReason] = useState('')
  const [showDemo, setShowDemo] = useState(false)

  /* ── NFT images + rule details ── */
  const [nftImages, setNftImages] = useState<Record<string, string | undefined>>({})
  const [ruleDetails, setRuleDetails] = useState<
    Record<
      string,
      {
        if?: { field?: string; op?: string; value?: unknown }
        conditions?: Array<{ field: string; op: string; value: unknown }>
        logic?: string
        message?: string
      } | undefined
    >
  >({})
  useEffect(() => {
    async function load() {
      const imgs: Record<string, string> = {}
      const details: Record<
        string,
        {
          if?: { field?: string; op?: string; value?: unknown }
          conditions?: Array<{ field: string; op: string; value: unknown }>
          logic?: string
          message?: string
        } | undefined
      > = {}
      for (const r of myRules) {
        if (!r.uri) continue
        const url = r.uri.replace(
          'ipfs://',
          'https://gateway.pinata.cloud/ipfs/',
        )
        try {
          const res = await fetch(url)
          const meta = await res.json()
          console.log(`[RulesConsole] meta for rule_${r.ruleId}:`, meta)
          if (meta.image) {
            const img = meta.image.startsWith('ipfs://')
              ? meta.image.replace(
                  'ipfs://',
                  'https://gateway.pinata.cloud/ipfs/',
                )
              : meta.image
            imgs[`rule_${r.ruleId.toString()}`] = img
          }
          if (meta.rule) {
            let ruleVal =
              typeof meta.rule === 'string' ? JSON.parse(meta.rule) : meta.rule
            // unwrap extra { rule: {...} } nesting from RulesPage v4
            if (ruleVal?.rule && !ruleVal?.if && !ruleVal?.conditions) {
              ruleVal = ruleVal.rule
            }
            console.log(
              `[RulesConsole] parsed rule for rule_${r.ruleId}:`,
              ruleVal,
            )
            details[`rule_${r.ruleId.toString()}`] = ruleVal
          } else {
            console.log(`[RulesConsole] NO meta.rule for rule_${r.ruleId}`)
          }
        } catch (e) {
          console.error(`[RulesConsole] fetch failed for rule_${r.ruleId}:`, e)
        }
      }
      setNftImages(imgs)
      setRuleDetails(details)
    }
    if (myRules.length > 0) load()
  }, [myRules])

  /* ── Cartridges ── */
  const allRules = myRules
  const availableCartridges: Array<CartridgeData> = allRules.map((r) => ({
    id: `rule_${r.ruleId.toString()}`,
    type: 'minAmount' as CartridgeType,
    name: `Rule #${r.ruleId.toString()}`,
    summary: r.active ? `Token #${r.tokenId.toString()}` : 'INACTIVE',
    image: nftImages[`rule_${r.ruleId.toString()}`],
    ruleHash: r.ruleHash,
    authorityAddress: r.creator,
    active: r.active,
  }))

  /* ── Slots ── */
  const [slots, setSlots] = useState<Array<SlotData>>([
    { id: 'slot_a', label: 'SLOT A', cartridge: undefined },
    { id: 'slot_b', label: 'SLOT B', cartridge: undefined },
    { id: 'slot_c', label: 'SLOT C', cartridge: undefined },
  ])

  const trayCartridges = availableCartridges.filter(
    (c) => !slots.some((s) => s.cartridge?.id === c.id),
  )
  const selectedSlots = slots.filter((s) => s.cartridge)
  const canRegister =
    selectedSlots.length > 0 && isConnected && !isRegistering && !isConfirming

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  )

  /* ── Slot & cartridge handlers ── */
  const handleSlotClick = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot?.cartridge)
      setHighlightedSlot((prev) => (prev === slotId ? null : slotId))
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
    if (!cartridge.active) {
      toast.warning('Rule Inactive', {
        description: `${cartridge.name} loaded — activate first`,
      })
    } else {
      toast.success('Rule Loaded', {
        description: `${cartridge.name} → ${slot?.label}`,
      })
    }
  }

  const handleCartridgeClick = (cartridgeId: string) => {
    if (!highlightedSlot) {
      const empty = slots.find((s) => !s.cartridge)
      if (!empty) {
        toast.error('No Empty Slots', {
          description: 'Remove a cartridge first',
        })
        return
      }
      handleCartridgeDrop(cartridgeId, empty.id)
    } else {
      handleCartridgeDrop(cartridgeId, highlightedSlot)
    }
  }

  /* ── DnD event handlers ── */
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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCartridgeId(null)
      setHighlightedSlot(null)
      if (!over) return
      const cartridgeId = active.id as string
      const overId = over.id as string
      if (overId === 'tray') {
        const src = slots.find((s) => s.cartridge?.id === cartridgeId)
        if (src) handleCartridgeEject(src.id)
        return
      }
      const isFromSlot = slots.some((s) => s.cartridge?.id === cartridgeId)
      if (isFromSlot) {
        const srcSlot = slots.find((s) => s.cartridge?.id === cartridgeId)!
        if (srcSlot.id === overId) return
        setSlots((prev) =>
          prev.map((s) => {
            const src = prev.find((x) => x.id === srcSlot.id)!
            const tgt = prev.find((x) => x.id === overId)!
            if (s.id === srcSlot.id) return { ...s, cartridge: tgt.cartridge }
            if (s.id === overId) return { ...s, cartridge: src.cartridge }
            return s
          }),
        )
        toast.success('Rules Swapped')
      } else {
        handleCartridgeDrop(cartridgeId, overId)
      }
    },
    [slots],
  )

  /* ── Register ── */
  const nowStr = () =>
    new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  const handleRegister = () => {
    const filled = slots.filter((s) => s.cartridge)
    if (filled.length === 0 || !isConnected) return
    const selRules = filled
      .map((s) =>
        allRules.find((r) => `rule_${r.ruleId.toString()}` === s.cartridge!.id),
      )
      .filter(Boolean) as typeof allRules
    if (selRules.length === 0) return
    const unactivated = selRules.filter((r) => r.tokenId === 0n)
    if (unactivated.length > 0) {
      toast.error('Rules Not Activated', {
        description: `Activate rule(s) ${unactivated.map((r) => `#${r.ruleId}`).join(', ')} first`,
      })
      return
    }
    const tokenIds = selRules.map((r) => r.tokenId)
    const ver = BigInt(version || '1')
    const ruleSetHash = buildRuleSetHash(
      contracts.ruleItemERC721,
      tokenIds,
      ver,
    )
    const ruleNFTs = Array(tokenIds.length).fill(
      contracts.ruleItemERC721,
    ) as Array<`0x${string}`>
    setRegisterStage('registering')
    setTxLog((prev) => [
      ...prev,
      { time: nowStr(), msg: '↻ Sending transaction…', type: 'info' },
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
        args: [
          ruleSetHash,
          direction === 'inbound' ? 0 : 1,
          ruleNFTs,
          tokenIds,
          ver,
        ],
      })
    }
  }

  useEffect(() => {
    if (registerSuccess && registerStage === 'registering') {
      setRegisterStage('done')
      setTxLog((prev) => [
        ...prev,
        { time: nowStr(), msg: '✓ Policy registered on-chain', type: 'ok' },
      ])
      toast.success('Policy Registered', {
        description: 'Combined rule is now live',
      })
    }
  }, [registerSuccess, registerStage])

  useEffect(() => {
    if (registerError && registerStage === 'registering') {
      const msg =
        (registerError as { shortMessage?: string }).shortMessage ??
        'Unknown error'
      setRegisterStage('error')
      setTxLog((prev) => [
        ...prev,
        { time: nowStr(), msg: `✗ ${msg}`, type: 'err' },
      ])
      toast.error('Registration Failed', { description: msg })
    }
  }, [registerError, registerStage])

  useEffect(() => {
    if (subOk) {
      toast.success('Subscription active!', {
        description: `You now have ${sub?.maxSlots ?? 3} rule slots.`,
      })
    }
  }, [subOk])

  /* ── Overlay cartridge ── */
  const activeCartridge = activeCartridgeId
    ? (availableCartridges.find((c) => c.id === activeCartridgeId) ??
      slots
        .flatMap((s) => (s.cartridge ? [s.cartridge] : []))
        .find((c) => c.id === activeCartridgeId))
    : null

  /* ── Derived ── */
  const activeCount = myRules.filter((r) => r.active).length

  const card = `rounded-2xl border ${p.cardBorder}`
  const inp = `px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40`

  const stepBadge = (n: number, label: string, done: boolean) => (
    <div
      key={n}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
        done
          ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]'
          : `${p.cardBorder} ${p.textMuted}`
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
          done ? 'bg-[#00D084] text-[#0B0F1A]' : 'bg-current/20'
        }`}
      >
        {n}
      </span>
      {label}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl space-y-6"
    >
      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1
              className={`text-2xl font-bold ${p.textMain} flex items-center gap-2`}
            >
              <Cpu className="w-6 h-6 text-[#8B5CF6]" />
              Rule Console
            </h1>
            <div className="flex items-center justify-between w-full">
              <p className={`text-sm ${p.textMuted} mt-0.5`}>
                Drag &amp; drop rules into slots and register your live payment
                policy
              </p>
              <Link
                to="/v4/app/rules/builder"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-white text-xs font-semibold hover:bg-[#8B5CF6]/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Rule
              </Link>
            </div>
          </div>
          {isConnected && (
            <div
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border ${p.cardBorder} text-xs ${p.textMuted}`}
              style={{ backgroundColor: p.cardBg }}
            >
              <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                {sub?.isActive
                  ? `Pro · ${myRules.length}/${sub.maxSlots}`
                  : `Free · ${myRules.length}/1`}
              </span>
            </div>
          )}
        </div>

        {/* Step badges */}
        {isConnected && (
          <div className="flex flex-wrap gap-2">
            {stepBadge(1, 'Build Rule', true)}
            {stepBadge(2, 'Deploy NFT', myRules.length > 0)}
            {stepBadge(
              3,
              'Activate',
              myRules.some((r) => r.tokenId > 0n),
            )}
            {stepBadge(4, 'Go Live', !!activeCombined?.hash)}
          </div>
        )}

        {/* Stats row */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Active Rules',
                value: activeCount.toString(),
                color: '#00D084',
              },
              {
                label: 'Total Rules',
                value: myRules.length.toString(),
                color: '#0EA5E9',
              },
              {
                label: 'Policy',
                value: activeCombined?.hash ? 'Live' : 'Off',
                color: activeCombined?.hash ? '#00D084' : '#F59E0B',
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`${card} p-4`}
                style={{ backgroundColor: p.cardBg }}
              >
                <p
                  className="text-2xl font-bold font-mono"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
                <p className={`text-[11px] mt-0.5 ${p.textMuted}`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Connect wallet prompt ── */}
      {!isConnected && (
        <div
          className={`${card} p-6 flex items-center gap-3`}
          style={{ backgroundColor: p.cardBg }}
        >
          <Info className={`w-5 h-5 shrink-0 ${p.textMuted}`} />
          <p className={`text-sm ${p.textMuted}`}>
            Connect your wallet to load rules and manage your policy.
          </p>
        </div>
      )}

      {/* ── MAIN: Two-column layout ── */}
      {isConnected && (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            {/* LEFT: Console + Tray */}
            <div className="flex flex-col items-center gap-2">
              {/* v4 card shell around the console */}
              <div
                className={`${card} p-4 w-full flex flex-col items-center gap-3`}
                style={{ backgroundColor: p.cardBg }}
              >
                <p
                  className={`text-[10px] font-mono uppercase tracking-widest ${p.textMuted} self-start`}
                >
                  Policy Engine · 3-Slot
                </p>
                <GameConsole
                  slots={slots}
                  highlightedSlot={highlightedSlot}
                  txLog={txLog}
                  onSlotClick={handleSlotClick}
                  onCartridgeEject={handleCartridgeEject}
                />
                <p
                  className={`text-[9px] font-mono uppercase tracking-wider ${p.textMuted} opacity-50`}
                >
                  drag to slot · drop on tray to eject · tap to quick-insert
                </p>
              </div>

              {/* Tray */}
              <div className="w-full">
                <CartridgeTray
                  cartridges={trayCartridges}
                  onCartridgeClick={handleCartridgeClick}
                />
              </div>

              {/* Token Price Info — Multi-Token Pricing */}
              <div
                  className={`${card} p-4 w-full space-y-3`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#00D084]" />
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${p.textMuted}`}
                    >
                      Token Prices (USD)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div
                      className="flex justify-between items-center p-2 rounded"
                      style={{ background: p.bgElevated }}
                    >
                      <span className={p.textMuted}>USDC</span>
                      <span className={p.textMain}>
                        {usdcPriceHook.priceInUsd
                          ? usdcPriceHook.formatUsd(usdcPriceHook.priceInUsd)
                          : 'Loading...'}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center p-2 rounded"
                      style={{ background: p.bgElevated }}
                    >
                      <span className={p.textMuted}>USDT</span>
                      <span className={p.textMain}>
                        {usdtPriceHook.priceInUsd
                          ? usdtPriceHook.formatUsd(usdtPriceHook.priceInUsd)
                          : 'Loading...'}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center p-2 rounded"
                      style={{ background: p.bgElevated }}
                    >
                      <span className={p.textMuted}>DAI</span>
                      <span className={p.textMain}>
                        {daiPriceHook.priceInUsd
                          ? daiPriceHook.formatUsd(daiPriceHook.priceInUsd)
                          : 'Loading...'}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center p-2 rounded"
                      style={{ background: p.bgElevated }}
                    >
                      <span className={p.textMuted}>WBTC</span>
                      <span className={p.textMain}>
                        {wbtcPriceHook.priceInUsd
                          ? wbtcPriceHook.formatUsd(wbtcPriceHook.priceInUsd)
                          : 'Loading...'}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center p-2 rounded"
                      style={{ background: p.bgElevated }}
                    >
                      <span className={p.textMuted}>LINK</span>
                      <span className={p.textMain}>
                        {linkPriceHook.priceInUsd
                          ? linkPriceHook.formatUsd(linkPriceHook.priceInUsd)
                          : 'Loading...'}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center p-2 rounded"
                      style={{ background: p.bgElevated }}
                    >
                      <span className={p.textMuted}>UNI</span>
                      <span className={p.textMain}>
                        {uniPriceHook.priceInUsd
                          ? uniPriceHook.formatUsd(uniPriceHook.priceInUsd)
                          : 'Loading...'}
                      </span>
                    </div>
                  </div>
                </div>

              {/* Additional Slots — Subscription Manager */}
              <div
                  className={`${card} p-4 w-full space-y-3`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#F59E0B]" />
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${p.textMuted}`}
                    >
                      Additional Slots
                    </p>
                    <span
                      className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        sub?.isActive
                          ? 'bg-[#00D084]/10 text-[#00D084]'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {sub?.isActive ? 'Pro' : 'Free'}
                    </span>
                  </div>

                  {/* Slot usage */}
                  <div className="flex items-center gap-3">
                    {[...Array(sub?.maxSlots ?? 1)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-full transition-colors ${
                          i < myRules.length
                            ? 'bg-[#00D084]'
                            : 'bg-[#00D084]/20'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] ${p.textMuted}`}>
                      {myRules.length} of {sub?.maxSlots ?? 1} slot
                      {sub?.maxSlots !== 1 ? 's' : ''} used
                    </p>
                    {!sub?.isActive && (
                      <p className="text-[10px] text-amber-400">
                        Free tier = 1 slot
                      </p>
                    )}
                  </div>

                  {/* Upgrade / Extend */}
                  {!sub?.isActive ? (
                    <button
                      onClick={() => subscribe(price)}
                      disabled={subPending || subConfirming}
                      className="w-full py-2.5 rounded-xl bg-[#F59E0B] text-black text-xs font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {subPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                          Confirm in wallet…
                        </>
                      ) : subConfirming ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                          Waiting…
                        </>
                      ) : (
                        <>
                          <Crown className="w-3.5 h-3.5" /> Unlock 3 Slots —{' '}
                          {formatPriceWithUSD(price, nativeSymbol, ethUsdPrice)}{' '}
                          / 30d
                        </>
                      )}
                    </button>
                  ) : (
                    <div
                      className={`p-3 rounded-xl border ${p.cardBorder} space-y-1`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-[11px] ${p.textMuted}`}>
                          Subscription active
                        </p>
                        <span className="text-[10px] text-[#00D084] font-medium">
                          {sub.maxSlots} slots
                        </span>
                      </div>
                      {sub.expiry ? (
                        <p className={`text-[10px] ${p.textMuted}`}>
                          Expires{' '}
                          {new Date(
                            Number(sub.expiry) * 1000,
                          ).toLocaleDateString()}
                        </p>
                      ) : null}
                      <button
                        onClick={() => subscribe(price)}
                        disabled={subPending || subConfirming}
                        className="w-full mt-1 py-2 rounded-lg border border-[#00D084]/30 text-[#00D084] text-[11px] font-semibold hover:bg-[#00D084]/5 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {subPending || subConfirming ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> Renew Subscription
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
            </div>

            {/* RIGHT: Policy info + Register panel */}
            <div className="space-y-4">
              {/* Active policy detail */}
              {activeCombined?.hash ? (
                <div
                  className={`${card} overflow-hidden border-[#00D084]/30`}
                  style={{ backgroundColor: 'rgba(0,208,132,0.03)' }}
                >
                  <div className="px-4 py-3 border-b border-[#00D084]/15">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
                      <span className="text-sm font-semibold text-[#00D084]">
                        Active Policy
                      </span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/15 text-[#00D084] font-semibold">
                        ● Live
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Policy hash */}
                    <div>
                      <p
                        className={`text-[10px] font-medium ${p.textMuted} mb-0.5`}
                      >
                        Policy hash
                      </p>
                      <p className="text-[11px] font-mono text-[#00D084] truncate">
                        {activeCombined.hash}
                      </p>
                    </div>
                    {/* Direction */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${p.textMuted}`}>
                        Direction:
                      </span>
                      <span className="text-[11px] font-medium text-[#00D084]">
                        {activeCombined.direction === 0
                          ? 'Inbound'
                          : activeCombined.direction === 1
                            ? 'Outbound'
                            : 'Both'}
                      </span>
                    </div>
                    {/* Rules list */}
                    <div className="space-y-1.5">
                      <p className={`text-[10px] font-medium ${p.textMuted}`}>
                        {activeCombined.ruleRefs.length} rule
                        {activeCombined.ruleRefs.length !== 1 ? 's' : ''}{' '}
                        enforced:
                      </p>
                      {activeCombined.ruleRefs.map((ref, idx) => {
                        const rule = myRules.find(
                          (r) => r.tokenId === ref.tokenId,
                        )
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${p.cardBorder}`}
                            style={{
                              backgroundColor: p.dark
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.02)',
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-[#00D084]/10 text-[#00D084] flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              {rule ? (
                                <>
                                  <p
                                    className={`text-[11px] font-medium ${p.textMain}`}
                                  >
                                    Rule #{rule.ruleId.toString()}
                                  </p>
                                  <p className="text-[10px] font-mono text-[#00D084]/70 truncate">
                                    {rule.ruleHash.slice(0, 20)}…
                                  </p>
                                </>
                              ) : (
                                <p
                                  className={`text-[11px] font-mono ${p.textMuted}`}
                                >
                                  Token #{ref.tokenId.toString()}
                                </p>
                              )}
                            </div>
                            {rule?.active && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className={`text-[10px] ${p.textMuted}`}>
                      v{activeCombined.version.toString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={`${card} p-4`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className={`text-sm font-semibold ${p.textMain}`}>
                      No Active Policy
                    </span>
                  </div>
                  <p className={`text-[11px] ${p.textMuted} mt-1`}>
                    Load rules into the console and register to go live.
                  </p>
                </div>
              )}

              {/* Loaded slots summary */}
              <div
                className={`${card} p-4 space-y-3`}
                style={{ backgroundColor: p.cardBg }}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wide ${p.textMuted}`}
                >
                  Loaded Slots
                  {selectedSlots.length > 0 && (
                    <span className="ml-1 text-[#8B5CF6]">
                      ({selectedSlots.length}/3)
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors ${
                        slot.cartridge
                          ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/5'
                          : `${p.cardBorder}`
                      }`}
                    >
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider w-10 shrink-0 ${
                          slot.cartridge ? 'text-[#8B5CF6]' : p.textMuted
                        }`}
                      >
                        {slot.label}
                      </span>
                      {slot.cartridge ? (
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[12px] font-medium ${p.textMain} truncate`}
                          >
                            {slot.cartridge.name}
                          </p>
                          <p
                            className={`text-[10px] font-mono ${p.textMuted} truncate`}
                          >
                            {slot.cartridge.ruleHash?.slice(0, 20)}…
                          </p>
                          {(() => {
                            const d = ruleDetails[slot.cartridge.id]
                            console.log(
                              `[RulesConsole] render slot ${slot.label}, cartridge.id=${slot.cartridge.id}, detail=`,
                              d,
                              'ruleDetails keys=',
                              Object.keys(ruleDetails),
                            )
                            if (!d) return null
                            const simple = d.if as
                              | { field?: string; op?: string; value?: unknown }
                              | undefined
                            const cond = simple?.field
                              ? `${simple.field} ${simple.op} ${JSON.stringify(simple.value)}`
                              : d.conditions && d.conditions.length > 0
                                ? d.conditions
                                    .map(
                                      (c) =>
                                        `${c.field} ${c.op} ${JSON.stringify(c.value)}`,
                                    )
                                    .join(` ${d.logic || 'AND'} `)
                                : d.message || null
                            console.log(
                              `[RulesConsole] cond for ${slot.label}:`,
                              cond,
                            )
                            return cond ? (
                              <p className="text-[10px] font-mono text-[#8B5CF6] truncate mt-0.5">
                                {cond}
                              </p>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        <p className={`text-[11px] ${p.textMuted} italic`}>
                          empty
                        </p>
                      )}
                      {slot.cartridge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium shrink-0">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Register panel — shown only when slots have cartridges */}
              {selectedSlots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${card} overflow-hidden`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <div
                    className="flex items-center gap-3 px-5 py-4 border-b"
                    style={{
                      borderColor: p.dark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.06)',
                      background: p.dark
                        ? 'rgba(139,92,246,0.06)'
                        : 'rgba(139,92,246,0.04)',
                    }}
                  >
                    <span className="w-7 h-7 rounded-full bg-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${p.textMain}`}>
                        Register Policy
                      </p>
                      <p className={`text-[11px] ${p.textMuted}`}>
                        {selectedSlots.length} rule(s) selected
                      </p>
                    </div>
                    <Zap className="w-4 h-4 text-[#8B5CF6]" />
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Direction + Version */}
                    <div className="flex gap-2">
                      <select
                        value={direction}
                        onChange={(e) =>
                          setDirection(
                            e.target.value as 'none' | 'inbound' | 'outbound',
                          )
                        }
                        className={`flex-1 ${inp}`}
                      >
                        <option value="none">Both directions</option>
                        <option value="inbound">Inbound only</option>
                        <option value="outbound">Outbound only</option>
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] ${p.textMuted}`}>v</span>
                        <input
                          type="number"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          min={1}
                          className={`w-14 ${inp} text-center`}
                        />
                      </div>
                    </div>

                    {/* ── Demo / Test Rules ── */}
                    <div
                      className={`rounded-xl border ${p.cardBorder} overflow-hidden`}
                    >
                      <button
                        onClick={() => setShowDemo((v) => !v)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${p.dark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-[#8B5CF6]" />
                          <span
                            className={`text-xs font-semibold ${p.textMain}`}
                          >
                            Test Rules Before Registering
                          </span>
                        </div>
                        <span className={`text-[10px] ${p.textMuted}`}>
                          {showDemo ? 'Hide' : 'Show'}
                        </span>
                      </button>

                      {showDemo && (
                        <div
                          className="px-4 pb-4 space-y-3 border-t"
                          style={{
                            borderColor: p.dark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.06)',
                          }}
                        >
                          <p className={`text-[11px] ${p.textMuted} pt-3`}>
                            Simulate a transaction to preview how your selected
                            rules would evaluate.
                          </p>

                          {/* Selected rules summary */}
                          <div className="space-y-1.5">
                            {selectedSlots.map((s) => (
                              <div
                                key={s.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] border ${p.cardBorder}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
                                <span className={`font-medium ${p.textMain}`}>
                                  {s.cartridge!.name}
                                </span>
                                <span className={`${p.textMuted} ml-auto`}>
                                  {s.cartridge!.summary}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Test inputs */}
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label
                                className={`block text-[10px] font-medium ${p.textMuted} mb-1`}
                              >
                                Amount (wei)
                              </label>
                              <input
                                type="text"
                                value={demoAmount}
                                onChange={(e) => setDemoAmount(e.target.value)}
                                className={`w-full ${inp}`}
                                placeholder="1000000000000000000"
                              />
                            </div>
                            <div className="flex-2">
                              <label
                                className={`block text-[10px] font-medium ${p.textMuted} mb-1`}
                              >
                                Receiver
                              </label>
                              <input
                                type="text"
                                value={demoReceiver}
                                onChange={(e) =>
                                  setDemoReceiver(e.target.value)
                                }
                                className={`w-full ${inp}`}
                                placeholder="0x..."
                              />
                            </div>
                          </div>

                          {/* Run test button */}
                          <button
                            onClick={() => {
                              setDemoResult('running')
                              setTimeout(() => {
                                const amt = parseFloat(demoAmount) || 0
                                const ctx = {
                                  amount: amt,
                                  timestamp: Math.floor(Date.now() / 1000),
                                  receiver: demoReceiver,
                                }
                                let rejected = false
                                let rejectReason = ''
                                for (const s of selectedSlots) {
                                  const d = ruleDetails[s.cartridge!.id] as
                                    | RuleObj
                                    | undefined
                                  if (!d) continue
                                  const { pass, reason } = evalRule(d, ctx)
                                  if (!pass) {
                                    rejected = true
                                    rejectReason = reason
                                    break
                                  }
                                }
                                if (rejected) {
                                  setDemoResult('REJECT')
                                  setDemoReason(rejectReason)
                                } else {
                                  setDemoResult('ALLOW')
                                  setDemoReason(
                                    'All selected rules passed (simulated)',
                                  )
                                }
                              }, 300)
                            }}
                            disabled={demoResult === 'running'}
                            className="w-full py-2 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#8B5CF6] text-xs font-semibold hover:bg-[#8B5CF6]/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {demoResult === 'running' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                                Evaluating…
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" /> Run Test
                              </>
                            )}
                          </button>

                          {/* Result */}
                          {demoResult === 'ALLOW' && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00D084]/10 border border-[#00D084]/30">
                              <ShieldCheck className="w-4 h-4 text-[#00D084] shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-[#00D084]">
                                  ALLOW
                                </p>
                                <p className="text-[10px] text-[#00D084]/80">
                                  {demoReason}
                                </p>
                              </div>
                            </div>
                          )}
                          {demoResult === 'REJECT' && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">
                              <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-[#EF4444]">
                                  REJECT
                                </p>
                                <p className="text-[10px] text-[#EF4444]/80">
                                  {demoReason}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status message */}
                    {registerStage !== 'idle' && (
                      <p
                        className={`text-xs text-center font-medium ${
                          registerStage === 'done'
                            ? 'text-[#00D084]'
                            : registerStage === 'error'
                              ? 'text-[#EF4444]'
                              : p.textMuted
                        }`}
                      >
                        {registerStage === 'registering' &&
                          'Registering on-chain…'}
                        {registerStage === 'done' && '✓ Policy registered!'}
                        {registerStage === 'error' && '✗ Registration failed'}
                      </p>
                    )}

                    <button
                      onClick={handleRegister}
                      disabled={!canRegister}
                      className="w-full py-3 rounded-xl bg-[#8B5CF6] text-white font-semibold text-sm hover:bg-[#8B5CF6]/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isRegistering || isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />{' '}
                          Registering…
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" /> Register Combined Policy
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* My Rules list */}
              {myRules.length > 0 && (
                <div
                  className={`${card} p-4 space-y-3`}
                  style={{ backgroundColor: p.cardBg }}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wide ${p.textMuted}`}
                  >
                    My Rules ({myRules.length})
                  </p>
                  <div className="space-y-2">
                    {myRules.map((r) => (
                      <div
                        key={r.ruleId.toString()}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${p.cardBorder}`}
                        style={{ backgroundColor: p.cardBg }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[13px] font-medium ${p.textMain}`}
                          >
                            Rule #{r.ruleId.toString()}
                          </p>
                          <p
                            className={`text-[10px] font-mono ${p.textMuted} truncate`}
                          >
                            {r.ruleHash.slice(0, 28)}…
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            r.tokenId > 0n
                              ? 'bg-[#00D084]/10 text-[#00D084]'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {r.tokenId > 0n ? '✓ Active' : 'Not activated'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DragOverlay */}
          <DragOverlay dropAnimation={null}>
            {activeCartridge ? (
              <div
                style={{
                  transform: 'scale(1.08)',
                  filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.55))',
                }}
              >
                <RuleCartridge
                  id={activeCartridge.id}
                  type={activeCartridge.type}
                  name={activeCartridge.name}
                  summary={activeCartridge.summary}
                  image={activeCartridge.image}
                  isActive
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </motion.div>
  )
}
