import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  Gamepad2,
  Plus,
  RefreshCw,
  Hash,
  Trash2,
  Copy,
  Check,
  Terminal,
  Braces,
  Code2,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  Sparkles,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import {
  useMyRules,
  useActiveCombinedRule,
  useSubscription,
  useCreateRule,
  useActivateRule,
} from 'payid-react'
import { motion, AnimatePresence } from 'framer-motion'
import { keccak256, stringToBytes } from 'viem'
import { WalletButton } from '@/components/WalletButton'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/Layouts/MobileLayout'

function shortAddr(addr?: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
}

/* ─── Rule Engine Constants (from SDK) ─── */

const CONTEXT_NAMESPACES = [
  'tx.amount',
  'tx.token',
  'tx.sender',
  'tx.receiver',
  'tx.data',
  'payId.owner',
  'payId.ruleHash',
  'intent.amount',
  'intent.currency',
  'intent.recipient',
  'env.chainId',
  'env.timestamp',
  'oracle.ethUsd',
  'risk.score',
  'risk.category',
  'state.spentToday',
  'state.dailyLimit',
]

const TRANSFORMS = [
  { label: '— none —', value: '' },
  { label: 'div:N (divide)', value: 'div' },
  { label: 'mod:N (modulo)', value: 'mod' },
  { label: 'abs (absolute)', value: 'abs' },
  { label: 'hour (of day)', value: 'hour' },
  { label: 'day (of week)', value: 'day' },
  { label: 'date (of month)', value: 'date' },
  { label: 'month (of year)', value: 'month' },
  { label: 'len (length)', value: 'len' },
  { label: 'lower (lowercase)', value: 'lower' },
  { label: 'upper (uppercase)', value: 'upper' },
]

const OPERATORS = [
  { label: '>=', value: '>=' },
  { label: '<=', value: '<=' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '==', value: '==' },
  { label: '!=', value: '!=' },
  { label: 'in (set)', value: 'in' },
  { label: 'not_in (set)', value: 'not_in' },
  { label: 'between (range)', value: 'between' },
  { label: 'not_between (range)', value: 'not_between' },
  { label: 'mod_eq', value: 'mod_eq' },
  { label: 'mod_ne', value: 'mod_ne' },
  { label: 'contains', value: 'contains' },
  { label: 'not_contains', value: 'not_contains' },
  { label: 'starts_with', value: 'starts_with' },
  { label: 'ends_with', value: 'ends_with' },
  { label: 'exists', value: 'exists' },
  { label: 'not_exists', value: 'not_exists' },
  { label: 'regex', value: 'regex' },
  { label: 'not_regex', value: 'not_regex' },
]

const ARRAY_OPS = new Set(['in', 'not_in', 'between', 'not_between', 'mod_eq', 'mod_ne'])
const NO_VALUE_OPS = new Set(['exists', 'not_exists'])

/* ─── Types ─── */

type RuleFormat = 'simple' | 'multi' | 'nested'

interface Condition {
  field: string
  transform: string
  transformArg: string
  op: string
  value: string
}

interface RuleDraft {
  id: string
  comment: string
  format: RuleFormat
  logic: 'AND' | 'OR'
  conditions: Condition[]
  childRules: RuleDraft[]
  message: string
}

/* ─── Helpers ─── */

function buildFieldExpr(field: string, transform: string, transformArg: string): string {
  if (!transform) return field
  return `${field}|${transform}${transformArg ? ':' + transformArg : ''}`
}

function parseValue(value: string, op: string): any {
  if (NO_VALUE_OPS.has(op)) return undefined
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (ARRAY_OPS.has(op)) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed.split(',').map((s) => s.trim())
    }
  }
  if (trimmed.startsWith('$')) return trimmed
  if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed)
  return trimmed
}

function draftToJson(draft: RuleDraft): any {
  const base: any = { id: draft.id }
  if (draft.comment) base._comment = draft.comment

  if (draft.format === 'simple') {
    const c = draft.conditions[0]
    if (!c) return base
    return {
      ...base,
      if: {
        field: buildFieldExpr(c.field, c.transform, c.transformArg),
        op: c.op,
        value: parseValue(c.value, c.op),
      },
      message: draft.message,
    }
  }

  if (draft.format === 'multi') {
    return {
      ...base,
      logic: draft.logic,
      conditions: draft.conditions
        .filter((c) => c.field && c.op)
        .map((c) => ({
          field: buildFieldExpr(c.field, c.transform, c.transformArg),
          op: c.op,
          value: parseValue(c.value, c.op),
        })),
      message: draft.message,
    }
  }

  // nested
  return {
    ...base,
    logic: draft.logic,
    rules: draft.childRules.map(draftToJson).filter(Boolean),
    message: draft.message,
  }
}

function canonicalizeKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(canonicalizeKeys)
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = canonicalizeKeys(obj[k])
        return acc
      }, {} as any)
  }
  return obj
}

function makeCondition(): Condition {
  return { field: 'tx.amount', transform: '', transformArg: '', op: '>=', value: '' }
}

function makeDraft(): RuleDraft {
  return {
    id: 'rule_001',
    comment: '',
    format: 'simple',
    logic: 'AND',
    conditions: [makeCondition()],
    childRules: [],
    message: 'Transaction rejected by policy',
  }
}

/* ─── Image Generator ─── */

function genImage(ruleId: string, ruleHash: string): string {
  const c = document.createElement('canvas')
  c.width = 480
  c.height = 480
  const ctx = c.getContext('2d')!

  const g = ctx.createLinearGradient(0, 0, 480, 480)
  g.addColorStop(0, '#060a06')
  g.addColorStop(1, '#0a1a0a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 480, 480)

  for (let y = 0; y < 480; y += 4) {
    ctx.fillStyle = 'rgba(0,255,127,0.012)'
    ctx.fillRect(0, y, 480, 2)
  }

  ctx.strokeStyle = '#004d26'
  ctx.lineWidth = 1.5
  ctx.strokeRect(16, 16, 448, 448)
  ;[
    [16, 16],
    [464, 16],
    [16, 464],
    [464, 464],
  ].forEach(([x, y]) => {
    ctx.strokeStyle = '#00ff7f'
    ctx.lineWidth = 1.5
    const dx = x === 16 ? 1 : -1
    const dy = y === 16 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(x, y + dy * 18)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * 18, y)
    ctx.stroke()
  })

  ctx.fillStyle = '#00ff7f'
  ctx.font = 'bold 22px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('PAY.ID', 240, 64)
  ctx.fillStyle = '#2d4d2d'
  ctx.font = '10px monospace'
  ctx.fillText('PROGRAMMABLE PAYMENT RULE', 240, 82)
  ctx.strokeStyle = '#1a2e1a'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, 96)
  ctx.lineTo(440, 96)
  ctx.stroke()

  ctx.fillStyle = '#004d26'
  ctx.font = 'bold 108px monospace'
  ctx.fillText('◈', 240, 242)
  ctx.fillStyle = 'rgba(0,255,127,0.07)'
  ctx.font = 'bold 112px monospace'
  ctx.fillText('◈', 240, 242)

  ctx.fillStyle = '#d4f5d4'
  ctx.font = 'bold 19px monospace'
  ctx.fillText(ruleId.toUpperCase().slice(0, 22), 240, 300)
  ctx.fillStyle = '#6b9b6b'
  ctx.font = '11px monospace'
  ctx.fillText('RULE NFT', 240, 320)

  ctx.strokeStyle = '#1a2e1a'
  ctx.beginPath()
  ctx.moveTo(40, 378)
  ctx.lineTo(440, 378)
  ctx.stroke()

  ctx.fillStyle = '#243824'
  ctx.font = '9px monospace'
  ctx.fillText(ruleHash.slice(0, 24) + '...', 240, 400)
  ctx.fillStyle = '#1a2e1a'
  ctx.font = '9px monospace'
  ctx.fillText('payid.rule.v1', 240, 452)

  return c.toDataURL('image/png')
}

/* ─── Pinata helpers ─── */

const getJWT = () => (import.meta.env.VITE_PINATA_JWT as string | undefined) ?? ''
const getGateway = () =>
  ((import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ?? 'https://gateway.pinata.cloud').replace(/\/$/, '')

async function pinJson(data: unknown, name: string) {
  const jwt = getJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const fd = new FormData()
  fd.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }), name)
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Pinata JSON upload failed: ${await res.text()}`)
  const { data: { cid } } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getGateway()}/ipfs/${cid}` }
}

