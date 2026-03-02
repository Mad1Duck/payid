/**
 * CreateRuleTab.tsx
 *
 * Mirrors setup scripts (upload-rule-nft-to-pinata.ts + create-rule.ts) exactly:
 *   Step 0 — Check contract deployed (getCode)
 *   Step 1 — hasSubscription() → subscribe() if needed
 *   Step 2 — Upload image to IPFS via Pinata
 *   Step 3 — Upload metadata JSON to IPFS via Pinata
 *   Step 4 — createRule(ruleHash, tokenURI) → parse RuleCreated event
 *   Step 5 — activateRule(ruleId) → parse RuleActivated event → get tokenId
 *   Step 6 — ruleExpiry(tokenId) → verify expiry > now
 *
 * Env:
 *   VITE_PINATA_JWT      — Pinata JWT token
 *   VITE_PINATA_GATEWAY  — e.g. https://gateway.pinata.cloud
 */

import { usePayIDContext, useSubscription } from 'payid-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { decodeEventLog, keccak256, parseEther, toBytes } from 'viem'
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi'
import type { Hash } from 'viem'
import type { ChangeEvent } from 'react'

// ─── ABI (exact from RuleItemERC721.sol) ──────────────────────────────────────
const ABI = [
  {
    name: 'createRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ruleHash', type: 'bytes32' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'activateRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ruleId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'subscribe',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'subscriptionPriceETH',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'hasSubscription',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'ruleTokenId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ruleId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'ruleExpiry',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'RuleCreated',
    type: 'event',
    inputs: [
      { name: 'ruleId', type: 'uint256', indexed: true },
      { name: 'rootRuleId', type: 'uint256', indexed: true },
      { name: 'parentRuleId', type: 'uint256', indexed: true },
      { name: 'version', type: 'uint16', indexed: false },
    ],
  },
  {
    name: 'RuleActivated',
    type: 'event',
    inputs: [
      { name: 'ruleId', type: 'uint256', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
  {
    name: 'Subscribed',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'expiry', type: 'uint256', indexed: false },
    ],
  },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage =
  | 'idle'
  | 'checking'
  | 'subscribing'
  | 'img-upload'
  | 'meta-upload'
  | 'creating'
  | 'activating'
  | 'verifying'
  | 'done'
  | 'error'

type LogLevel = 'info' | 'ok' | 'warn' | 'err'

interface RuleObject {
  _comment?: string
  id: string
  if: { field: string; op: string; value: number | string }
  message: string
}

interface MintResult {
  ruleId: bigint
  tokenId: bigint
  expiry: bigint
  tokenURI: string
  cid: string
  previewURL: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Canonical JSON — matches utils/cannonicalize.ts from backend
function canonicalize(obj: unknown): string {
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(',')}]`
  if (obj !== null && typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    return `{${Object.keys(o)
      .sort()
      .map((k) => `"${k}":${canonicalize(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(obj)
}

const fmtDate = (ts: bigint) => new Date(Number(ts) * 1000).toLocaleString('id')
const daysLeft = (ts: bigint) =>
  Math.max(0, Math.floor((Number(ts) - Date.now() / 1000) / 86400))
const nowTs = () =>
  new Date().toLocaleTimeString('id', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

// ─── Pinata ───────────────────────────────────────────────────────────────────
const getJWT = () =>
  (import.meta.env.VITE_PINATA_JWT as string | undefined) ?? ''
const getGateway = () =>
  (
    (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ??
    'https://gateway.pinata.cloud'
  ).replace(/\/$/, '')

async function pinJson(data: unknown, name: string) {
  const jwt = getJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const fd = new FormData()
  fd.append(
    'file',
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    name,
  )
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Pinata JSON upload failed: ${await res.text()}`)
  const {
    data: { cid },
  } = (await res.json()) as { data: { cid: string } }
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
  if (!res.ok)
    throw new Error(`Pinata image upload failed: ${await res.text()}`)
  const {
    data: { cid },
  } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getGateway()}/ipfs/${cid}` }
}

// ─── Auto-generate NFT image via Canvas ──────────────────────────────────────
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

// ─── CSS ──────────────────────────────────────────────────────────────────────
export const CREATE_RULE_CSS = `
.cr-pipe-wrap {
  display: flex; border: 1px solid var(--border); border-bottom: none;
  background: var(--bg2);
}
.cr-pipe {
  flex: 1; text-align: center; font-size: 8px; letter-spacing: .08em;
  text-transform: uppercase; padding: 7px 4px;
  color: var(--text3); border-right: 1px solid var(--border);
  border-bottom: 2px solid transparent; transition: all .2s;
}
.cr-pipe:last-child { border-right: none; }
.cr-pipe.done   { color: var(--neon2); border-bottom-color: var(--neon2); background: rgba(0,204,102,.04); }
.cr-pipe.active { color: var(--neon);  border-bottom-color: var(--neon);  background: rgba(0,255,127,.06); animation: crPulse 1.1s ease infinite; }
@keyframes crPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.rule-editor { background: var(--bg); border: 1px solid var(--border2); }
.re-head { padding: 10px 14px; border-bottom: 1px solid var(--border2); display: flex; align-items: center; justify-content: space-between; }
.re-head-left { font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--text2); display: flex; align-items: center; gap: 6px; }
.re-hash { font-size: 9px; color: var(--text3); font-family: var(--mono); letter-spacing: .04em; }
.re-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }

.cond-grid { display: grid; grid-template-columns: 1fr 110px 1fr; gap: 10px; align-items: end; }
.op-matrix { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
.op-btn {
  font-family: var(--mono); font-size: 9px; letter-spacing: .05em;
  padding: 6px 2px; text-align: center; border: 1px solid var(--border2);
  color: var(--text3); background: transparent; cursor: pointer; transition: all .12s;
}
.op-btn:hover { color: var(--text2); border-color: var(--border); }
.op-btn.sel { border-color: var(--neon3); color: var(--neon); background: rgba(0,255,127,.07); }

.json-pre {
  background: var(--bg3); border: 1px solid var(--border2);
  padding: 10px 14px; font-size: 10px; font-family: var(--mono);
  line-height: 1.8; color: var(--text2); white-space: pre; overflow-x: auto;
  max-height: 180px; overflow-y: auto;
}
.json-pre::-webkit-scrollbar { width: 3px; height: 3px; }
.json-pre::-webkit-scrollbar-thumb { background: var(--border2); }

.nft-block { background: var(--bg3); border: 1px solid var(--border2); }
.nft-block-head { padding: 10px 14px; border-bottom: 1px solid var(--border2); }
.nft-block-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }

.img-drop {
  border: 1px dashed var(--border2); background: var(--bg);
  min-height: 100px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all .15s; overflow: hidden;
}
.img-drop:hover:not(.filled) { border-color: var(--neon3); background: rgba(0,255,127,.02); }
.img-drop.filled { border-color: var(--neon3); border-style: solid; min-height: auto; }
.img-drop img { width: 100%; max-height: 140px; object-fit: cover; display: block; }
.img-ico  { font-size: 24px; opacity: .22; }
.img-lbl  { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--text3); }
.img-hint { font-size: 9px; color: var(--text3); }

