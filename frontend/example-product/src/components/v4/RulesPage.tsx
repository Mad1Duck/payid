import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Plus, Trash2, ChevronDown, ChevronUp,
  Copy, Check, Loader2, Crown, Zap, Sparkles, Upload, Image as ImageIcon,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { useActiveCombinedRule, useMyRules, useSubscription, useCreateRule, useActivateRule, useSubscribe, useRegisterCombinedRule, usePayIDContext } from 'payid-react'
import { keccak256, stringToBytes, parseEther, encodePacked } from 'viem'
import { useV4Palette } from './theme'
import { toast } from 'sonner'

/* ── Image Generator ── */
function genImage(ruleId: string, ruleHash: string): string {
  const c = document.createElement('canvas')
  c.width = 480; c.height = 480
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 480, 480)
  g.addColorStop(0, '#060a06'); g.addColorStop(1, '#0a1a0a')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 480)
  for (let y = 0; y < 480; y += 4) { ctx.fillStyle = 'rgba(0,255,127,0.012)'; ctx.fillRect(0, y, 480, 2) }
  ctx.strokeStyle = '#004d26'; ctx.lineWidth = 1.5; ctx.strokeRect(16, 16, 448, 448)
  ;[[16,16],[464,16],[16,464],[464,464]].forEach(([x, y]) => {
    ctx.strokeStyle = '#00ff7f'; ctx.lineWidth = 1.5
    const dx = x === 16 ? 1 : -1; const dy = y === 16 ? 1 : -1
    ctx.beginPath(); ctx.moveTo(x, y + dy * 18); ctx.lineTo(x, y); ctx.lineTo(x + dx * 18, y); ctx.stroke()
  })
  ctx.fillStyle = '#00ff7f'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.fillText('PAY.ID', 240, 64)
  ctx.fillStyle = '#2d4d2d'; ctx.font = '10px monospace'; ctx.fillText('PROGRAMMABLE PAYMENT RULE', 240, 82)
  ctx.strokeStyle = '#1a2e1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40, 96); ctx.lineTo(440, 96); ctx.stroke()
  ctx.fillStyle = '#004d26'; ctx.font = 'bold 108px monospace'; ctx.fillText('◈', 240, 242)
  ctx.fillStyle = 'rgba(0,255,127,0.07)'; ctx.font = 'bold 112px monospace'; ctx.fillText('◈', 240, 242)
  ctx.fillStyle = '#d4f5d4'; ctx.font = 'bold 19px monospace'; ctx.fillText(ruleId.toUpperCase().slice(0, 22), 240, 300)
  ctx.fillStyle = '#6b9b6b'; ctx.font = '11px monospace'; ctx.fillText('RULE NFT', 240, 320)
  ctx.strokeStyle = '#1a2e1a'; ctx.beginPath(); ctx.moveTo(40, 378); ctx.lineTo(440, 378); ctx.stroke()
  ctx.fillStyle = '#243824'; ctx.font = '9px monospace'; ctx.fillText(ruleHash.slice(0, 24) + '...', 240, 400)
  ctx.fillStyle = '#1a2e1a'; ctx.font = '9px monospace'; ctx.fillText('payid.rule.v1', 240, 452)
  return c.toDataURL('image/png')
}

/* ── Pinata helpers ── */
const getPinataJWT = () => (import.meta.env.VITE_PINATA_JWT as string | undefined) ?? ''
const getPinataGW  = () =>
  ((import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ?? 'https://gateway.pinata.cloud').replace(/\/$/, '')

async function pinImage(dataUrl: string, name: string): Promise<{ cid: string; url: string }> {
  const jwt = getPinataJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const mime = dataUrl.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
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
  return { cid, url: `${getPinataGW()}/ipfs/${cid}` }
}

async function pinJson(data: unknown, name: string): Promise<{ cid: string; url: string }> {
  const jwt = getPinataJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const fd = new FormData()
  fd.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }), name)
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Pinata upload failed: ${await res.text()}`)
  const { data: { cid } } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getPinataGW()}/ipfs/${cid}` }
}

/* ── 0G Storage helpers (used when chainId === 16600) ── */
const get0GIndexer = () =>
  ((import.meta.env.VITE_0G_STORAGE_INDEXER as string | undefined) ?? 'https://indexer-storage-testnet-turbo.0g.ai').replace(/\/$/, '')
const get0GRpc = () =>
  (import.meta.env.VITE_0G_STORAGE_RPC as string | undefined) ?? 'https://16600.rpc.thirdweb.com'
const get0GGateway = () =>
  ((import.meta.env.VITE_0G_STORAGE_GATEWAY as string | undefined) ?? 'https://indexer-storage-testnet-turbo.0g.ai').replace(/\/$/, '')

async function upload0G(data: Uint8Array): Promise<{ rootHash: string; url: string }> {
  const { MemData, Indexer } = await import('@0gfoundation/0g-storage-ts-sdk')
  const { BrowserProvider } = await import('ethers')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum
  if (!eth) throw new Error('No injected wallet found')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(eth as any)
  const signer = await provider.getSigner()
  const indexer = new Indexer(get0GIndexer())
  const memData = new MemData(data)
  const [tree, treeErr] = await memData.merkleTree()
  if (treeErr) throw new Error(`0G merkle error: ${treeErr}`)
  const rootHash = (tree as { rootHash(): string }).rootHash()
  const [, uploadErr] = await indexer.upload(memData, get0GRpc(), signer)
  if (uploadErr) throw new Error(`0G upload error: ${uploadErr}`)
  return { rootHash, url: `${get0GGateway()}/file?root=${rootHash}` }
}