async function pinImage(dataUrl: string, name: string) {
  const jwt = getJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const mime = dataUrl.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: mime }), name)
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Pinata image upload failed: ${await res.text()}`)
  const { data: { cid } } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getGateway()}/ipfs/${cid}` }
}

/* ─── Sub-components ─── */

function ConditionRow({
  c,
  idx,
  onChange,
  onRemove,
  removable,
}: {
  c: Condition
  idx: number
  onChange: (i: number, patch: Partial<Condition>) => void
  onRemove: (i: number) => void
  removable: boolean
}) {
  const [showTransform, setShowTransform] = useState(false)
  const needsValue = !NO_VALUE_OPS.has(c.op)

  return (
    <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
      <div className="flex items-center gap-2">
        {/* Field */}
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Field
          </label>
          <input
            list="ctx-fields"
            value={c.field}
            onChange={(e) => onChange(idx, { field: e.target.value })}
            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
          <datalist id="ctx-fields">
            {CONTEXT_NAMESPACES.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        {/* Transform toggle */}
        <button
          onClick={() => setShowTransform((v) => !v)}
          className={cn(
            'mt-4 px-2 py-1 rounded text-[10px] font-mono border transition-colors',
            showTransform || c.transform
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600',
          )}
        >
          |pipe
        </button>
      </div>

      <AnimatePresence>
        {showTransform && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <select
                value={c.transform}
                onChange={(e) => onChange(idx, { transform: e.target.value })}
                className="px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                {TRANSFORMS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {c.transform && c.transform !== 'abs' && !['hour', 'day', 'date', 'month', 'len', 'lower', 'upper'].includes(c.transform) && (
                <input
                  type="text"
                  value={c.transformArg}
                  onChange={(e) => onChange(idx, { transformArg: e.target.value })}
                  placeholder="N"
                  className="w-16 px-2 py-1.5 rounded border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              pipe: {buildFieldExpr(c.field, c.transform, c.transformArg)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        {/* Operator */}
        <div className="w-24">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            OP
          </label>
          <select
            value={c.op}
            onChange={(e) => onChange(idx, { op: e.target.value })}
            className="w-full px-1 py-1.5 rounded border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            {OPERATORS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value */}
        {needsValue && (
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              VALUE
            </label>
            <input
              type="text"
              value={c.value}
              onChange={(e) => onChange(idx, { value: e.target.value })}
              placeholder={ARRAY_OPS.has(c.op) ? '[10, 100] or a, b' : '0'}
              className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        )}

        {removable && (
          <button
            onClick={() => onRemove(idx)}
            className="mt-4 p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Rule Card (with image) ─── */

function RuleCard({
  rule,
  myAddress,
  onActivate,
}: {
  rule: any
  myAddress: `0x${string}` | undefined
  onActivate: () => void
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)
  const { activateRule, isPending: isActivating, isSuccess: activateSuccess } = useActivateRule()

  useEffect(() => {
    if (!rule.uri) return
    setImgLoading(true)
    const url = rule.uri.startsWith('ipfs://')
      ? `https://gateway.pinata.cloud/ipfs/${rule.uri.slice(7)}`
      : rule.uri
    fetch(url)
      .then((r) => r.json())
      .then((meta) => {
        const img = meta?.image
        if (img) {
          setImgUrl(
            img.startsWith('ipfs://')
              ? `https://gateway.pinata.cloud/ipfs/${img.slice(7)}`
              : img
          )
        }
      })
      .catch(() => setImgUrl(null))
      .finally(() => setImgLoading(false))
  }, [rule.uri])

  useEffect(() => {
    if (activateSuccess) {
      onActivate()
    }
  }, [activateSuccess, onActivate])

  const isMine = myAddress?.toLowerCase() === rule.creator?.toLowerCase()

  return (
    <div className="module-card p-4 rounded-xl">
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
          {imgLoading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          ) : imgUrl ? (
            <img
              src={imgUrl}
              alt={`Rule #${rule.ruleId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span className="text-slate-300 text-lg">◈</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Rule #{rule.ruleId.toString()}
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
              )}
            >
              {rule.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-600 truncate">
            {rule.ruleHash?.slice(0, 14)}...{rule.ruleHash?.slice(-6)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {rule.uri || '—'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {!rule.active && isMine && (
              <button
                onClick={() => activateRule(rule.ruleId)}
                disabled={isActivating}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-semibold',
                  'bg-amber-100 text-amber-700 hover:bg-amber-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isActivating ? '...' : '⚡ Activate'}
              </button>
            )}
            <span className="text-[10px] text-slate-400">
              Token #{rule.tokenId.toString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─── */

type MintStage =
  | 'idle'
  | 'uploading'
  | 'creating'
  | 'activating'
  | 'done'
  | 'error'

export default function RuleBuilder() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const { data: myRules = [], isLoading, refetch } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const { data: sub } = useSubscription(address)
  const { createRule, isPending: isCreating, isSuccess: createSuccess, error: createError } = useCreateRule()

  const [draft, setDraft] = useState<RuleDraft>(makeDraft)
  const [copied, setCopied] = useState(false)
  const [showJson, setShowJson] = useState(true)

  // NFT metadata
  const [nftName, setNftName] = useState('PAY.ID Rule NFT')
  const [nftDesc, setNftDesc] = useState('PAY.ID programmable payment policy')
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Mint flow
  const [stage, setStage] = useState<MintStage>('idle')
  const [stageMsg, setStageMsg] = useState('')

  const activeCount = myRules.filter((r) => r.active).length
  const isSubActive = sub?.isActive ?? false
  const hasPinata = !!getJWT()

  // ── JSON + Hash ──
  const ruleJson = useMemo(() => {
    const root = draftToJson(draft)
    const canonical = canonicalizeKeys(root)
    return JSON.stringify(canonical, null, 2)
  }, [draft])

  const ruleHash = useMemo(() => {
    return keccak256(stringToBytes(ruleJson))
  }, [ruleJson])

  // ── Condition helpers ──
  const updateCondition = useCallback(
    (i: number, patch: Partial<Condition>) => {
      setDraft((prev) => {
        const next = { ...prev, conditions: [...prev.conditions] }
        next.conditions[i] = { ...next.conditions[i], ...patch }
        return next
      })
    },
    [],
  )

  const addCondition = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      conditions: [...prev.conditions, makeCondition()],
    }))
  }, [])

  const removeCondition = useCallback((i: number) => {
    setDraft((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, idx) => idx !== i),
    }))
  }, [])

  // ── Image handling ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImgDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleGenerateImage = () => {
    setImgDataUrl(genImage(draft.id, ruleHash))
  }

  // ── Full mint flow ──
  const handleMint = async () => {
    if (!isConnected || !hasPinata) return
    setStage('uploading')
    setStageMsg('Uploading image + metadata to IPFS...')
    try {
      // 1. Image
      const imgToPin = imgDataUrl ?? genImage(draft.id, ruleHash)
      const { url: imageURL } = await pinImage(imgToPin, `rule-${draft.id}.png`)

      // 2. Metadata
      const c0 = draft.conditions[0]
      const opLabel = c0?.op ?? '?'
      const metadata = {
        name: nftName || `PAY.ID Rule — ${draft.id}`,
        description: nftDesc || 'PAY.ID programmable payment policy',
        image: imageURL,
        attributes: [
          { trait_type: 'Rule ID', value: draft.id },
          { trait_type: 'Engine', value: 'PAY.ID' },
          { trait_type: 'Category', value: 'Transaction Rule' },
          { trait_type: 'Operator', value: opLabel },
        ],
        rule: JSON.parse(ruleJson),
        ruleHash,
        standard: 'payid.rule.v1',
      }
      const { cid } = await pinJson(metadata, `rule-${draft.id}.json`)
      const tokenURI = `ipfs://${cid}`

      // 3. Create rule on-chain
      setStage('creating')
      setStageMsg('Sending createRule() — confirm in wallet...')
      createRule({ ruleHash: ruleHash as `0x${string}`, uri: tokenURI })
    } catch (e: unknown) {
      const err = e as { message?: string }
      setStage('error')
      setStageMsg(err.message ?? 'Upload failed')
    }
  }

  // Watch create success → invalidate + refetch
  useEffect(() => {
    if (createSuccess && stage === 'creating') {
      setStage('done')
      setStageMsg('Rule created! Your new rule should appear below.')
      // Invalidate all rule-related queries so nextRuleId + getRule refetch
      queryClient.invalidateQueries({ queryKey: [{ entity: 'rule' }] })
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      void refetch()
    }
  }, [createSuccess, stage, refetch, queryClient])

  useEffect(() => {
    if (createError) {
      setStage('error')
      setStageMsg((createError as { shortMessage?: string }).shortMessage ?? 'createRule failed')
    }
  }, [createError])

  const handleCopy = () => {
    navigator.clipboard.writeText(ruleJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isMinting = stage === 'uploading' || stage === 'creating' || isCreating

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top pb-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 py-4"
        >
          <Link to="/">
            <button className="btn-tactile p-2.5 -ml-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Rule Builder
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? shortAddr(address) : 'Connect wallet'}
            </p>
          </div>
          <WalletButton />
        </motion.header>

        {/* Status Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mt-2 grid grid-cols-3 gap-3"
        >
          <div className="module-card p-3 rounded-xl text-center">
            <p className="text-xl font-bold text-foreground">{myRules.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
              Total
            </p>
          </div>
          <div className="module-card p-3 rounded-xl text-center">
            <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
              Active
            </p>
          </div>
          <div className={cn(
            'module-card p-3 rounded-xl text-center',
            activeCombined ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200',
          )}>
            <p className={cn('text-xl font-bold', activeCombined ? 'text-teal-600' : 'text-slate-500')}>
              {activeCombined ? 'On' : 'Off'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
              Policy
            </p>
          </div>
        </motion.div>

        {/* Rule Console Link */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-4"
        >
          <Link to="/rules/console">
            <button className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 transition-all group btn-tactile">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-slate-300" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-slate-100">Rule Console</p>
                  <p className="text-xs text-slate-400">Visual cartridge manager</p>
                </div>
                <div className="text-slate-400 group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </button>
          </Link>
        </motion.section>

        {/* ── RULE EDITOR ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Edit Rule
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              {draft.format.toUpperCase()}
            </span>
          </div>

          <div className="module-card rounded-xl overflow-hidden border border-slate-200">
            {/* ID + Comment */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    ID *
                  </label>
                  <input
                    value={draft.id}
                    onChange={(e) => setDraft((p) => ({ ...p, id: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Comment
                  </label>
                  <input
                    value={draft.comment}
                    onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))}
                    placeholder="What this rule does"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Format tabs */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(
                  [
                    { key: 'simple', label: 'Simple (IF)' },
                    { key: 'multi', label: 'Multi (AND/OR)' },
                    { key: 'nested', label: 'Nested' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        format: tab.key,
                        conditions:
                          tab.key === 'nested'
                            ? []
                            : p.conditions.length === 0
                              ? [makeCondition()]
                              : p.conditions,
                      }))
                    }
                    className={cn(
                      'flex-1 py-1.5 text-[11px] font-medium transition-colors',
                      draft.format === tab.key
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditions / Child Rules */}
            <div className="p-4 space-y-3">
              {draft.format !== 'nested' && (
                <>
                  {draft.format === 'multi' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Logic</span>
                      <div className="flex rounded border border-slate-200 overflow-hidden">
                        {(['AND', 'OR'] as const).map((l) => (
                          <button
                            key={l}
                            onClick={() => setDraft((p) => ({ ...p, logic: l }))}
                            className={cn(
                              'px-3 py-1 text-[11px] font-semibold transition-colors',
                              draft.logic === l
                                ? 'bg-slate-800 text-white'
                                : 'bg-white text-slate-500 hover:bg-slate-50',
                            )}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {draft.conditions.map((c, i) => (
                    <ConditionRow
                      key={i}
                      c={c}
                      idx={i}
                      onChange={updateCondition}
                      onRemove={removeCondition}
                      removable={draft.conditions.length > 1}
                    />
                  ))}

                  <button
                    onClick={addCondition}
                    className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-medium hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Condition
                  </button>
                </>
              )}

              {draft.format === 'nested' && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <p>Nested rule builder coming soon.</p>
                  <p className="mt-1">Use Simple or Multi for now.</p>
                </div>
              )}
            </div>

            {/* Deny Message */}
            <div className="px-4 pb-4">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Deny Message
              </label>
              <input
                value={draft.message}
                onChange={(e) => setDraft((p) => ({ ...p, message: e.target.value }))}
                placeholder="Shown to sender when rule rejects"
                className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </motion.section>

        {/* ── JSON PREVIEW ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-5"
        >
          <button
            onClick={() => setShowJson((v) => !v)}
            className="flex items-center justify-between w-full mb-2"
          >
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
              <Braces className="w-4 h-4" />
              JSON Preview
            </h2>
            <ChevronDown
              className={cn('w-4 h-4 text-slate-400 transition-transform', showJson && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {showJson && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <pre className="bg-slate-900 text-emerald-400 text-[11px] font-mono p-3 rounded-xl overflow-x-auto leading-relaxed">
                    {ruleJson}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Hash */}
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Keccak256 Hash
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-700 break-all">{ruleHash}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── NFT METADATA ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
          className="mt-5"
        >
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            NFT Metadata
          </h2>
          <div className="module-card p-4 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  NFT Name
                </label>
                <input
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                  placeholder="PAY.ID Rule NFT"
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <input
                  value={nftDesc}
                  onChange={(e) => setNftDesc(e.target.value)}
                  placeholder="Programmable payment policy"
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Image */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Image
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              {imgDataUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={imgDataUrl} alt="preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setImgDataUrl(null)}
                    className="absolute top-2 right-2 p-1 rounded bg-black/40 hover:bg-black/60 text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 py-6 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-medium hover:border-teal-400 hover:text-teal-600 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="w-5 h-5" />
                    Drop or click to upload
                  </button>
                  <button
                    onClick={handleGenerateImage}
                    className="flex-1 py-6 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-medium hover:border-teal-400 hover:text-teal-600 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Sparkles className="w-5 h-5" />
                    Auto-generate
                  </button>
                </div>
              )}
            </div>

            {!hasPinata && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <p className="font-medium">Pinata not configured</p>
                <p className="text-amber-600/80 mt-0.5">
                  Add VITE_PINATA_JWT to .env to auto-upload metadata to IPFS.
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {/* ── SUBMIT ON-CHAIN ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mt-5"
        >
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Submit On-Chain
          </h2>
          <div className="module-card p-4 rounded-xl space-y-3">
            {/* Stage indicator */}
            {stage !== 'idle' && (
              <div className={cn(
                'p-3 rounded-lg text-xs font-medium text-center',
                stage === 'done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : stage === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200',
              )}>
                <div className="flex items-center justify-center gap-2">
                  {stage !== 'done' && stage !== 'error' && (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {stage === 'uploading' && 'Uploading to IPFS...'}
                  {stage === 'creating' && 'Creating Rule NFT — confirm in wallet...'}
                  {stage === 'done' && 'Rule created successfully!'}
                  {stage === 'error' && stageMsg}
                </div>
                {stage === 'done' && stageMsg && (
                  <p className="text-[10px] text-emerald-600/70 mt-1">{stageMsg}</p>
                )}
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isMinting || !isConnected || !hasPinata}
              className={cn(
                'w-full h-11 rounded-xl btn-tactile font-semibold text-sm text-white',
                'bg-teal-600 hover:bg-teal-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isMinting ? 'Processing...' : 'Create Rule NFT'}
            </button>

            {!isConnected && (
              <p className="text-center text-xs text-slate-500">Connect wallet to create rule</p>
            )}
          </div>
        </motion.section>

        {/* ── MY RULES ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              My Rule NFTs
            </h2>
            <button
              onClick={() => void refetch()}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {isLoading && (
            <div className="py-12 text-center">
              <div className="w-8 h-8 mx-auto border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-sm text-slate-500 mt-3">Loading rules...</p>
            </div>
          )}

          {!isLoading && myRules.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No rules yet</p>
              <p className="text-sm text-slate-400 mt-1">Build and submit your first rule above</p>
            </div>
          )}

          {!isLoading && myRules.length > 0 && (
            <div className="space-y-3">
              {myRules.map((rule) => (
                <RuleCard
                  key={rule.ruleId.toString()}
                  rule={rule}
                  myAddress={address}
                  onActivate={() => {
                    queryClient.invalidateQueries({ queryKey: [{ entity: 'rule' }] })
                    queryClient.invalidateQueries({ queryKey: ['readContract'] })
                    void refetch()
                  }}
                />
              ))}
            </div>
          )}
        </motion.section>

        {/* Subscription CTA */}
        {!isSubActive && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="mt-6 mb-6"
          >
            <Link to="/subscription">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center cursor-pointer hover:bg-amber-100 transition-colors">
                <p className="text-sm font-semibold text-amber-800">Upgrade to Pro</p>
                <p className="text-xs text-amber-600/80 mt-1">Create more rules with subscription</p>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  )
}