.console-wrap { border: 1px solid var(--border2); background: var(--bg); }
.console-head { padding: 6px 12px; border-bottom: 1px solid var(--border2); display: flex; align-items: center; justify-content: space-between; }
.console-title { font-size: 8px; letter-spacing: .18em; text-transform: uppercase; color: var(--text3); }
.console-body { padding: 8px 12px; max-height: 155px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; }
.console-body::-webkit-scrollbar { width: 3px; }
.console-body::-webkit-scrollbar-thumb { background: var(--border2); }
.cl { font-size: 10px; font-family: var(--mono); line-height: 1.75; display: flex; gap: 10px; }
.cl-ts   { color: var(--text3); flex-shrink: 0; min-width: 64px; }
.cl-info { color: var(--text2); }
.cl-ok   { color: var(--neon2); }
.cl-warn { color: var(--amber); }
.cl-err  { color: var(--red); }

.sub-strip {
  padding: 9px 14px; font-size: 11px; border: 1px solid;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
}
.sub-strip.on  { border-color: var(--neon3); color: var(--neon);  background: rgba(0,255,127,.04); }
.sub-strip.off { border-color: #7a4f00;      color: var(--amber); background: rgba(255,179,71,.04); }
.sub-price { font-size: 10px; opacity: .8; font-family: var(--mono); }

.mint-card {
  background: var(--bg3); border: 1px solid var(--neon3);
  padding: 16px 18px; position: relative; animation: slideIn .3s ease;
}
.mint-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--neon); }
.mint-card-title { font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--neon); margin-bottom: 12px; }
.mint-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid var(--border); gap: 16px; }
.mint-row:last-child { border-bottom: none; }
.mint-key { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--text3); flex-shrink: 0; }
.mint-val { font-size: 11px; color: var(--text); word-break: break-all; text-align: right; }
.mint-val.neon  { color: var(--neon); font-size: 16px; font-weight: bold; letter-spacing: .02em; }
.mint-val.amber { color: var(--amber); }
.mint-val.mono  { font-size: 10px; font-family: var(--mono); color: var(--text2); }
.mint-val a { color: var(--blue); text-decoration: none; }
.mint-val a:hover { text-decoration: underline; }