/* ── URI → HTTP helper (ipfs:// | 0g:// | http) ── */
function uriToHttp(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return `${getPinataGW()}/ipfs/${uri.slice(7)}`
  if (uri.startsWith('0g://'))   return `${get0GGateway()}/file?root=${uri.slice(5)}`
  return uri
}

/* ── Rule thumbnail — fetches metadata, shows NFT image ── */
function RuleImage({ uri, className }: { uri: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!uri) return
    fetch(uriToHttp(uri))
      .then(r => r.json())
      .then(meta => { if (meta.image) setSrc(uriToHttp(meta.image)) })
      .catch(() => {})
  }, [uri])
  if (!src) return <Shield className={className ?? 'w-3.5 h-3.5 text-[#00D084]'} />
  return <img src={src} alt="rule" className="w-full h-full object-cover rounded-lg" />
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

type DeployStage = 'idle' | 'uploading' | 'creating' | 'done' | 'error'

/* ── Context field suggestions (datalist) ── */
const CTX_FIELDS = [
  'tx.amount', 'tx.token', 'tx.sender', 'tx.receiver', 'tx.data',
  'payId.owner', 'payId.ruleHash',
  'intent.amount', 'intent.currency', 'intent.recipient',
  'env.chainId', 'env.timestamp',
  'oracle.ethUsd', 'oracle.kycLevel', 'oracle.country',
  'risk.score', 'risk.category',
  'state.spentToday', 'state.dailyLimit',
]

const TRANSFORMS = [
  { label: '— none —',          value: '' },
  { label: 'div:N (divide)',     value: 'div' },
  { label: 'mod:N (modulo)',     value: 'mod' },
  { label: 'abs (absolute)',     value: 'abs' },
  { label: 'hour (of day)',      value: 'hour' },
  { label: 'day (of week)',      value: 'day' },
  { label: 'date (of month)',    value: 'date' },
  { label: 'month (of year)',    value: 'month' },
  { label: 'len (str length)',   value: 'len' },
  { label: 'lower (lowercase)',  value: 'lower' },
  { label: 'upper (uppercase)',  value: 'upper' },
]

const OPS = [
  { v: '>=',           label: '>=' },
  { v: '<=',           label: '<=' },
  { v: '>',            label: '>' },
  { v: '<',            label: '<' },
  { v: '==',           label: '==' },
  { v: '!=',           label: '!=' },
  { v: 'in',           label: 'in (set)' },
  { v: 'not_in',       label: 'not_in (set)' },
  { v: 'between',      label: 'between (range)' },
  { v: 'not_between',  label: 'not_between' },
  { v: 'mod_eq',       label: 'mod_eq' },
  { v: 'mod_ne',       label: 'mod_ne' },
  { v: 'contains',     label: 'contains' },
  { v: 'not_contains', label: 'not_contains' },
  { v: 'starts_with',  label: 'starts_with' },
  { v: 'ends_with',    label: 'ends_with' },
  { v: 'exists',       label: 'exists' },
  { v: 'not_exists',   label: 'not_exists' },
  { v: 'regex',        label: 'regex' },
  { v: 'not_regex',    label: 'not_regex' },
]
const NO_VAL  = new Set(['exists', 'not_exists'])
const ARR_OPS = new Set(['in', 'not_in', 'between', 'not_between', 'mod_eq', 'mod_ne'])
const NO_ARG  = new Set(['abs', 'hour', 'day', 'date', 'month', 'len', 'lower', 'upper'])

type RuleFormat = 'simple' | 'multi' | 'nested'

interface Cond { field: string; transform: string; transformArg: string; op: string; value: string }

function makeBlank(): Cond { return { field: 'tx.amount', transform: '', transformArg: '', op: '>=', value: '' } }

function buildFieldExpr(c: Cond) {
  if (!c.transform) return c.field
  return `${c.field}|${c.transform}${c.transformArg ? ':' + c.transformArg : ''}`
}

function parseVal(op: string, v: string): unknown {
  if (NO_VAL.has(op)) return undefined
  if (ARR_OPS.has(op)) { try { return JSON.parse(v) } catch { return v.split(',').map(s => s.trim()) } }
  if (!isNaN(Number(v)) && v.trim() !== '') return Number(v)
  return v
}

function buildJson(conds: Cond[], format: RuleFormat, logic: 'AND' | 'OR', id: string, comment: string, message: string) {
  const base: Record<string, unknown> = { id: id || 'rule_001' }
  if (comment) base._comment = comment
  if (format === 'simple') {
    const c = conds[0]
    if (!c) return base
    return { ...base, if: { field: buildFieldExpr(c), op: c.op, value: parseVal(c.op, c.value) }, message }
  }
  if (format === 'multi') {
    return {
      ...base, logic,
      conditions: conds.filter(c => c.field && c.op).map(c => ({
        field: buildFieldExpr(c), op: c.op, value: parseVal(c.op, c.value),
      })),
      message,
    }
  }
  return { ...base, logic, rules: [], message }
}

/* ── Starter templates ── */
const TEMPLATES = [
  { label: 'Max Amount',     icon: '💰', fmt: 'simple' as RuleFormat, conds: [{ field: 'tx.amount',      transform: '',      transformArg: '', op: '<=', value: '1000000000000000000' }] },
  { label: 'Business Hours', icon: '🕐', fmt: 'simple' as RuleFormat, conds: [{ field: 'env.timestamp',  transform: 'hour',  transformArg: '', op: 'between', value: '[9,17]' }] },
  { label: 'Weekday Only',   icon: '📅', fmt: 'simple' as RuleFormat, conds: [{ field: 'env.timestamp',  transform: 'day',   transformArg: '', op: 'in', value: '[1,2,3,4,5]' }] },
  { label: 'KYC Required',   icon: '🪪', fmt: 'simple' as RuleFormat, conds: [{ field: 'oracle.kycLevel', transform: '',     transformArg: '', op: '>=', value: '1' }] },
  { label: 'Low Risk Only',  icon: '🛡', fmt: 'simple' as RuleFormat, conds: [{ field: 'risk.score',     transform: '',      transformArg: '', op: '<=', value: '50' }] },
  { label: 'Indonesia Only', icon: '🇮🇩', fmt: 'simple' as RuleFormat, conds: [{ field: 'oracle.country', transform: 'lower', transformArg: '', op: '==', value: 'id' }] },
]

function canonicalize(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(canonicalize)
  if (o && typeof o === 'object') return Object.keys(o as object).sort().reduce((a, k) => { (a as any)[k] = canonicalize((o as any)[k]); return a }, {} as object)
  return o
}

function plain(c: Cond): string {
  const expr = buildFieldExpr(c)
  if (NO_VAL.has(c.op)) return `${expr} ${c.op}`
  return `${expr} ${c.op} ${c.value}`
}

export default function RulesPage() {
  const { address, isConnected, chainId } = useAccount()
  const is0G = chainId === 16600
  const { data: myRules = [], refetch: refetchMyRules } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const { data: sub, refetch: refetchSub } = useSubscription(address)
  const p = useV4Palette()

  /* ── Builder state ── */
  const [conds, setConds] = useState<Cond[]>([makeBlank()])
  const [format, setFormat] = useState<RuleFormat>('simple')
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND')
  const [ruleName, setRuleName] = useState('rule_001')
  const [ruleComment, setRuleComment] = useState('')
  const [denyMsg, setDenyMsg] = useState('Transaction rejected by policy')
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

  /* ── Combined rule state ── */
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set())
  const [combineDir, setCombineDir] = useState<'none' | 'inbound' | 'outbound'>('none')
  const [combineVer, setCombineVer] = useState('1')
  const [combineStage, setCombineStage] = useState<'idle' | 'registering' | 'done' | 'error'>('idle')
  const [combineMsg, setCombineMsg] = useState('')
  const { registerCombinedRule, isPending: combining, isSuccess: combinedOk, error: combineError } = useRegisterCombinedRule()
  const { contracts } = usePayIDContext()

  /* ── Activate state ── */
  const [activateId, setActivateId] = useState('')
  const { activateRule, isPending: activatingPending, isConfirming: activatingConfirming, isSuccess: activated, error: activateErr } = useActivateRule()
  const activating = activatingPending || activatingConfirming
  const [activateStatus, setActivateStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [activateMsg, setActivateMsg] = useState('')

  /* ── Subscribe ── */
  const { subscribe, isPending: subPending, isSuccess: subOk, isConfirming: subConfirming } = useSubscribe()

  const activeCount = myRules.filter(r => r.active).length

  /* ── Computed ── */
  const ruleJson = useMemo(() => {
    const obj = buildJson(conds, format, logic, ruleName, ruleComment, denyMsg)
    return JSON.stringify(canonicalize({ rule: obj }), null, 2)
  }, [conds, format, logic, ruleName, ruleComment, denyMsg])

  const ruleHash = useMemo(() => keccak256(stringToBytes(ruleJson)), [ruleJson])

  const summary = useMemo(() => {
    const parts = conds.filter(c => c.field && c.op).map(plain)
    if (!parts.length) return 'Add at least one condition'
    if (format === 'simple') return `BLOCK if: ${parts[0]}`
    return `BLOCK if: ${parts.join(` ${logic} `)}`
  }, [conds, format, logic])

  /* ── Handlers ── */
  const updateCond = useCallback((i: number, patch: Partial<Cond>) =>
    setConds(prev => { const n = [...prev]; n[i] = { ...n[i], ...patch } as Cond; return n }), [])

  const copyJson = () => {
    navigator.clipboard.writeText(ruleJson)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImgDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCombineRegister = () => {
    const selRules = myRules.filter(r => selectedRuleIds.has(r.ruleId.toString()))
    if (selRules.length === 0 || !isConnected) return

    // Contract calls ownerOf(tokenId) for each ref — tokenId=0 will revert
    const unactivated = selRules.filter(r => r.tokenId === 0n)
    if (unactivated.length > 0) {
      setCombineStage('error')
      setCombineMsg(`Rule #${unactivated.map(r => r.ruleId.toString()).join(', ')} not activated — activate them first (Step 2).`)
      return
    }

    const tokenIds = selRules.map(r => r.tokenId)
    const ver = BigInt(combineVer || '1')
    const ruleNFTs = Array(tokenIds.length).fill(contracts.ruleItemERC721) as `0x${string}`[]
    const ruleSetHash = keccak256(encodePacked(['address[]', 'uint256[]', 'uint64'], [ruleNFTs, tokenIds, ver]))
    setCombineStage('registering')
    setCombineMsg('')
    registerCombinedRule({ ruleSetHash, ruleNFTs, tokenIds, version: ver })
  }

  const handleDeploy = async () => {
    if (!isConnected) return
    if (!is0G && !getPinataJWT()) {
      setDeployStage('error')
      setDeployMsg('Add VITE_PINATA_JWT to your .env file to enable auto-upload.')
      return
    }
    setDeployStage('uploading')
    setDeployMsg(is0G ? 'Uploading to 0G Storage…' : 'Uploading image + metadata to IPFS…')
    try {
      const imgToPin = imgDataUrl ?? genImage(ruleName, ruleHash)
      let imageURL: string
      let tokenUri: string

      if (is0G) {
        /* ── 0G Storage path ── */
        const imgBytes = dataUrlToUint8Array(imgToPin)
        const { url: imgUrl } = await upload0G(imgBytes)
        imageURL = imgUrl

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
          rule: JSON.parse(ruleJson),
          ruleHash,
          standard: 'payid.rule.v1',
        }
        const jsonBytes = new TextEncoder().encode(JSON.stringify(metadata))
        const { rootHash } = await upload0G(jsonBytes)
        tokenUri = `0g://${rootHash}`
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
          rule: JSON.parse(ruleJson),
          ruleHash,
          standard: 'payid.rule.v1',
        }
        const { cid } = await pinJson(metadata, `rule-${ruleName}.json`)
        tokenUri = `ipfs://${cid}`
      }

      setDeployStage('creating')
      setDeployMsg('Confirm the transaction in your wallet…')
      createRule({ ruleHash: ruleHash as `0x${string}`, uri: tokenUri })
    } catch (e: unknown) {
      setDeployStage('error')
      setDeployMsg((e as { message?: string }).message ?? 'Upload failed')
    }
  }

  useEffect(() => {
    if (created && deployStage === 'creating') {
      setDeployStage('done')
      setDeployMsg('Rule NFT created! It will appear in My Rules below.')
      toast.success('Rule NFT created!', { description: 'Refreshing your rules list…' })
      refetchMyRules()
    }
  }, [created, deployStage])

  useEffect(() => {
    if (createErr && deployStage === 'creating') {
      setDeployStage('error')
      const msg = (createErr as { shortMessage?: string }).shortMessage ?? 'Transaction failed'
      setDeployMsg(msg)
      toast.error('Create rule failed', { description: msg })
    }
  }, [createErr, deployStage])

  useEffect(() => {
    if (activated) {
      toast.success('Rule activated!', { description: 'NFT license minted. Policy is now enforced.' })
      setActivateStatus('done')
      setActivateMsg('✓ Rule activated! NFT license minted.')
      refetchMyRules()
    }
  }, [activated])

  useEffect(() => {
    if (activateErr) {
      const msg = (activateErr as { shortMessage?: string }).shortMessage ?? 'Transaction failed'
      toast.error('Activation failed', { description: msg })
      setActivateStatus('error')
      setActivateMsg(msg)
    }
  }, [activateErr])

  useEffect(() => {
    if (subOk) {
      toast.success('Subscription active!', { description: 'You can now activate rule NFTs.' })
      refetchSub()
    }
  }, [subOk])

  useEffect(() => {
    if (combinedOk && combineStage === 'registering') {
      setCombineStage('done')
      setCombineMsg('✓ Policy registered and active!')
      toast.success('Combined rule registered!')
    }
  }, [combinedOk, combineStage])

  useEffect(() => {
    if (combineError && combineStage === 'registering') {
      const msg = (combineError as { shortMessage?: string }).shortMessage ?? 'Registration failed'
      setCombineStage('error')
      setCombineMsg(msg)
      toast.error('Registration failed', { description: msg })
    }
  }, [combineError, combineStage])

  const card = `rounded-2xl border ${p.cardBorder}`
  const inp = `px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${p.textMain}`}>Rule Builder</h1>
          <p className={`text-sm ${p.textMuted} mt-0.5`}>Build payment policies in plain language</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084]">WASM</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">EIP-712</span>
        </div>
      </div>

      {/* Subscription strip */}
      {isConnected && (
        <div className={`${card} p-3 flex items-center gap-3`} style={{ backgroundColor: p.cardBg }}>
          <Crown className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span className={`text-xs flex-1 ${p.textMuted}`}>
            {sub?.isActive ? `Pro · ${myRules.length}/${sub.maxSlots} slots` : `Free · ${myRules.length}/1 slot — upgrade for more`}
          </span>
          {!sub?.isActive && (
            <button onClick={() => subscribe(parseEther('0.001'))} disabled={subPending}
              className="px-3 py-1 rounded-lg bg-[#00D084] text-[#0B0F1A] text-xs font-semibold disabled:opacity-50">
              {subPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Upgrade'}
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active',  value: activeCount.toString(),            color: '#00D084' },
          { label: 'Total',   value: myRules.length.toString(),          color: '#0EA5E9' },
          { label: 'Policy',  value: activeCombined?.hash ? 'On' : 'Off', color: activeCombined?.hash ? '#00D084' : '#F59E0B' },
        ].map(s => (
          <div key={s.label} className={`${card} p-4`} style={{ backgroundColor: p.cardBg }}>
            <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className={`text-[11px] mt-0.5 ${p.textMuted}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ───── BUILDER CARD ───── */}
      <div className={`${card} p-5 space-y-5`} style={{ backgroundColor: p.cardBg }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00D084]" />
          <span className={`text-sm font-semibold ${p.textMain}`}>New Rule</span>
          <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full ${p.dark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'}`}>
            {format.toUpperCase()}
          </span>
        </div>

        {/* Templates */}
        <div>
          <p className={`text-[11px] font-medium ${p.textMuted} mb-2`}>Quick start:</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button key={t.label}
                onClick={() => { setConds(t.conds.map(c => ({ ...c }))); setFormat(t.fmt); setRuleName(t.label.toLowerCase().replace(/ /g, '_')); setOpenPipes(new Set()) }}
                className={`text-xs px-3 py-1.5 rounded-lg border ${p.cardBorder} ${p.textMain} hover:border-[#00D084]/40 hover:bg-[#00D084]/5 transition-colors`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ID + Comment */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>ID *</label>
            <input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="rule_001"
              className={`${inp} w-full font-mono`} />
          </div>
          <div>
            <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>Comment</label>
            <input value={ruleComment} onChange={e => setRuleComment(e.target.value)} placeholder="What this rule does"
              className={`${inp} w-full`} />
          </div>
        </div>

        {/* Format tabs */}
        <div className={`flex rounded-xl overflow-hidden border ${p.cardBorder}`}>
          {(['simple', 'multi', 'nested'] as const).map(f => (
            <button key={f}
              onClick={() => { setFormat(f); if (f === 'simple') setConds(prev => [prev[0] ?? makeBlank()]) }}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                format === f
                  ? 'bg-[#00D084] text-[#0B0F1A]'
                  : (p.dark ? 'bg-white/5 text-white/40 hover:text-white/70' : 'bg-black/3 text-black/30 hover:text-black/60')
              }`}>
              {f === 'simple' ? 'Simple (IF)' : f === 'multi' ? 'Multi (AND/OR)' : 'Nested'}
            </button>
          ))}
        </div>

        {/* Logic — multi only */}
        {format === 'multi' && (
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-medium ${p.textMuted}`}>Logic:</span>
            {(['AND', 'OR'] as const).map(l => (
              <button key={l} onClick={() => setLogic(l)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  logic === l ? 'bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]' : `${p.cardBorder} ${p.textMuted}`
                }`}>
                {l}
              </button>
            ))}
            <span className={`text-[11px] ${p.textMuted}`}>{logic === 'AND' ? '— all must pass' : '— any one passes'}</span>
          </div>
        )}

        {/* Conditions */}
        {format !== 'nested' ? (
          <div className="space-y-3">
            <datalist id="v4-ctx-fields">
              {CTX_FIELDS.map(f => <option key={f} value={f} />)}
            </datalist>
            {conds.map((c, i) => {
              const isNoVal  = NO_VAL.has(c.op)
              const isArr    = ARR_OPS.has(c.op)
              const pipeOpen = openPipes.has(i)
              const needsArg = c.transform && !NO_ARG.has(c.transform)
              return (
                <div key={i} className={`p-3 rounded-xl border ${p.cardBorder} space-y-2`}
                  style={{ backgroundColor: p.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                  {/* Field + |pipe + remove */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${p.textMuted} w-6 shrink-0 text-center`}>
                      {format === 'multi' ? (i === 0 ? 'IF' : logic) : 'IF'}
                    </span>
                    <input
                      list="v4-ctx-fields"
                      value={c.field}
                      onChange={e => updateCond(i, { field: e.target.value })}
                      placeholder="tx.amount"
                      className={`flex-1 ${inp} font-mono text-xs`}
                    />
                    <button
                      onClick={() => setOpenPipes(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                      className={`px-2 py-1.5 rounded-lg text-xs font-mono border transition-colors shrink-0 ${
                        pipeOpen || c.transform
                          ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]'
                          : `${p.cardBorder} ${p.textMuted} hover:border-[#00D084]/30`
                      }`}>
                      |pipe
                    </button>
                    {(format === 'multi' || conds.length > 1) && (
                      <button
                        onClick={() => {
                          setConds(prev => prev.filter((_, x) => x !== i))
                          setOpenPipes(prev => new Set([...prev].filter(x => x !== i).map(x => x > i ? x - 1 : x)))
                        }}
                        className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Transform (collapsible) */}
                  <AnimatePresence>
                    {pipeOpen && (
                      <motion.div key="pipe" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-center gap-2 pt-1">
                          <select value={c.transform} onChange={e => updateCond(i, { transform: e.target.value, transformArg: '' })}
                            className={`${inp} text-xs font-mono`}>
                            {TRANSFORMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          {needsArg && (
                            <input value={c.transformArg} onChange={e => updateCond(i, { transformArg: e.target.value })}
                              placeholder="N" className={`w-16 ${inp} text-xs font-mono`} />
                          )}
                        </div>
                        {c.transform && (
                          <p className={`text-[10px] font-mono mt-1 ${p.textMuted}`}>
                            → {buildFieldExpr(c)}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* OP + Value */}
                  <div className="flex gap-2">
                    <select value={c.op} onChange={e => updateCond(i, { op: e.target.value, value: '' })}
                      className={`${inp} text-xs font-mono`}>
                      {OPS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </select>
                    {!isNoVal && (
                      <input value={c.value} onChange={e => updateCond(i, { value: e.target.value })}
                        placeholder={isArr ? '[9,17] or a,b,c' : '0'}
                        className={`flex-1 ${inp} text-xs font-mono`} />
                    )}
                  </div>
                </div>
              )
            })}
            {format === 'multi' && (
              <button onClick={() => setConds(prev => [...prev, makeBlank()])}
                className="flex items-center gap-1.5 text-xs font-medium text-[#00D084] hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add condition
              </button>
            )}
          </div>
        ) : (
          <div className={`p-4 rounded-xl border border-dashed ${p.cardBorder} text-center space-y-1`}>
            <p className={`text-sm ${p.textMuted}`}>Nested rules combine multiple rule groups with AND/OR logic.</p>
            <p className={`text-[11px] ${p.textMuted}`}>Use Simple or Multi for visual building, then edit the JSON directly.</p>
          </div>
        )}

        {/* Deny Message */}
        <div>
          <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>Deny Message</label>
          <input value={denyMsg} onChange={e => setDenyMsg(e.target.value)}
            placeholder="Transaction rejected by policy"
            className={`${inp} w-full`} />
        </div>

        {/* Plain English Preview */}
        <div className={`p-3 rounded-xl border border-dashed ${p.cardBorder}`}
          style={{ backgroundColor: p.dark ? 'rgba(0,208,132,0.04)' : 'rgba(0,208,132,0.04)' }}>
          <p className={`text-[11px] font-medium text-[#00D084] mb-1`}>What this rule does:</p>
          <p className={`text-sm ${p.textMain}`}>{summary}</p>
        </div>

        {/* JSON + Hash */}
        <div className="space-y-2">
          <button onClick={() => setShowJson(v => !v)}
            className={`flex items-center gap-1.5 text-[11px] font-medium ${p.textMuted} hover:${p.textMain} transition-colors`}>
            {showJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showJson ? 'Hide' : 'Show'} generated JSON (upload this to IPFS)
          </button>
          <AnimatePresence>
            {showJson && (
              <motion.div key="json" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className={`relative rounded-xl border ${p.cardBorder} overflow-hidden`}
                  style={{ backgroundColor: p.dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)' }}>
                  <button onClick={copyJson} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-[#00D084]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                  </button>
                  <pre className={`text-[11px] font-mono p-4 pr-10 overflow-x-auto ${p.textMuted}`}>{ruleJson}</pre>
                </div>
                <p className={`text-[10px] font-mono mt-2 ${p.textMuted} truncate`}>Hash: {ruleHash}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NFT Metadata */}
        <div className={`p-4 rounded-xl border ${p.cardBorder} space-y-3`}
          style={{ backgroundColor: p.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-[#00D084]" />
            <span className={`text-xs font-semibold ${p.textMain}`}>NFT Metadata</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>NFT Name</label>
              <input value={nftName} onChange={e => setNftName(e.target.value)} placeholder="PAY.ID Rule NFT"
                className={`${inp} w-full text-xs`} />
            </div>
            <div>
              <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>Description</label>
              <input value={nftDesc} onChange={e => setNftDesc(e.target.value)} placeholder="PAY.ID programmable payment policy"
                className={`${inp} w-full text-xs`} />
            </div>
          </div>
          <div>
            <label className={`text-[11px] font-medium ${p.textMuted} block mb-1`}>Image</label>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" onChange={handleFileChange} className="hidden" />
            {imgDataUrl ? (
              <div className={`relative rounded-xl overflow-hidden border ${p.cardBorder}`}>
                <img src={imgDataUrl} alt="preview" className="w-full h-32 object-cover" />
                <button onClick={() => setImgDataUrl(null)}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className={`flex-1 py-5 rounded-xl border border-dashed ${p.cardBorder} ${p.textMuted} text-xs font-medium hover:border-[#00D084]/40 hover:text-[#00D084] transition-colors flex flex-col items-center justify-center gap-1.5`}>
                  <Upload className="w-4 h-4" />
                  Drop or click to upload
                </button>
                <button onClick={() => setImgDataUrl(genImage(ruleName, ruleHash))}
                  className={`flex-1 py-5 rounded-xl border border-dashed ${p.cardBorder} ${p.textMuted} text-xs font-medium hover:border-[#00D084]/40 hover:text-[#00D084] transition-colors flex flex-col items-center justify-center gap-1.5`}>
                  <Sparkles className="w-4 h-4" />
                  Auto-generate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Deploy */}
        <div className="space-y-2">
          {is0G ? (
            <div className="rounded-xl px-3 py-2 text-[11px] border border-[#00D084]/30 bg-[#00D084]/5 text-[#00D084] flex items-center gap-2">
              <span className="font-bold">0G</span>
              <span>Connected to 0G Newton Testnet — metadata will be stored on <strong>0G Storage</strong> instead of IPFS.</span>
            </div>
          ) : !getPinataJWT() && (
            <div className="rounded-xl px-3 py-2 text-[11px] border border-amber-500/30 bg-amber-500/8 text-amber-400">
              ⚠ Add <code className="font-mono">VITE_PINATA_JWT</code> to your <code className="font-mono">.env</code> for auto IPFS upload.
            </div>
          )}
          <button
            onClick={handleDeploy}
            disabled={deployStage === 'uploading' || deployStage === 'creating' || !isConnected}
            className="w-full py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] font-semibold text-sm hover:bg-[#00D084]/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deployStage === 'uploading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {is0G ? 'Uploading to 0G…' : 'Uploading to IPFS…'}</>
            ) : deployStage === 'creating' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
            ) : (
              <><Upload className="w-4 h-4" /> {is0G ? 'Upload to 0G & Deploy NFT' : 'Upload to IPFS & Deploy NFT'}</>
            )}
          </button>
          {deployMsg && (
            <p className={`text-xs text-center ${
              deployStage === 'done'  ? 'text-[#00D084]' :
              deployStage === 'error' ? 'text-[#EF4444]' : p.textMuted
            }`}>{deployMsg}</p>
          )}
          {deployStage === 'done' && (
            <button onClick={() => { setDeployStage('idle'); setDeployMsg('') }}
              className={`w-full py-2 rounded-xl text-xs ${p.textMuted} border ${p.cardBorder} hover:bg-black/5 transition-colors`}>
              Build Another Rule
            </button>
          )}
        </div>
      </div>

      {/* ───── MY RULES + ACTIVATE ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* My Rules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-semibold ${p.textMain}`}>My Rules</h2>
            <span className={`text-[11px] ${p.textMuted}`}>{myRules.length} rules</span>
          </div>
          {myRules.length === 0
            ? <p className={`text-sm ${p.textMuted} text-center py-10`}>No rules yet — build your first above.</p>
            : myRules.map(rule => (
              <div key={rule.ruleId.toString()} className={`${card} p-3 flex items-center gap-3`}
                style={{ backgroundColor: p.cardBg }}>
                <div className="w-8 h-8 rounded-lg bg-[#00D084]/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <RuleImage uri={rule.uri} className="w-3.5 h-3.5 text-[#00D084]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-medium ${p.textMain}`}>Rule #{rule.ruleId.toString()}</p>
                  <p className={`text-[11px] ${p.textMuted} font-mono truncate`}>{rule.ruleHash.slice(0, 22)}…</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${rule.active ? 'bg-[#00D084]/10 text-[#00D084]' : 'bg-[#64748B]/10 text-[#64748B]'}`}>
                  {rule.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
        </div>

        {/* Activate */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className={`text-sm font-semibold ${p.textMain}`}>Activate Rule</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] font-medium`}>Step 2</span>
          </div>
          <div className={`${card} p-4 space-y-3`} style={{ backgroundColor: p.cardBg }}>
            <p className={`text-[11px] ${p.textMuted}`}>
              After creating a rule (Step 1), activate it to mint an on-chain NFT license.
              Only activated rules are enforced during payments.
            </p>

            {/* Subscription gate */}
            {!sub?.isActive ? (
              <div className="rounded-xl px-3 py-3 border border-amber-500/30 bg-amber-500/8 space-y-2">
                <p className="text-[11px] text-amber-400 font-medium">
                  ⚠ Subscription required — the contract requires an active subscription to mint rule NFT licenses.
                </p>
                <button
                  onClick={() => subscribe(parseEther('0.001'))}
                  disabled={subPending || subConfirming}
                  className="w-full py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {subPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirm in wallet…</>
                    : subConfirming
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for block…</>
                    : <><Crown className="w-3.5 h-3.5" /> Subscribe (~0.001 ETH / 30 days)</>}
                </button>
              </div>
            ) : (
              <>
                {myRules.length > 0
                  ? (
                    <select value={activateId} onChange={e => setActivateId(e.target.value)} className={`${inp} w-full`}>
                      <option value="">Select a rule…</option>
                      {myRules.map(r => (
                        <option key={r.ruleId.toString()} value={r.ruleId.toString()}>
                          Rule #{r.ruleId.toString()} {r.active ? '(active)' : ''}
                        </option>
                      ))}
                    </select>
                  )
                  : <input type="number" placeholder="Rule ID" value={activateId} onChange={e => setActivateId(e.target.value)}
                      className={`${inp} w-full`} />
                }
                <button
                  onClick={() => {
                    if (!activateId) return
                    setActivateStatus('idle')
                    setActivateMsg('')
                    activateRule(BigInt(activateId))
                  }}
                  disabled={activating || !activateId}
                  className="w-full py-2.5 rounded-xl bg-[#0EA5E9] text-white font-semibold text-sm hover:bg-[#0EA5E9]/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {activatingPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
                  ) : activatingConfirming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for block…</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Activate Rule NFT</>
                  )}
                </button>
                {activateMsg && (
                  <p className={`text-xs text-center font-medium ${
                    activateStatus === 'done' ? 'text-[#00D084]' : 'text-[#EF4444]'
                  }`}>{activateMsg}</p>
                )}
              </>
            )}
          </div>

          {/* Active policy hash */}
          {activeCombined?.hash && (
            <div className={`${card} p-3`} style={{ backgroundColor: p.cardBg }}>
              <p className={`text-[11px] font-medium ${p.textMuted} mb-1`}>Enforced rule hash</p>
              <p className={`text-[11px] font-mono ${p.textMain} truncate`}>{activeCombined.hash}</p>
            </div>
          )}
        </div>
      </div>

      {/* ───── COMBINED RULE STORAGE ───── */}
      <div className={`${card} p-5 space-y-4`} style={{ backgroundColor: p.cardBg }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0EA5E9]" />
            <span className={`text-sm font-semibold ${p.textMain}`}>Combined Rule Storage</span>
          </div>
          {activeCombined?.hash && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium">Active</span>
          )}
        </div>

        <p className={`text-[11px] ${p.textMuted}`}>
          Register your active rule NFTs as a combined policy. This is what the payment flow checks on every transaction.
        </p>

        {/* Active policy */}
        {activeCombined?.hash && (
          <div className={`p-3 rounded-xl border ${p.cardBorder}`}
            style={{ backgroundColor: p.dark ? 'rgba(0,208,132,0.04)' : 'rgba(0,208,132,0.04)' }}>
            <p className={`text-[10px] font-medium ${p.textMuted} mb-1`}>Current policy hash</p>
            <p className={`text-[11px] font-mono ${p.textMain} break-all`}>{activeCombined.hash}</p>
            <p className={`text-[10px] ${p.textMuted} mt-1`}>{activeCombined.ruleRefs.length} rule(s) · v{activeCombined.version.toString()}</p>
          </div>
        )}

        {/* Rule checkboxes */}
        {myRules.length === 0 ? (
          <p className={`text-sm ${p.textMuted} text-center py-4`}>No rules yet — create one above first.</p>
        ) : (
          <div className="space-y-2">
            <p className={`text-[11px] font-medium ${p.textMuted}`}>Select rules to combine:</p>
            {myRules.map(r => (
              <label key={r.ruleId.toString()}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedRuleIds.has(r.ruleId.toString())
                    ? 'border-[#00D084]/40 bg-[#00D084]/5'
                    : `${p.cardBorder} hover:border-[#00D084]/20`
                }`}>
                <input type="checkbox"
                  checked={selectedRuleIds.has(r.ruleId.toString())}
                  disabled={r.tokenId === 0n}
                  onChange={e => setSelectedRuleIds(prev => {
                    const n = new Set(prev); e.target.checked ? n.add(r.ruleId.toString()) : n.delete(r.ruleId.toString()); return n
                  })}
                  className="accent-[#00D084] disabled:opacity-40" />
                <div className={`flex-1 min-w-0 ${r.tokenId === 0n ? 'opacity-40' : ''}`}>
                  <p className={`text-[13px] font-medium ${p.textMain}`}>Rule #{r.ruleId.toString()}</p>
                  <p className={`text-[10px] font-mono ${p.textMuted} truncate`}>{r.ruleHash.slice(0, 26)}…</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  r.tokenId > 0n ? 'bg-[#00D084]/10 text-[#00D084]' : 'bg-amber-500/10 text-amber-400'
                }`}>{r.tokenId > 0n ? 'Activated' : 'Not activated'}</span>
              </label>
            ))}
          </div>
        )}

        {/* Direction + Version */}
        {selectedRuleIds.size > 0 && (
          <div className="flex gap-2">
            <select value={combineDir} onChange={e => setCombineDir(e.target.value as 'none' | 'inbound' | 'outbound')}
              className={`flex-1 ${inp} text-xs`}>
              <option value="none">Both directions</option>
              <option value="inbound">Inbound only</option>
              <option value="outbound">Outbound only</option>
            </select>
            <input type="number" value={combineVer} onChange={e => setCombineVer(e.target.value)} min={1}
              placeholder="v" className={`w-16 ${inp} text-xs font-mono`} />
          </div>
        )}

        {/* Status */}
        {combineStage !== 'idle' && (
          <p className={`text-xs text-center font-medium ${
            combineStage === 'done' ? 'text-[#00D084]' :
            combineStage === 'error' ? 'text-[#EF4444]' : p.textMuted
          }`}>
            {combineStage === 'registering' ? 'Registering…' : combineMsg}
          </p>
        )}

        <button
          onClick={handleCombineRegister}
          disabled={selectedRuleIds.size === 0 || combining || !isConnected}
          className="w-full py-2.5 rounded-xl bg-[#0EA5E9] text-white font-semibold text-sm hover:bg-[#0EA5E9]/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {combining
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
            : <><Zap className="w-4 h-4" /> Register Combined Rule</>}
        </button>

        {!isConnected && (
          <p className={`text-center text-[11px] ${p.textMuted}`}>Connect wallet to register</p>
        )}
      </div>
    </motion.div>
  )
}
