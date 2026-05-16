import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  Image as ImageIcon,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
  Zap,
} from 'lucide-react'
import { useAccount, useChains, useReadContract } from 'wagmi'
import {
  useActivateRule,
  useActiveCombinedRule,
  useCreateRule,
  useMyRules,
  usePayIDContext,
  useSubscribe,
  useSubscription,
  useSubscriptionPrice,
} from 'payid-react'
import { keccak256, parseEther, stringToBytes } from 'viem'
import { CHAINLINK_ORACLE_ADDRESSES, CHAINLINK_ORACLE_ABI } from '../../constants/oracles'

// Utility to format price nicely
const formatPrice = (priceWei: bigint): string => {
  const price = Number(priceWei) / 1e18
  if (price < 0.0001) return price.toFixed(8)
  if (price < 0.01) return price.toFixed(6)
  if (price < 1) return price.toFixed(4)
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Utility to format price with USD equivalent
// Query Chainlink oracle for real-time ETH/USD price
const formatPriceWithUSD = (priceWei: bigint, nativeSymbol: string, ethUsdPrice?: bigint): string => {
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
import { toast } from 'sonner'
import { useV4Palette } from './theme'
import PremiumButton from './PremiumButton'

/* ── Image Generator ── */
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

/* ── Pinata helpers ── */
const getPinataJWT = () =>
  (import.meta.env.VITE_PINATA_JWT as string | undefined) ?? ''
const getPinataGW = () =>
  (
    (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ??
    'https://gateway.pinata.cloud'
  ).replace(/\/$/, '')

async function pinImage(
  dataUrl: string,
  name: string,
): Promise<{ cid: string; url: string }> {
  const jwt = getPinataJWT()
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
  if (!res.ok)
    throw new Error(`Pinata image upload failed: ${await res.text()}`)
  const {
    data: { cid },
  } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getPinataGW()}/ipfs/${cid}` }
}

async function pinJson(
  data: unknown,
  name: string,
): Promise<{ cid: string; url: string }> {
  const jwt = getPinataJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const fd = new FormData()
  fd.append(
    'file',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
    name,
  )
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Pinata upload failed: ${await res.text()}`)
  const {
    data: { cid },
  } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getPinataGW()}/ipfs/${cid}` }
}

/* ── 0G Storage helpers (used when chainId === 16601) ── */
const get0GIndexer = () =>
  (
    (import.meta.env.VITE_ZGS_INDEXER_URL as string | undefined) ??
    'https://indexer-storage-testnet-turbo.0g.ai'
  ).replace(/\/$/, '')
const get0GRpc = () =>
  (import.meta.env.VITE_ZGS_RPC_URL as string | undefined) ??
  'https://evmrpc-testnet.0g.ai'
const get0GGateway = () =>
  (
    (import.meta.env.VITE_ZGS_INDEXER_URL as string | undefined) ??
    'https://indexer-storage-testnet-turbo.0g.ai'
  ).replace(/\/$/, '')

async function upload0G(
  data: Uint8Array,
): Promise<{ rootHash: string; url: string }> {
  const { MemData, Indexer } = await import('@0gfoundation/0g-storage-ts-sdk')
  const { BrowserProvider } = await import('ethers')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum
  if (!eth) throw new Error('No injected wallet found')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(eth)
  const signer = await provider.getSigner()
  const indexer = new Indexer(get0GIndexer())
  const memData = new MemData(data)
  const [tree, treeErr] = await memData.merkleTree()
  if (treeErr) throw new Error(`0G merkle error: ${treeErr}`)
  const rootHash = (tree as { rootHash: () => string }).rootHash()
  const [, uploadErr] = await indexer.upload(memData, get0GRpc(), signer)
  if (uploadErr) throw new Error(`0G upload error: ${uploadErr}`)
  return { rootHash, url: `${get0GGateway()}/file?root=${rootHash}` }
}

/* ── URI → HTTP helper (ipfs:// | 0g:// | http) ── */
function uriToHttp(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return `${getPinataGW()}/ipfs/${uri.slice(7)}`
  if (uri.startsWith('0g://'))
    return `${get0GGateway()}/file?root=${uri.slice(5)}`
  return uri
}

/* ── Rule thumbnail — fetches metadata, shows NFT image ── */
function RuleImage({ uri, className }: { uri: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!uri) return
    fetch(uriToHttp(uri))
      .then((r) => r.json())
      .then((meta) => {
        if (meta.image) setSrc(uriToHttp(meta.image))
      })
      .catch(() => {})
  }, [uri])
  if (!src)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Shield className={className ?? 'w-8 h-8 text-[#00D084]/20'} />
      </div>
    )
  return (
    <img
      src={src}
      alt="rule"
      className="absolute inset-0 w-full h-full object-cover"
    />
  )
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

type DeployStage = 'idle' | 'uploading' | 'creating' | 'done' | 'error'

/* ── Context field suggestions (datalist) ── */
const CTX_FIELDS = [
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
  'oracle.kycLevel',
  'oracle.country',
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
  { label: 'len (str length)', value: 'len' },
  { label: 'lower (lowercase)', value: 'lower' },
  { label: 'upper (uppercase)', value: 'upper' },
]

const OPS = [
  { v: '>=', label: '>=' },
  { v: '<=', label: '<=' },
  { v: '>', label: '>' },
  { v: '<', label: '<' },
  { v: '==', label: '==' },
  { v: '!=', label: '!=' },
  { v: 'in', label: 'in (set)' },
  { v: 'not_in', label: 'not_in (set)' },
  { v: 'between', label: 'between (range)' },
  { v: 'not_between', label: 'not_between' },
  { v: 'mod_eq', label: 'mod_eq' },
  { v: 'mod_ne', label: 'mod_ne' },
  { v: 'contains', label: 'contains' },
  { v: 'not_contains', label: 'not_contains' },
  { v: 'starts_with', label: 'starts_with' },
  { v: 'ends_with', label: 'ends_with' },
  { v: 'exists', label: 'exists' },
  { v: 'not_exists', label: 'not_exists' },
  { v: 'regex', label: 'regex' },
  { v: 'not_regex', label: 'not_regex' },
]
const NO_VAL = new Set(['exists', 'not_exists'])
const ARR_OPS = new Set([
  'in',
  'not_in',
  'between',
  'not_between',
  'mod_eq',
  'mod_ne',
])
const NO_ARG = new Set([
  'abs',
  'hour',
  'day',
  'date',
  'month',
  'len',
  'lower',
  'upper',
])

type RuleFormat = 'simple' | 'multi' | 'nested'

interface Cond {
  field: string
  transform: string
  transformArg: string
  op: string
  value: string
}

function makeBlank(): Cond {
  return {
    field: 'tx.amount',
    transform: '',
    transformArg: '',
    op: '>=',
    value: '',
  }
}

function buildFieldExpr(c: Cond) {
  if (!c.transform) return c.field
  return `${c.field}|${c.transform}${c.transformArg ? ':' + c.transformArg : ''}`
}

function parseVal(op: string, v: string): unknown {
  if (NO_VAL.has(op)) return undefined
  if (ARR_OPS.has(op)) {
    try {
      return JSON.parse(v)
    } catch {
      return v.split(',').map((s) => s.trim())
    }
  }
  if (!isNaN(Number(v)) && v.trim() !== '') return Number(v)
  return v
}

function buildJson(
  conds: Array<Cond>,
  format: RuleFormat,
  logic: 'AND' | 'OR',
  id: string,
  comment: string,
  message: string,
) {
  const base: Record<string, unknown> = { id: id || 'rule_001' }
  if (comment) base._comment = comment
  if (format === 'simple') {
    const c = conds[0]
    if (!c) return base
    return {
      ...base,
      if: {
        field: buildFieldExpr(c),
        op: c.op,
        value: parseVal(c.op, c.value),
      },
      message,
    }
  }
  if (format === 'multi') {
    return {
      ...base,
      logic,
      conditions: conds
        .filter((c) => c.field && c.op)
        .map((c) => ({
          field: buildFieldExpr(c),
          op: c.op,
          value: parseVal(c.op, c.value),
        })),
      message,
    }
  }
  return { ...base, logic, rules: [], message }
}

/* ── Starter templates ── */
const TEMPLATES = [
  {
    label: 'Spending Limit',
    desc: 'Block payments above a certain amount',
    icon: '💰',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'tx.amount',
        transform: '',
        transformArg: '',
        op: '<=',
        value: '1000000',
      },
    ],
    unit: 'USDC',
    inputType: 'number' as const,
  },
  {
    label: 'Business Hours',
    desc: 'Only allow payments during work hours',
    icon: '🕐',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'env.timestamp',
        transform: 'hour',
        transformArg: '',
        op: 'between',
        value: '[9,17]',
      },
    ],
    unit: 'hour',
    inputType: 'range' as const,
  },
  {
    label: 'Weekdays Only',
    desc: 'Block payments on weekends',
    icon: '📅',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'env.timestamp',
        transform: 'day',
        transformArg: '',
        op: 'in',
        value: '[1,2,3,4,5]',
      },
    ],
    unit: 'days',
    inputType: 'days' as const,
  },
  {
    label: 'KYC Required',
    desc: 'Require identity verification above a level',
    icon: '🪪',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'oracle.kycLevel',
        transform: '',
        transformArg: '',
        op: '>=',
        value: '1',
      },
    ],
    unit: 'level',
    inputType: 'number' as const,
  },
  {
    label: 'Low Risk Only',
    desc: 'Block high-risk transactions',
    icon: '🛡',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'risk.score',
        transform: '',
        transformArg: '',
        op: '<=',
        value: '50',
      },
    ],
    unit: 'score',
    inputType: 'number' as const,
  },
  {
    label: 'Indonesia Only',
    desc: 'Only allow payments from Indonesia',
    icon: '🇮🇩',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'oracle.country',
        transform: 'lower',
        transformArg: '',
        op: '==',
        value: 'id',
      },
    ],
    unit: '',
    inputType: 'none' as const,
  },
  {
    label: 'USD Minimum',
    desc: 'Require minimum USD value regardless of token',
    icon: '💵',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'oracle.txValueUsd',
        transform: '',
        transformArg: '',
        op: '>=',
        value: '4500000000',
      },
    ],
    unit: 'USD',
    inputType: 'usd' as const,
  },
  {
    label: 'Whitelist Sender',
    desc: 'Only allow payments from a specific address',
    icon: '🔐',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'tx.sender',
        transform: '',
        transformArg: '',
        op: '==',
        value: '0x0000000000000000000000000000000000000000',
      },
    ],
    unit: '',
    inputType: 'address' as const,
  },
  {
    label: 'Chain Guard',
    desc: 'Only allow payments on this chain',
    icon: '⛓',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'tx.chainId',
        transform: '',
        transformArg: '',
        op: '==',
        value: '31337',
      },
    ],
    unit: '',
    inputType: 'chain' as const,
  },
  {
    label: 'QR Payments Only',
    desc: 'Only allow QR code payments',
    icon: '📱',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'intent.type',
        transform: '',
        transformArg: '',
        op: '==',
        value: 'QR',
      },
    ],
    unit: '',
    inputType: 'none' as const,
  },
  {
    label: 'Daily Budget',
    desc: 'Block if daily spending limit exceeded',
    icon: '📊',
    fmt: 'multi' as RuleFormat,
    conds: [
      {
        field: 'state.spentToday',
        transform: '',
        transformArg: '',
        op: '<=',
        value: '50000000',
      },
      {
        field: 'state.dailyLimit',
        transform: '',
        transformArg: '',
        op: 'exists',
        value: '',
      },
    ],
    unit: 'USDC',
    inputType: 'number' as const,
  },
  {
    label: 'PayID Owner',
    desc: 'Only allow payments to specific PayID owner',
    icon: '🆔',
    fmt: 'simple' as RuleFormat,
    conds: [
      {
        field: 'payId.owner',
        transform: '',
        transformArg: '',
        op: '==',
        value: '0x0000000000000000000000000000000000000000',
      },
    ],
    unit: '',
    inputType: 'address' as const,
  },
]

function canonicalize(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(canonicalize)
  if (o && typeof o === 'object')
    return Object.keys(o)
      .sort()
      .reduce((a: Record<string, unknown>, k) => {
        a[k] = canonicalize((o as Record<string, unknown>)[k])
        return a
      }, {})
  return o
}

function plain(c: Cond): string {
  const expr = buildFieldExpr(c)
  if (NO_VAL.has(c.op)) return `${expr} ${c.op}`
  return `${expr} ${c.op} ${c.value}`
}

export default function RulesPage() {
  const { address, isConnected, chainId } = useAccount()
  const chains = useChains()
  const currentChain = chains.find(c => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'
  const is0G = chainId === 16601
  const { data: myRules = [], refetch: refetchMyRules } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const { data: sub, refetch: refetchSub } = useSubscription(address)
  const { contracts } = usePayIDContext()
  const p = useV4Palette()

  /* ── Query Chainlink Oracle for ETH/USD price ── */
  const { data: oracleData } = useReadContract({
    address: CHAINLINK_ORACLE_ADDRESSES[chainId ?? 31337] || CHAINLINK_ORACLE_ADDRESSES[31337],
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
  })
  const ethUsdPrice = oracleData?.[1] as bigint | undefined

  /* ── Builder state ── */
  const [conds, setConds] = useState<Array<Cond>>([makeBlank()])
  const [format, setFormat] = useState<RuleFormat>('simple')
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND')
  const [ruleName, setRuleName] = useState('rule_001')
  const [ruleComment, setRuleComment] = useState('')
  const [denyMsg, setDenyMsg] = useState('Transaction rejected by policy')
  const [simpleMode, setSimpleMode] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [openPipes, setOpenPipes] = useState<Set<number>>(new Set())
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deployStage, setDeployStage] = useState<DeployStage>('idle')
  const [deployMsg, setDeployMsg] = useState('')
  const { createRule, isSuccess: created, error: createErr } = useCreateRule()

  /* ── NFT metadata state ── */
  const [nftName, setNftName] = useState('PAY.ID Rule NFT')
  const [nftDesc, setNftDesc] = useState('PAY.ID programmable payment policy')
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Activate state ── */
  const [activateId, setActivateId] = useState('')
  const {
    activateRule,
    isPending: activatingPending,
    isConfirming: activatingConfirming,
    isSuccess: activated,
    error: activateErr,
  } = useActivateRule()
  const activating = activatingPending || activatingConfirming
  const [activateStatus, setActivateStatus] = useState<
    'idle' | 'done' | 'error'
  >('idle')
  const [activateMsg, setActivateMsg] = useState('')

  /* ── Subscribe ── */
  const {
    subscribe,
    isPending: subPending,
    isSuccess: subOk,
    isConfirming: subConfirming,
  } = useSubscribe()

  const { data: subPrice } = useSubscriptionPrice()

  const activeCount = myRules.filter((r) => r.active).length

  /* ── Computed ── */
  const ruleJson = useMemo(() => {
    const obj = buildJson(conds, format, logic, ruleName, ruleComment, denyMsg)
    return JSON.stringify(canonicalize({ rule: obj }), null, 2)
  }, [conds, format, logic, ruleName, ruleComment, denyMsg])

  const ruleHash = useMemo(() => keccak256(stringToBytes(ruleJson)), [ruleJson])

  const summary = useMemo(() => {
    const parts = conds.filter((c) => c.field && c.op).map(plain)
    if (!parts.length) return 'Add at least one condition'
    if (format === 'simple') return `BLOCK if: ${parts[0]}`
    return `BLOCK if: ${parts.join(` ${logic} `)}`
  }, [conds, format, logic])

  /* ── Handlers ── */
  const updateCond = useCallback(
    (i: number, patch: Partial<Cond>) =>
      setConds((prev) => {
        const n = [...prev]
        n[i] = { ...n[i], ...patch } as Cond
        return n
      }),
    [],
  )

  const copyJson = () => {
    navigator.clipboard.writeText(ruleJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImgDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleDeploy = async () => {
    if (!isConnected) return
    if (!is0G && !getPinataJWT()) {
      setDeployStage('error')
      setDeployMsg(
        'Add VITE_PINATA_JWT to your .env file to enable auto-upload.',
      )
      return
    }
    setDeployStage('uploading')
    setDeployMsg(
      is0G ? 'Uploading to 0G Storage…' : 'Uploading image + metadata to IPFS…',
    )
    try {
      const imgToPin = imgDataUrl ?? genImage(ruleName, ruleHash)
      let imageURL: string
      let tokenUri: string

      if (is0G) {
        /* ── 0G Storage path (Optimized Parallel) ── */
        const imgBytes = dataUrlToUint8Array(imgToPin)
        
        // Calculate image hash locally first (fast)
        const { MemData } = await import('@0gfoundation/0g-storage-ts-sdk')
        const imgMem = new MemData(imgBytes)
        const [imgTree, imgTreeErr] = await imgMem.merkleTree()
        if (imgTreeErr) throw new Error(`0G merkle error: ${imgTreeErr}`)
        const imgRootHash = (imgTree as { rootHash: () => string }).rootHash()
        imageURL = `${get0GGateway()}/file?root=${imgRootHash}`

        const metadata = {
          name: nftName || `PAY.ID Rule — ${ruleName}`,
          description: nftDesc || denyMsg,
          image: imageURL,
          attributes: [
            { trait_type: 'Rule ID', value: ruleName },
            { trait_type: 'Engine', value: 'PAY.ID' },
            { trait_type: 'Standard', value: 'payid.rule.v1' },
            { trait_type: 'Storage', value: '0G' },
          ],
          rule:
            (JSON.parse(ruleJson) as { rule: unknown }).rule ??
            JSON.parse(ruleJson),
          ruleHash,
          standard: 'payid.rule.v1',
        }
        
        const jsonBytes = new TextEncoder().encode(JSON.stringify(metadata))
        
        // Upload both in parallel
        setDeployMsg('Uploading assets to 0G Storage in parallel...')
        const [_imgRes, jsonRes] = await Promise.all([
          upload0G(imgBytes),
          upload0G(jsonBytes)
        ])
        
        tokenUri = jsonRes.url
      } else {
        /* ── Pinata / IPFS path ── */
        const { url: imgUrl } = await pinImage(imgToPin, `rule-${ruleName}.png`)
        imageURL = imgUrl

        const metadata = {
          name: nftName || `PAY.ID Rule — ${ruleName}`,
          description: nftDesc || denyMsg,
          image: imageURL,
          attributes: [
            { trait_type: 'Rule ID', value: ruleName },
            { trait_type: 'Engine', value: 'PAY.ID' },
            { trait_type: 'Standard', value: 'payid.rule.v1' },
          ],
          rule:
            (JSON.parse(ruleJson) as { rule: unknown }).rule ??
            JSON.parse(ruleJson),
          ruleHash,
          standard: 'payid.rule.v1',
        }
        const { url: jsonUrl } = await pinJson(
          metadata,
          `rule-${ruleName}.json`,
        )
        tokenUri = jsonUrl
      }

      setDeployStage('creating')
      setDeployMsg('Confirm the transaction in your wallet…')
      createRule({ ruleHash, uri: tokenUri })
    } catch (e: unknown) {
      setDeployStage('error')
      setDeployMsg((e as { message?: string }).message ?? 'Upload failed')
    }
  }

  useEffect(() => {
    if (created && deployStage === 'creating') {
      setDeployStage('done')
      setDeployMsg('Rule NFT created! It will appear in My Rules below.')
      toast.success('Rule NFT created!', {
        description: 'Refreshing your rules list…',
      })
      refetchMyRules()
    }
  }, [created, deployStage])

  useEffect(() => {
    if (createErr && deployStage === 'creating') {
      setDeployStage('error')
      const msg =
        (createErr as { shortMessage?: string }).shortMessage ??
        'Transaction failed'
      setDeployMsg(msg)
      toast.error('Create rule failed', { description: msg })
    }
  }, [createErr, deployStage])

  useEffect(() => {
    if (activated) {
      toast.success('Rule activated!', {
        description: 'NFT license minted. Policy is now enforced.',
      })
      setActivateStatus('done')
      setActivateMsg('✓ Rule activated! NFT license minted.')
      refetchMyRules()
    }
  }, [activated])

  useEffect(() => {
    if (activateErr) {
      const msg =
        (activateErr as { shortMessage?: string }).shortMessage ??
        'Transaction failed'
      toast.error('Activation failed', { description: msg })
      setActivateStatus('error')
      setActivateMsg(msg)
    }
  }, [activateErr])

  useEffect(() => {
    if (subOk) {
      toast.success('Subscription active!', {
        description: 'You can now activate rule NFTs.',
      })
      refetchSub()
    }
  }, [subOk])

  const card = `rounded-2xl border ${p.cardBorder}`
  const inp = `px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`
  const stepBadge = (n: number, label: string, done: boolean) => (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
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
      className="max-w-3xl space-y-5"
    >
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${p.textMain}`}>Rule Builder</h1>
            <p className={`text-sm ${p.textMuted} mt-0.5`}>
              Build, deploy, and activate payment policies
            </p>
          </div>
          {isConnected && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${p.cardBorder} text-xs ${p.textMuted}`}
              style={{ backgroundColor: p.cardBg }}
            >
              <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                {sub?.isActive
                  ? `Pro · ${myRules.length}/${sub.maxSlots} slots`
                  : `Free · ${myRules.length}/1 slot`}
              </span>
              {!sub?.isActive && (
                <button
                  onClick={() => subscribe((subPrice as bigint | undefined) ?? parseEther('0.001'))}
                  disabled={subPending || subConfirming}
                  className="ml-1 px-2.5 py-0.5 rounded-lg bg-[#F59E0B] text-black font-semibold disabled:opacity-50 text-[11px]"
                >
                  {subPending || subConfirming ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Upgrade'
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step flow */}
        {isConnected && (
          <div className="flex flex-wrap gap-2">
            {stepBadge(
              1,
              'Build Rule',
              conds.some((c) => c.field && c.value),
            )}
            {stepBadge(2, 'Deploy NFT', myRules.length > 0)}
            {stepBadge(
              3,
              'Activate',
              myRules.some((r) => r.tokenId > 0n),
            )}
          </div>
        )}
      </div>

      {/* Stats */}
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

      {/* ───── STEP 1: BUILD RULE ───── */}
      <div
        className={`${card} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        {/* Section header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{
            borderColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            background: p.dark
              ? 'rgba(0,208,132,0.06)'
              : 'rgba(0,208,132,0.04)',
          }}
        >
          <span className="w-7 h-7 rounded-full bg-[#00D084] text-[#0B0F1A] font-bold text-sm flex items-center justify-center shrink-0">
            1
          </span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${p.textMain}`}>
              Build Your Rule
            </p>
            <p className={`text-[11px] ${p.textMuted}`}>
              Define the conditions that guard your payments
            </p>
          </div>
          <button
            onClick={() => setSimpleMode((v) => !v)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-colors shrink-0 ${
              simpleMode
                ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/30'
                : `${p.cardBorder} ${p.textMuted}`
            }`}
          >
            {simpleMode ? 'Simple' : 'Advanced'}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Templates */}
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${p.textMuted} mb-2.5`}
            >
              {simpleMode
                ? 'What do you want to guard against?'
                : 'Start from a template'}
            </p>
            <div
              className={`grid gap-3 ${simpleMode ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3'}`}
            >
              {TEMPLATES.map((t) => {
                const isSelected = selectedTemplate === t.label
                return (
                  <button
                    key={t.label}
                    onClick={() => {
                      setSelectedTemplate(t.label)
                      setConds(t.conds.map((c) => ({ ...c })))
                      setFormat(t.fmt)
                      setRuleName(t.label.toLowerCase().replace(/ /g, '_'))
                      setOpenPipes(new Set())
                    }}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border text-left transition-all ${
                      simpleMode ? 'p-4' : 'px-2 py-3 items-center text-center'
                    } ${
                      isSelected
                        ? 'border-[#00D084]/50 bg-[#00D084]/5'
                        : `${p.cardBorder} ${p.textMain} hover:border-[#00D084]/30 hover:bg-[#00D084]/3`
                    }`}
                  >
                    <span className={simpleMode ? 'text-3xl' : 'text-xl'}>
                      {t.icon}
                    </span>
                    <span
                      className={`font-semibold ${simpleMode ? 'text-sm' : 'text-[11px]'}`}
                    >
                      {t.label}
                    </span>
                    {simpleMode && (
                      <span className="text-[11px] opacity-70 leading-relaxed">
                        {t.desc}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {!simpleMode && (
            <>
              {/* ID + Comment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                  >
                    ID *
                  </label>
                  <input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="rule_001"
                    className={`${inp} w-full font-mono`}
                  />
                </div>
                <div>
                  <label
                    className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                  >
                    Comment
                  </label>
                  <input
                    value={ruleComment}
                    onChange={(e) => setRuleComment(e.target.value)}
                    placeholder="What this rule does"
                    className={`${inp} w-full`}
                  />
                </div>
              </div>

              {/* Format tabs */}
              <div
                className={`flex rounded-xl overflow-hidden border ${p.cardBorder}`}
              >
                {(['simple', 'multi', 'nested'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFormat(f)
                      if (f === 'simple')
                        setConds((prev) => [prev[0] ?? makeBlank()])
                    }}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      format === f
                        ? 'bg-[#00D084] text-[#0B0F1A]'
                        : p.dark
                          ? 'bg-white/5 text-white/40 hover:text-white/70'
                          : 'bg-black/3 text-black/30 hover:text-black/60'
                    }`}
                  >
                    {f === 'simple'
                      ? 'Simple (IF)'
                      : f === 'multi'
                        ? 'Multi (AND/OR)'
                        : 'Nested'}
                  </button>
                ))}
              </div>

              {/* Logic — multi only */}
              {format === 'multi' && (
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-medium ${p.textMuted}`}>
                    Logic:
                  </span>
                  {(['AND', 'OR'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLogic(l)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        logic === l
                          ? 'bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]'
                          : `${p.cardBorder} ${p.textMuted}`
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                  <span className={`text-[11px] ${p.textMuted}`}>
                    {logic === 'AND' ? '— all must pass' : '— any one passes'}
                  </span>
                </div>
              )}

              {/* Conditions */}
              {format !== 'nested' ? (
                <div className="space-y-3">
                  <datalist id="v4-ctx-fields">
                    {CTX_FIELDS.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                  {conds.map((c, i) => {
                    const isNoVal = NO_VAL.has(c.op)
                    const isArr = ARR_OPS.has(c.op)
                    const pipeOpen = openPipes.has(i)
                    const needsArg = c.transform && !NO_ARG.has(c.transform)
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${p.cardBorder} space-y-2`}
                        style={{
                          backgroundColor: p.dark
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.015)',
                        }}
                      >
                        {/* Field + |pipe + remove */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono ${p.textMuted} w-6 shrink-0 text-center`}
                          >
                            {format === 'multi'
                              ? i === 0
                                ? 'IF'
                                : logic
                              : 'IF'}
                          </span>
                          <input
                            list="v4-ctx-fields"
                            value={c.field}
                            onChange={(e) =>
                              updateCond(i, { field: e.target.value })
                            }
                            placeholder="tx.amount"
                            className={`flex-1 ${inp} font-mono text-xs`}
                          />
                          <button
                            onClick={() =>
                              setOpenPipes((prev) => {
                                const n = new Set(prev)
                                n.has(i) ? n.delete(i) : n.add(i)
                                return n
                              })
                            }
                            className={`px-2 py-1.5 rounded-lg text-xs font-mono border transition-colors shrink-0 ${
                              pipeOpen || c.transform
                                ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]'
                                : `${p.cardBorder} ${p.textMuted} hover:border-[#00D084]/30`
                            }`}
                          >
                            |pipe
                          </button>
                          {(format === 'multi' || conds.length > 1) && (
                            <button
                              onClick={() => {
                                setConds((prev) =>
                                  prev.filter((_, x) => x !== i),
                                )
                                setOpenPipes(
                                  (prev) =>
                                    new Set(
                                      [...prev]
                                        .filter((x) => x !== i)
                                        .map((x) => (x > i ? x - 1 : x)),
                                    ),
                                )
                              }}
                              className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Transform (collapsible) */}
                        <AnimatePresence>
                          {pipeOpen && (
                            <motion.div
                              key="pipe"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-2 pt-1">
                                <select
                                  value={c.transform}
                                  onChange={(e) =>
                                    updateCond(i, {
                                      transform: e.target.value,
                                      transformArg: '',
                                    })
                                  }
                                  className={`${inp} text-xs font-mono`}
                                >
                                  {TRANSFORMS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                                {needsArg && (
                                  <input
                                    value={c.transformArg}
                                    onChange={(e) =>
                                      updateCond(i, {
                                        transformArg: e.target.value,
                                      })
                                    }
                                    placeholder="N"
                                    className={`w-16 ${inp} text-xs font-mono`}
                                  />
                                )}
                              </div>
                              {c.transform && (
                                <p
                                  className={`text-[10px] font-mono mt-1 ${p.textMuted}`}
                                >
                                  → {buildFieldExpr(c)}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {/* OP + Value */}
                        <div className="flex gap-2">
                          <select
                            value={c.op}
                            onChange={(e) =>
                              updateCond(i, { op: e.target.value, value: '' })
                            }
                            className={`${inp} text-xs font-mono`}
                          >
                            {OPS.map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {!isNoVal && (
                            <input
                              value={c.value}
                              onChange={(e) =>
                                updateCond(i, { value: e.target.value })
                              }
                              placeholder={isArr ? '[9,17] or a,b,c' : '0'}
                              className={`flex-1 ${inp} text-xs font-mono`}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {format === 'multi' && (
                    <button
                      onClick={() => setConds((prev) => [...prev, makeBlank()])}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#00D084] hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add condition
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`p-4 rounded-xl border border-dashed ${p.cardBorder} text-center space-y-1`}
                >
                  <p className={`text-sm ${p.textMuted}`}>
                    Nested rules combine multiple rule groups with AND/OR logic.
                  </p>
                  <p className={`text-[11px] ${p.textMuted}`}>
                    Use Simple or Multi for visual building, then edit the JSON
                    directly.
                  </p>
                </div>
              )}

              {/* Deny Message */}
              <div>
                <label
                  className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                >
                  Deny Message
                </label>
                <input
                  value={denyMsg}
                  onChange={(e) => setDenyMsg(e.target.value)}
                  placeholder="Transaction rejected by policy"
                  className={`${inp} w-full`}
                />
              </div>
            </>
          )}

          {/* Simple mode: single friendly input */}
          {simpleMode && selectedTemplate && (
            <div className="space-y-4">
              <p className={`text-sm font-medium ${p.textMain}`}>
                Set your limit
              </p>
              {(() => {
                const t = TEMPLATES.find((x) => x.label === selectedTemplate)
                const c = conds[0]
                if (!t || !c) return null

                if (t.label === 'Spending Limit') {
                  const usdc = c.value
                    ? (Number(c.value) / 1_000_000).toString()
                    : ''
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Maximum amount (USDC)
                      </label>
                      <input
                        type="number"
                        value={usdc}
                        onChange={(e) => {
                          const val = e.target.value
                          updateCond(0, {
                            value: val
                              ? (Number(val) * 1_000_000).toString()
                              : '',
                          })
                        }}
                        placeholder="1000"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Any payment above this amount will be blocked.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Business Hours') {
                  const [from = 9, to = 17] = JSON.parse(c.value || '[9,17]')
                  return (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label
                          className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                        >
                          From (hour)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={from}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            updateCond(0, { value: `[${v},${to}]` })
                          }}
                          className={`${inp} w-full`}
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                        >
                          To (hour)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={to}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            updateCond(0, { value: `[${from},${v}]` })
                          }}
                          className={`${inp} w-full`}
                        />
                      </div>
                    </div>
                  )
                }

                if (t.label === 'Weekdays Only') {
                  const days = new Set<number>(
                    JSON.parse(c.value || '[1,2,3,4,5]'),
                  )
                  const dayLabels = [
                    { d: 1, label: 'Mon' },
                    { d: 2, label: 'Tue' },
                    { d: 3, label: 'Wed' },
                    { d: 4, label: 'Thu' },
                    { d: 5, label: 'Fri' },
                    { d: 6, label: 'Sat' },
                    { d: 7, label: 'Sun' },
                  ]
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-2`}
                      >
                        Allowed days
                      </label>
                      <div className="flex gap-2">
                        {dayLabels.map(({ d, label }) => (
                          <button
                            key={d}
                            onClick={() => {
                              const cur = new Set<number>(
                                JSON.parse(c.value || '[]'),
                              )
                              cur.has(d) ? cur.delete(d) : cur.add(d)
                              updateCond(0, {
                                value: `[${[...cur].sort((a, b) => a - b).join(',')}]`,
                              })
                            }}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                              days.has(d)
                                ? 'bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]'
                                : `${p.cardBorder} ${p.textMuted}`
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                if (t.label === 'KYC Required') {
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Required KYC level
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={3}
                        value={c.value}
                        onChange={(e) =>
                          updateCond(0, { value: e.target.value })
                        }
                        placeholder="1"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        1 = basic, 2 = verified, 3 = institutional
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Low Risk Only') {
                  return (
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Maximum risk score (0–100)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.value}
                        onChange={(e) =>
                          updateCond(0, { value: e.target.value })
                        }
                        placeholder="50"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Lower is safer. Transactions above this score will be
                        blocked.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Indonesia Only') {
                  return (
                    <div
                      className={`p-4 rounded-xl border ${p.cardBorder}`}
                      style={{
                        backgroundColor: p.dark
                          ? 'rgba(0,208,132,0.04)'
                          : 'rgba(0,208,132,0.04)',
                      }}
                    >
                      <p className={`text-sm ${p.textMain}`}>
                        This rule is set. Only payments from Indonesia will be
                        allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'USD Minimum') {
                  const usd = c.value ? (Number(c.value) / 1e8).toString() : ''
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Minimum USD value
                      </label>
                      <input
                        type="number"
                        value={usd}
                        onChange={(e) => {
                          const val = e.target.value
                          updateCond(0, { value: val ? (Number(val) * 1e8).toString() : '' })
                        }}
                        placeholder="45"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Any payment below this USD value will be blocked (regardless of token).
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Whitelist Sender') {
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Allowed sender address
                      </label>
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => updateCond(0, { value: e.target.value })}
                        placeholder="0x..."
                        className={`${inp} w-full font-mono`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Only payments from this address will be allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Chain Guard') {
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Allowed chain ID
                      </label>
                      <input
                        type="number"
                        value={c.value}
                        onChange={(e) => updateCond(0, { value: e.target.value })}
                        placeholder="31337"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Only payments on this chain will be allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'QR Payments Only') {
                  return (
                    <div
                      className={`p-4 rounded-xl border ${p.cardBorder}`}
                      style={{
                        backgroundColor: p.dark
                          ? 'rgba(0,208,132,0.04)'
                          : 'rgba(0,208,132,0.04)',
                      }}
                    >
                      <p className={`text-sm ${p.textMain}`}>
                        This rule is set. Only QR code payments will be allowed.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'Daily Budget') {
                  const limit = conds[0]?.value ?? '50000000'
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Daily spending limit (USDC)
                      </label>
                      <input
                        type="number"
                        value={limit ? (Number(limit) / 1_000_000).toString() : ''}
                        onChange={(e) => {
                          const val = e.target.value
                          updateCond(0, { value: val ? (Number(val) * 1_000_000).toString() : '' })
                        }}
                        placeholder="50"
                        className={`${inp} w-full`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Payments that would exceed this daily limit will be blocked.
                      </p>
                    </div>
                  )
                }

                if (t.label === 'PayID Owner') {
                  return (
                    <div>
                      <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>
                        Allowed PayID owner
                      </label>
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => updateCond(0, { value: e.target.value })}
                        placeholder="0x..."
                        className={`${inp} w-full font-mono`}
                      />
                      <p className={`text-[10px] ${p.textMuted} mt-1`}>
                        Only payments to this PayID owner will be allowed.
                      </p>
                    </div>
                  )
                }

                return null
              })()}
            </div>
          )}

          {/* Plain English Preview */}
          <div
            className={`p-4 rounded-xl border border-dashed ${p.cardBorder}`}
            style={{
              backgroundColor: p.dark
                ? 'rgba(0,208,132,0.04)'
                : 'rgba(0,208,132,0.04)',
            }}
          >
            <p className={`text-[11px] font-medium text-[#00D084] mb-1`}>
              What this rule does:
            </p>
            <p className={`text-sm ${p.textMain}`}>
              {simpleMode && selectedTemplate
                ? (() => {
                    const c = conds[0]
                    if (!c?.field) return 'Pick a template above to get started'
                    if (c.field === 'tx.amount' && c.op === '<=') {
                      const usdc = Number(c.value) / 1_000_000
                      return `Block any payment over ${usdc.toLocaleString()} USDC`
                    }
                    if (
                      c.field === 'env.timestamp' &&
                      c.transform === 'hour' &&
                      c.op === 'between'
                    ) {
                      const [from, to] = JSON.parse(c.value || '[9,17]')
                      return `Only allow payments between ${from}:00 and ${to}:00`
                    }
                    if (
                      c.field === 'env.timestamp' &&
                      c.transform === 'day' &&
                      c.op === 'in'
                    ) {
                      const days: Array<number> = JSON.parse(
                        c.value || '[1,2,3,4,5]',
                      )
                      if (days.length === 5 && days.every((d) => d <= 5))
                        return 'Block payments on weekends (Sat & Sun)'
                      return `Allow payments on: ${days.map((d) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}`
                    }
                    if (c.field === 'oracle.kycLevel' && c.op === '>=')
                      return `Require identity verification (KYC level ${c.value}+)`
                    if (c.field === 'risk.score' && c.op === '<=')
                      return `Block transactions with risk score above ${c.value}`
                    if (c.field === 'oracle.country' && c.op === '==')
                      return `Only allow payments from ${c.value.toUpperCase()}`
                    return summary
                  })()
                : summary}
            </p>
          </div>

          {!simpleMode && (
            <>
              {/* JSON + Hash */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowJson((v) => !v)}
                  className={`flex items-center gap-1.5 text-[11px] font-medium ${p.textMuted} hover:${p.textMain} transition-colors`}
                >
                  {showJson ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {showJson ? 'Hide' : 'Show'} generated JSON (upload this to
                  IPFS)
                </button>
                <AnimatePresence>
                  {showJson && (
                    <motion.div
                      key="json"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div
                        className={`relative rounded-xl border ${p.cardBorder} overflow-hidden`}
                        style={{
                          backgroundColor: p.dark
                            ? 'rgba(0,0,0,0.3)'
                            : 'rgba(0,0,0,0.03)',
                        }}
                      >
                        <button
                          onClick={copyJson}
                          className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-[#00D084]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                          )}
                        </button>
                        <pre
                          className={`text-[11px] font-mono p-4 pr-10 overflow-x-auto ${p.textMuted}`}
                        >
                          {ruleJson}
                        </pre>
                      </div>
                      <p
                        className={`text-[10px] font-mono mt-2 ${p.textMuted} truncate`}
                      >
                        Hash: {ruleHash}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* NFT Metadata */}
              <div
                className={`rounded-xl border ${p.cardBorder} overflow-hidden`}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3 border-b"
                  style={{
                    borderColor: p.dark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.06)',
                    background: p.dark
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(0,0,0,0.015)',
                  }}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#0EA5E9]" />
                  <span className={`text-xs font-semibold ${p.textMain}`}>
                    NFT Metadata
                  </span>
                  <span className={`ml-auto text-[10px] ${p.textMuted}`}>
                    Step 1b — before deploying
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        NFT Name
                      </label>
                      <input
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        placeholder="PAY.ID Rule NFT"
                        className={`${inp} w-full text-xs`}
                      />
                    </div>
                    <div>
                      <label
                        className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                      >
                        Description
                      </label>
                      <input
                        value={nftDesc}
                        onChange={(e) => setNftDesc(e.target.value)}
                        placeholder="PAY.ID programmable payment policy"
                        className={`${inp} w-full text-xs`}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className={`text-[11px] font-medium ${p.textMuted} block mb-1`}
                    >
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
                      <div
                        className={`relative rounded-xl overflow-hidden border ${p.cardBorder}`}
                      >
                        <img
                          src={imgDataUrl}
                          alt="preview"
                          className="w-full h-32 object-cover"
                        />
                        <button
                          onClick={() => setImgDataUrl(null)}
                          className="absolute top-2 right-2 p-1 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileRef.current?.click()}
                          className={`flex-1 py-5 rounded-xl border border-dashed ${p.cardBorder} ${p.textMuted} text-xs font-medium hover:border-[#00D084]/40 hover:text-[#00D084] transition-colors flex flex-col items-center justify-center gap-1.5`}
                        >
                          <Upload className="w-4 h-4" />
                          Drop or click to upload
                        </button>
                        <button
                          onClick={() =>
                            setImgDataUrl(genImage(ruleName, ruleHash))
                          }
                          className={`flex-1 py-5 rounded-xl border border-dashed ${p.cardBorder} ${p.textMuted} text-xs font-medium hover:border-[#00D084]/40 hover:text-[#00D084] transition-colors flex flex-col items-center justify-center gap-1.5`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Auto-generate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Deploy */}
          <div className="space-y-2">
            {!simpleMode && (
              <>
                {is0G ? (
                  <div className="rounded-xl px-3 py-2 text-[11px] border border-[#00D084]/30 bg-[#00D084]/5 text-[#00D084] flex items-center gap-2">
                    <span className="font-bold">0G</span>
                    <span>
                      Connected to 0G Newton Testnet — metadata will be stored
                      on <strong>0G Storage</strong> instead of IPFS.
                    </span>
                  </div>
                ) : (
                  !getPinataJWT() && (
                    <div className="rounded-xl px-3 py-2 text-[11px] border border-amber-500/30 bg-amber-500/8 text-amber-400">
                      ⚠ Add <code className="font-mono">VITE_PINATA_JWT</code>{' '}
                      to your <code className="font-mono">.env</code> for auto
                      IPFS upload.
                    </div>
                  )
                )}
              </>
            )}
            <PremiumButton
              onClick={handleDeploy}
              disabled={
                deployStage === 'uploading' ||
                deployStage === 'creating' ||
                !isConnected
              }
              isLoading={deployStage === 'uploading' || deployStage === 'creating'}
              icon={<Upload className="w-4 h-4" />}
              className="w-full"
            >
              {deployStage === 'uploading'
                ? 'Preparing rule…'
                : deployStage === 'creating'
                  ? 'Confirm in wallet…'
                  : simpleMode
                    ? 'Deploy Rule'
                    : is0G
                      ? 'Upload to 0G & Deploy NFT'
                      : 'Upload to IPFS & Deploy NFT'}
            </PremiumButton>
            {deployMsg && (
              <p
                className={`text-xs text-center ${
                  deployStage === 'done'
                    ? 'text-[#00D084]'
                    : deployStage === 'error'
                      ? 'text-[#EF4444]'
                      : p.textMuted
                }`}
              >
                {deployMsg}
              </p>
            )}
            {deployStage === 'done' && (
              <button
                onClick={() => {
                  setDeployStage('idle')
                  setDeployMsg('')
                  setSelectedTemplate(null)
                  setConds([makeBlank()])
                }}
                className={`w-full py-2 rounded-xl text-xs ${p.textMuted} border ${p.cardBorder} hover:bg-black/5 transition-colors`}
              >
                Build Another Rule
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ───── MY RULES ───── */}
      <div
        className={`${card} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            background: p.dark
              ? 'rgba(14,165,233,0.06)'
              : 'rgba(14,165,233,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#0EA5E9] text-white font-bold text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className={`text-sm font-semibold ${p.textMain}`}>My Rules</p>
              <p className={`text-[11px] ${p.textMuted}`}>
                {myRules.length} rule{myRules.length !== 1 ? 's' : ''} created
              </p>
            </div>
          </div>
          <Shield className="w-4 h-4 text-[#0EA5E9]" />
        </div>

        <div className="p-5">
          {myRules.length === 0 ? (
            <div className="py-10 text-center">
              <Shield
                className={`w-10 h-10 mx-auto mb-3 ${p.textMuted} opacity-30`}
              />
              <p className={`text-sm font-medium ${p.textMuted}`}>
                No rules yet
              </p>
              <p className={`text-xs ${p.textMuted} mt-0.5`}>
                Build and deploy your first rule above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myRules.map((rule) => (
                <div
                  key={rule.ruleId.toString()}
                  className={`rounded-xl border ${p.cardBorder} overflow-hidden`}
                  style={{
                    backgroundColor: p.dark
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <div className="aspect-video bg-[#00D084]/5 relative overflow-hidden">
                    <RuleImage
                      uri={rule.uri}
                      className="w-8 h-8 text-[#00D084]/30"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-semibold ${p.textMain}`}>
                        Rule #{rule.ruleId.toString()}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          rule.tokenId > 0n
                            ? 'bg-[#00D084]/15 text-[#00D084]'
                            : 'bg-[#64748B]/15 text-[#64748B]'
                        }`}
                      >
                        {rule.tokenId > 0n ? '✓ Activated' : 'Pending'}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] font-mono ${p.textMuted} truncate`}
                    >
                      {rule.ruleHash.slice(0, 18)}…
                    </p>
                    {rule.tokenId > 0n && (
                      <button
                        onClick={async () => {
                          try {
                            const eth = (window as any).ethereum
                            if (!eth) {
                              toast.error('No wallet found')
                              return
                            }
                            await eth.request({
                              method: 'wallet_watchAsset',
                              params: {
                                type: 'ERC721',
                                options: {
                                  address: contracts.ruleItemERC721,
                                  tokenId: rule.tokenId.toString(),
                                },
                              },
                            })
                            toast.success('NFT added to wallet!')
                          } catch (e) {
                            toast.error('Failed to add NFT', {
                              description: (e as Error).message,
                            })
                          }
                        }}
                        className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#0EA5E9] hover:underline"
                      >
                        <Wallet className="w-3 h-3" /> Add to Wallet
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───── STEP 3: ACTIVATE ───── */}
      <div
        className={`${card} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{
            borderColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            background: p.dark
              ? 'rgba(245,158,11,0.06)'
              : 'rgba(245,158,11,0.04)',
          }}
        >
          <span className="w-7 h-7 rounded-full bg-[#F59E0B] text-black font-bold text-sm flex items-center justify-center shrink-0">
            3
          </span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${p.textMain}`}>
              Activate Rule
            </p>
            <p className={`text-[11px] ${p.textMuted}`}>
              Mint an on-chain NFT license — required for policy enforcement
            </p>
          </div>
          <Zap className="w-4 h-4 text-[#F59E0B]" />
        </div>

        <div className="p-5 space-y-4">
          {(sub?.logicalRuleCount ?? 0) >= (sub?.maxSlots ?? 1) ? (
            <div className="rounded-xl p-4 border border-amber-500/30 bg-amber-500/8 space-y-3">
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">
                    Slot limit reached
                  </p>
                  <p className="text-[11px] text-amber-400/70 mt-0.5">
                    You've used all your rule slots. Subscribe to unlock up to 3 slots.
                  </p>
                </div>
              </div>
              <button
                onClick={() => subscribe((subPrice as bigint | undefined) ?? parseEther('0.001'))}
                disabled={subPending || subConfirming}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {subPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirm in
                    wallet…
                  </>
                ) : subConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for
                    block…
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" /> Subscribe — {formatPriceWithUSD((subPrice as bigint | undefined) ?? parseEther('0.001'), nativeSymbol, ethUsdPrice)} / 30
                    days
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRules.length > 0 ? (
                <select
                  value={activateId}
                  onChange={(e) => setActivateId(e.target.value)}
                  className={`${inp} w-full`}
                >
                  <option value="">Choose a rule to activate…</option>
                  {myRules.map((r) => (
                    <option
                      key={r.ruleId.toString()}
                      value={r.ruleId.toString()}
                    >
                      Rule #{r.ruleId.toString()}{' '}
                      {r.tokenId > 0n
                        ? '(already activated)'
                        : '(needs activation)'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  placeholder="Rule ID"
                  value={activateId}
                  onChange={(e) => setActivateId(e.target.value)}
                  className={`${inp} w-full`}
                />
              )}
              <button
                onClick={() => {
                  if (!activateId) return
                  setActivateStatus('idle')
                  setActivateMsg('')
                  activateRule(BigInt(activateId))
                }}
                disabled={activating || !activateId}
                className="w-full py-2.5 rounded-xl bg-[#F59E0B] text-black font-semibold text-sm hover:bg-[#F59E0B]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {activatingPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirm in
                    wallet…
                  </>
                ) : activatingConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for
                    block…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Activate Rule NFT
                  </>
                )}
              </button>
              {activateMsg && (
                <p
                  className={`text-xs text-center font-medium ${activateStatus === 'done' ? 'text-[#00D084]' : 'text-[#EF4444]'}`}
                >
                  {activateMsg}
                </p>
              )}
            </div>
          )}
          {activeCombined?.hash && (
            <div className="rounded-xl px-3 py-2.5 border border-[#00D084]/20 bg-[#00D084]/5">
              <p className={`text-[10px] font-medium ${p.textMuted} mb-0.5`}>
                Enforced policy hash
              </p>
              <p className="text-[11px] font-mono text-[#00D084] truncate">
                {activeCombined.hash}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