.env-warn-block {
  padding: 10px 14px; border: 1px solid #7a4f00;
  color: var(--amber); background: rgba(255,179,71,.04); font-size: 10px; line-height: 1.8;
}
.env-warn-block code { font-family: var(--mono); background: rgba(255,179,71,.1); padding: 1px 4px; }
`

// ─── Stage pipeline config ─────────────────────────────────────────────────────
const PIPELINE: Array<{ key: Stage; short: string; label: string }> = [
  { key: 'checking', short: 'Check', label: 'Checking contract...' },
  {
    key: 'subscribing',
    short: '★ Sub',
    label: 'Subscribing — confirm in wallet...',
  },
  { key: 'img-upload', short: 'Image', label: 'Uploading image to IPFS...' },
  { key: 'meta-upload', short: 'Meta', label: 'Uploading metadata to IPFS...' },
  {
    key: 'creating',
    short: 'Create',
    label: 'createRule() — confirm in wallet',
  },
  {
    key: 'activating',
    short: 'Mint',
    label: 'activateRule() — confirm in wallet',
  },
  { key: 'verifying', short: 'Verify', label: 'Verifying expiry...' },
  { key: 'done', short: '✓', label: 'Done!' },
]

const OPS = ['==', '!=', '>=', '<=', '>', '<'] as const
type Op = (typeof OPS)[number]

const FIELD_HINTS = [
  'tx.amount',
  'tx.amount|mod:666000000',
  'tx.amount|mod:1000000',
  'tx.sender',
  'tx.receiver',
  'tx.asset',
  'env.timestamp',
  'state.spentToday',
]

// ─── Component ────────────────────────────────────────────────────────────────
export function CreateRuleTab() {
  const { contracts } = usePayIDContext()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  // ── Stage & logs ──────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('idle')
  const [logs, setLogs] = useState<
    Array<{ ts: string; level: LogLevel; msg: string }>
  >([])
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [result, setResult] = useState<MintResult | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)

  const log = useCallback((msg: string, level: LogLevel = 'info') => {
    setLogs((prev) => [...prev.slice(-60), { ts: nowTs(), level, msg }])
  }, [])

  useEffect(() => {
    if (consoleRef.current)
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [logs])

  // ── Rule object state — default = RULE_OBJECT from your script ────────────
  const [ruleId, setRuleId] = useState('no_cursed')
  const [comment, setComment] = useState('Blokir amount kelipatan 666')
  const [field, setField] = useState('tx.amount|mod:666000000')
  const [op, setOp] = useState<Op>('!=')
  const [value, setValue] = useState('0')
  const [msg, setMsg] = useState('666 USDC? Duit setan, ditolak 👹')

  // ── NFT metadata ──────────────────────────────────────────────────────────
  const [nftName, setNftName] = useState('PAY.ID Rule NFT')
  const [nftDesc, setNftDesc] = useState('PAY.ID programmable payment policy')
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Subscription reads ────────────────────────────────────────────────────
  const { data: rawHasSub, refetch: refetchSub } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ABI,
    functionName: 'hasSubscription',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const hasSub = rawHasSub

  const { data: rawPrice } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ABI,
    functionName: 'subscriptionPriceETH',
  })
  const subPrice = rawPrice

  const { data: subData } = useSubscription(address)
  const sub = subData as
    | {
        isActive: boolean
        expiry: bigint
        logicalRuleCount: number
        maxSlots: number
      }
    | undefined

  // ── Derived: ruleObject + hash ────────────────────────────────────────────
  const ruleObj = useMemo<RuleObject>(
    () => ({
      ...(comment.trim() ? { _comment: comment.trim() } : {}),
      id: ruleId || 'rule',
      if: { field, op, value: isNaN(Number(value)) ? value : Number(value) },
      message: msg,
    }),
    [ruleId, comment, field, op, value, msg],
  )

  const ruleHash = useMemo<Hash>(() => {
    try {
      return keccak256(toBytes(canonicalize(ruleObj)))
    } catch {
      return '0x' as Hash
    }
  }, [ruleObj])

  // ── Image handling ────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    const r = new FileReader()
    r.onload = (e) => setImgUrl(e.target?.result as string)
    r.readAsDataURL(file)
  }

  // ── Stage helpers ─────────────────────────────────────────────────────────
  const stageIdx = (s: Stage) => PIPELINE.findIndex((x) => x.key === s)
  const pipeClass = (s: Stage) => {
    if (stage === 'idle' || stage === 'error') return ''
    const ci = stageIdx(stage),
      si = stageIdx(s)
    if (si < 0) return ''
    if (si < ci) return 'done'
    if (si === ci) return 'active'
    return ''
  }
  const currentLabel = PIPELINE.find((p) => p.key === stage)?.label ?? ''

  // ── Main flow ─────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    if (!address || !publicClient) return
    setErrMsg(null)
    setResult(null)
    setLogs([])

    try {
      // ── Step 0: Check contract ──────────────────────────────────────────
      setStage('checking')
      log('Checking contract deployment...')
      const code = await publicClient.getCode({
        address: contracts.ruleItemERC721,
      })
      if (!code || code === '0x')
        throw new Error('RuleItemERC721 not deployed on this network')
      log('Contract found ✓', 'ok')

      // ── Step 1: Subscribe if not subscribed ─────────────────────────────
      await refetchSub()
      if (!hasSub) {
        setStage('subscribing')
        const price = subPrice ?? parseEther('0.001')
        log(
          `No active subscription → subscribing (${(Number(price) / 1e18).toFixed(6)} ETH)...`,
        )
        const h = await writeContractAsync({
          address: contracts.ruleItemERC721,
          abi: ABI,
          functionName: 'subscribe',
          args: [],
          value: price,
        })
        log(`Subscribe tx: ${h.slice(0, 20)}...`)
        await publicClient.waitForTransactionReceipt({ hash: h })
        log('Subscribed ✓', 'ok')
      } else {
        log('Already subscribed ✓', 'ok')
      }

      // ── Step 2: Upload image ────────────────────────────────────────────
      setStage('img-upload')
      log('Uploading image to IPFS (Pinata)...')
      const imgToPin = imgUrl ?? genImage(ruleId, ruleHash)
      const { url: imageURL } = await pinImage(imgToPin, `rule-${ruleId}.png`)
      log(`Image: ${imageURL.slice(0, 48)}...`, 'ok')

      // ── Step 3: Upload metadata JSON ────────────────────────────────────
      setStage('meta-upload')
      const canonicalRule = canonicalize(ruleObj)
      const finalHash = keccak256(toBytes(canonicalRule))

      const metadata = {
        name: nftName || `PAY.ID Rule — ${ruleId}`,
        description: nftDesc || 'PAY.ID programmable payment policy',
        image: imageURL,
        attributes: [
          { trait_type: 'Rule ID', value: ruleId },
          { trait_type: 'Engine', value: 'PAY.ID' },
          { trait_type: 'Category', value: 'Transaction Rule' },
          { trait_type: 'Operator', value: op },
        ],
        rule: ruleObj,
        ruleHash: finalHash,
        standard: 'payid.rule.v1',
      }

      log('Uploading metadata JSON to IPFS (Pinata)...')
      const { cid, url: previewURL } = await pinJson(
        metadata,
        `rule-${ruleId}.json`,
      )
      const tokenURI = `ipfs://${cid}`
      log(`tokenURI: ${tokenURI}`, 'ok')
      log(`Preview:  ${previewURL.slice(0, 48)}...`, 'ok')

      // ── Step 4: createRule(ruleHash, tokenURI) ──────────────────────────
      setStage('creating')
      log('Sending createRule() — confirm in wallet...')
      const createHash = await writeContractAsync({
        address: contracts.ruleItemERC721,
        abi: ABI,
        functionName: 'createRule',
        args: [finalHash, tokenURI],
      })
      log(`createRule tx: ${createHash.slice(0, 20)}...`)
      const createReceipt = await publicClient.waitForTransactionReceipt({
        hash: createHash,
      })
      log('createRule confirmed ✓', 'ok')

      // Parse RuleCreated event → ruleId
      let onChainRuleId: bigint | null = null
      for (const l of createReceipt.logs) {
        try {
          const d = decodeEventLog({
            abi: ABI,
            data: l.data,
            topics: l.topics,
            eventName: 'RuleCreated',
          })
          onChainRuleId = d.args.ruleId
          break
        } catch {
          /* skip */
        }
      }
      if (onChainRuleId === null)
        throw new Error('RuleCreated event not found in receipt')
      log(`Rule ID: ${onChainRuleId.toString()}`, 'ok')

      // ── Step 5: activateRule(ruleId) ────────────────────────────────────
      setStage('activating')
      log('Sending activateRule() — confirm in wallet...')
      const activateHash = await writeContractAsync({
        address: contracts.ruleItemERC721,
        abi: ABI,
        functionName: 'activateRule',
        args: [onChainRuleId],
      })
      log(`activateRule tx: ${activateHash.slice(0, 20)}...`)
      const activateReceipt = await publicClient.waitForTransactionReceipt({
        hash: activateHash,
      })
      log('activateRule confirmed ✓', 'ok')

      // Parse RuleActivated event → tokenId
      let tokenId: bigint | null = null
      for (const l of activateReceipt.logs) {
        try {
          const d = decodeEventLog({
            abi: ABI,
            data: l.data,
            topics: l.topics,
            eventName: 'RuleActivated',
          })
          tokenId = d.args.tokenId
          break
        } catch {
          /* skip */
        }
      }
      if (tokenId === null)
        throw new Error('RuleActivated event not found in receipt')
      log(`NFT Token ID: ${tokenId.toString()}`, 'ok')

      // ── Step 6: Verify expiry ───────────────────────────────────────────
      setStage('verifying')
      log('Reading ruleExpiry() from contract...')
      const expiry = await publicClient.readContract({
        address: contracts.ruleItemERC721,
        abi: ABI,
        functionName: 'ruleExpiry',
        args: [tokenId],
      })

      const now = BigInt(Math.floor(Date.now() / 1000))
      if (expiry <= now)
        throw new Error(
          'Rule expiry is in the past — subscription may have failed',
        )

      log(`Expiry: ${fmtDate(expiry)} (${daysLeft(expiry)} days left)`, 'ok')
      log('🎉 Rule NFT ready!', 'ok')

      setResult({
        ruleId: onChainRuleId,
        tokenId,
        expiry,
        tokenURI,
        cid,
        previewURL,
      })
      setStage('done')
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string }
      const raw = err.shortMessage ?? err.message ?? String(e)
      const clean = raw.toLowerCase().includes('user rejected')
        ? 'Transaction rejected by user'
        : raw
      setErrMsg(clean)
      log(`Error: ${clean}`, 'err')
      setStage('error')
    }
  }, [
    address,
    publicClient,
    writeContractAsync,
    contracts,
    hasSub,
    subPrice,
    refetchSub,
    ruleObj,
    ruleHash,
    ruleId,
    op,
    imgUrl,
    nftName,
    nftDesc,
    log,
  ])

  const isRunning = !['idle', 'done', 'error'].includes(stage)
  const canRun = !isRunning && !!address && !!ruleId.trim()

  return (
    <div className="col">
      {/* ── Sub banner ── */}
      <div className={`sub-strip ${sub?.isActive ? 'on' : 'off'}`}>
        <span>
          {sub?.isActive
            ? `★ Subscription active — ${daysLeft(sub.expiry)} days remaining · ${sub.logicalRuleCount}/${sub.maxSlots} slots used`
            : '★ No active subscription — will auto-subscribe on create'}
        </span>
        {!sub?.isActive && subPrice !== undefined && subPrice > 0n && (
          <span className="sub-price">
            +{(Number(subPrice) / 1e18).toFixed(6)} ETH
          </span>
        )}
      </div>

      {/* ── Pipeline strip ── */}
      <div className="cr-pipe-wrap">
        {PIPELINE.map((p) => (
          <div key={p.key} className={`cr-pipe ${pipeClass(p.key)}`}>
            {pipeClass(p.key) === 'active' && (
              <span
                className="spin"
                style={{ width: 7, height: 7, marginRight: 3 }}
              />
            )}
            {p.short}
          </div>
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">◈</span> Create Rule NFT
            {isRunning && (
              <span
                style={{ color: 'var(--neon)', fontWeight: 400, fontSize: 10 }}
              >
                <span className="spin" style={{ marginRight: 5 }} />
                {currentLabel}
              </span>
            )}
          </div>
          {(stage === 'done' || stage === 'error') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setStage('idle')
                setResult(null)
                setErrMsg(null)
                setLogs([])
              }}
            >
              ↺ New
            </button>
          )}
        </div>

        <div className="rc-card-body col">
          {/* ── RULE_OBJECT editor ── */}
          <div className="rule-editor">
            <div className="re-head">
              <div className="re-head-left">
                <span style={{ color: 'var(--neon)' }}>◈</span> RULE_OBJECT
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}>
                  — edit your rule
                </span>
              </div>
              <span className="re-hash">{ruleHash.slice(0, 18)}…</span>
            </div>
            <div className="re-body">
              <div className="grid2">
                <div className="field">
                  <div className="field-label">id *</div>
                  <input
                    className="field-input"
                    placeholder="no_cursed"
                    value={ruleId}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setRuleId(e.target.value)
                    }
                    disabled={isRunning}
                  />
                </div>
                <div className="field">
                  <div className="field-label">_comment</div>
                  <input
                    className="field-input"
                    placeholder="Blokir amount kelipatan 666"
                    value={comment}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setComment(e.target.value)
                    }
                    disabled={isRunning}
                  />
                </div>
              </div>

              {/* Condition builder */}
              <div
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                  padding: '12px',
                }}
              >
                <div
                  className="field-label"
                  style={{ marginBottom: 8, color: 'var(--text2)' }}
                >
                  if →
                </div>
                <div className="cond-grid">
                  <div className="field">
                    <div className="field-label">field</div>
                    <input
                      className="field-input"
                      list="cr-field-hints"
                      placeholder="tx.amount|mod:666000000"
                      value={field}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setField(e.target.value)
                      }
                      disabled={isRunning}
                    />
                    <datalist id="cr-field-hints">
                      {FIELD_HINTS.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                    <div className="field-hint">
                      pipe transform: field|mod:N, field|div:N
                    </div>
                  </div>

                  <div className="field">
                    <div className="field-label">op</div>
                    <div className="op-matrix">
                      {OPS.map((o) => (
                        <button
                          key={o}
                          className={`op-btn ${op === o ? 'sel' : ''}`}
                          onClick={() => setOp(o)}
                          disabled={isRunning}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <div className="field-label">value</div>
                    <input
                      className="field-input"
                      placeholder="0"
                      value={value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setValue(e.target.value)
                      }
                      disabled={isRunning}
                    />
                    <div className="field-hint">
                      USDC 6 dec: 100 = 100000000
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <div className="field-label">
                  message (deny reason shown to sender)
                </div>
                <input
                  className="field-input"
                  placeholder="666 USDC? Duit setan, ditolak 👹"
                  value={msg}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setMsg(e.target.value)
                  }
                  disabled={isRunning}
                />
              </div>

              {/* Live JSON preview */}
              <div>
                <div className="field-label" style={{ marginBottom: 5 }}>
                  JSON preview
                  <span
                    style={{
                      color: 'var(--text3)',
                      marginLeft: 8,
                      fontWeight: 400,
                    }}
                  >
                    (canonicalized → keccak256 → ruleHash)
                  </span>
                </div>
                <pre className="json-pre">
                  {JSON.stringify(ruleObj, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* ── NFT metadata ── */}
          <div className="nft-block">
            <div className="nft-block-head">
              <div className="field-label" style={{ color: 'var(--text2)' }}>
                NFT Metadata → IPFS upload
              </div>
            </div>
            <div className="nft-block-body">
              <div className="grid2">
                <div className="field">
                  <div className="field-label">NFT Name</div>
                  <input
                    className="field-input"
                    placeholder="PAY.ID Rule NFT"
                    value={nftName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNftName(e.target.value)
                    }
                    disabled={isRunning}
                  />
                </div>
                <div className="field">
                  <div className="field-label">Description</div>
                  <input
                    className="field-input"
                    placeholder="PAY.ID payment policy"
                    value={nftDesc}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNftDesc(e.target.value)
                    }
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="field">
                <div className="field-label" style={{ marginBottom: 5 }}>
                  NFT Image
                  <span
                    style={{
                      color: 'var(--text3)',
                      fontWeight: 400,
                      marginLeft: 6,
                    }}
                  >
                    auto-generated if empty
                  </span>
                </div>
                <div
                  className={`img-drop ${imgUrl ? 'filled' : ''}`}
                  onClick={() => !isRunning && fileRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files[0]
                    if (f.type.startsWith('image/')) handleFile(f)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt="NFT preview" />
                  ) : (
                    <>
                      <div className="img-ico">🖼</div>
                      <div className="img-lbl">
                        Drop image or click to upload
                      </div>
                      <div className="img-hint">
                        PNG, JPG, GIF · will auto-generate if empty
                      </div>
                    </>
                  )}
                </div>
                {imgUrl && !isRunning && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 6 }}
                    onClick={() => setImgUrl(null)}
                  >
                    ✕ Remove — use auto-generated
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Console ── */}
          {logs.length > 0 && (
            <div className="console-wrap">
              <div className="console-head">
                <span className="console-title">◈ Console</span>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text3)',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontFamily: 'var(--mono)',
                  }}
                  onClick={() => setLogs([])}
                >
                  clear
                </button>
              </div>
              <div className="console-body" ref={consoleRef}>
                {logs.map((l, i) => (
                  <div key={i} className="cl">
                    <span className="cl-ts">[{l.ts}]</span>
                    <span className={`cl-${l.level}`}>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Pinata env warning ── */}
          {!getJWT() && (
            <div className="env-warn-block">
              ⚠ <strong>VITE_PINATA_JWT</strong> not set — IPFS upload will
              fail.
              <br />
              Add to <code>.env</code>:<br />
              <code>VITE_PINATA_JWT=eyJhbGci...</code>
              <br />
              <code>VITE_PINATA_GATEWAY=https://gateway.pinata.cloud</code>
            </div>
          )}

          {/* ── Error ── */}
          {errMsg && (
            <div className="alert alert-err">
              <div className="alert-icon">✗</div>
              <div className="alert-body">{errMsg}</div>
              <button
                onClick={() => setErrMsg(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.5,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div className="mint-card">
              <div className="mint-card-title">
                ◈ Rule NFT Minted Successfully
              </div>
              <div className="mint-row">
                <span className="mint-key">Rule ID</span>
                <span className="mint-val neon">
                  #{result.ruleId.toString()}
                </span>
              </div>
              <div className="mint-row">
                <span className="mint-key">Token ID (NFT)</span>
                <span className="mint-val neon">
                  #{result.tokenId.toString()}
                </span>
              </div>
              <div className="mint-row">
                <span className="mint-key">Expiry</span>
                <span className="mint-val amber">
                  {fmtDate(result.expiry)} &nbsp;·&nbsp;{' '}
                  {daysLeft(result.expiry)} days left
                </span>
              </div>
              <div className="mint-row">
                <span className="mint-key">Token URI</span>
                <span className="mint-val mono">{result.tokenURI}</span>
              </div>
              <div className="mint-row">
                <span className="mint-key">IPFS Preview</span>
                <span className="mint-val">
                  <a
                    href={result.previewURL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.previewURL.slice(0, 44)}… ↗
                  </a>
                </span>
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <button
            className={`btn btn-full ${stage === 'done' ? 'btn-secondary' : 'btn-primary'}`}
            style={{ marginTop: 4 }}
            onClick={canRun ? () => void run() : undefined}
            disabled={!canRun}
          >
            {isRunning ? (
              <>
                <span className="spin" /> {currentLabel}
              </>
            ) : stage === 'done' ? (
              '↺ Create Another Rule NFT'
            ) : (
              '◈ Create & Mint Rule NFT'
            )}
          </button>

          {!address && (
            <div className="alert alert-warn">
              <div className="alert-icon">!</div>
              <div className="alert-body">
                Connect wallet to create rule NFTs
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateRuleTab
