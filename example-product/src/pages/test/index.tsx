/**
 * PAY.ID Rule Console — Full TypeScript
 * Place inside <WagmiProvider> + <QueryClientProvider> + <PayIDProvider>
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { keccak256, parseEther, toBytes } from 'viem'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import {
  useActiveCombinedRule,
  useAllCombinedRules,
  useMyRules,
  usePayIDContext,
  usePayIDFlow,
  useRules,
  useSubscription,
} from 'payid-react'
import { CREATE_RULE_CSS, CreateRuleTab } from './CreateRuleTab'
import { RuleNFTCard } from './RuleNFTCard'
import type { Address, Hash, WriteContractParameters } from 'viem'
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react'
import type {
  CombinedRule,
  PayIDFlowParams,
  PayIDFlowStatus,
  RuleDefinition,
  RuleRef,
} from 'payid-react'
import type { Connector } from 'wagmi'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #080c08; --bg2: #0d130d; --bg3: #121a12;
  --neon:    #00ff7f; --neon2: #00cc66; --neon3: #004d26;
  --amber:   #ffb347; --red: #ff4757; --blue: #3d9fff;
  --text:    #d4f5d4; --text2: #6b9b6b; --text3: #2d4d2d;
  --border:  #1a2e1a; --border2: #243824;
  --mono:    'JetBrains Mono', monospace;
  --display: 'Syne', sans-serif;
}
body { background: var(--bg); }
.rc-wrap {
  min-height: 100vh; background: var(--bg); color: var(--text);
  font-family: var(--mono); font-size: 13px;
}
.rc-wrap::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 100;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px,
    rgba(0,255,127,0.015) 2px, rgba(0,255,127,0.015) 4px);
}
.rc-header {
  background: var(--bg2); border-bottom: 1px solid var(--border2);
  padding: 0 24px; height: 54px; display: flex; align-items: center;
  justify-content: space-between; position: sticky; top: 0; z-index: 50;
}
.rc-logo {
  font-family: var(--display); font-weight: 800; font-size: 18px;
  letter-spacing: -0.02em; color: var(--neon);
  text-shadow: 0 0 20px rgba(0,255,127,0.5);
}
.rc-logo span { color: var(--text2); font-weight: 400; font-size: 13px; margin-left: 8px; font-family: var(--mono); }
.rc-hright { display: flex; align-items: center; gap: 10px; }
.rc-pill { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; padding: 4px 10px; border: 1px solid var(--border2); color: var(--text2); background: var(--bg3); }
.rc-pill.online { border-color: var(--neon3); color: var(--neon); }
.rc-pill.online::before { content: '● '; }
.rc-tabs { display: flex; background: var(--bg2); border-bottom: 1px solid var(--border2); padding: 0 24px; overflow-x: auto; }
.rc-tab { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text3); background: transparent; border: none; border-bottom: 2px solid transparent; padding: 13px 18px; cursor: pointer; white-space: nowrap; transition: all .15s; display: flex; align-items: center; gap: 6px; }
.rc-tab:hover { color: var(--text2); }
.rc-tab.active { color: var(--neon); border-bottom-color: var(--neon); }
.tab-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.rc-main { max-width: 1100px; margin: 0 auto; padding: 28px 24px; display: flex; flex-direction: column; gap: 20px; }
.rc-card { background: var(--bg2); border: 1px solid var(--border); position: relative; }
.rc-card-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.rc-card-title { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--text2); display: flex; align-items: center; gap: 8px; }
.rc-card-title .accent { color: var(--neon); }
.rc-card-body { padding: 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--text3); }
.field-input { font-family: var(--mono); font-size: 12px; background: var(--bg3); border: 1px solid var(--border2); color: var(--text); padding: 10px 14px; outline: none; width: 100%; transition: border-color .15s; }
.field-input:focus { border-color: var(--neon3); }
.field-input::placeholder { color: var(--text3); }
.field-input:disabled { opacity: .4; cursor: not-allowed; }
.field-hint { font-size: 9px; color: var(--text3); margin-top: 2px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn { font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; border: 1px solid; padding: 10px 20px; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 8px; }
.btn:disabled { opacity: .35; cursor: not-allowed; }
.btn-primary { background: var(--neon3); border-color: var(--neon2); color: var(--neon); }
.btn-primary:hover:not(:disabled) { background: var(--neon2); color: var(--bg); border-color: var(--neon); }
.btn-secondary { background: transparent; border-color: var(--border2); color: var(--text2); }
.btn-secondary:hover:not(:disabled) { border-color: var(--text2); color: var(--text); }
.btn-amber { background: transparent; border-color: #7a4f00; color: var(--amber); }
.btn-amber:hover:not(:disabled) { background: #7a4f00; color: var(--bg); }
.btn-danger { background: transparent; border-color: #7a0000; color: var(--red); }
.btn-danger:hover:not(:disabled) { background: #7a0000; color: #fff; }
.btn-full { width: 100%; justify-content: center; }
.btn-sm { padding: 6px 14px; font-size: 10px; }
.btn-connect { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; background: transparent; border: 1px solid var(--neon3); color: var(--neon2); padding: 7px 16px; cursor: pointer; transition: all .15s; }
.btn-connect:hover:not(:disabled) { background: var(--neon3); border-color: var(--neon); color: var(--neon); }
.btn-connect:disabled { opacity: .4; cursor: not-allowed; }
.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; padding: 3px 8px; border: 1px solid; }
.badge-active   { border-color: var(--neon3); color: var(--neon);  background: rgba(0,255,127,.05); }
.badge-inactive { border-color: var(--border2); color: var(--text3); }
.badge-red      { border-color: #7a0000; color: var(--red);   background: rgba(255,71,87,.05); }
.badge-blue     { border-color: #1a3d6b; color: var(--blue);  background: rgba(61,159,255,.05); }
.rule-card { background: var(--bg3); border: 1px solid var(--border2); padding: 14px 16px; position: relative; transition: border-color .15s; }
.rule-card:hover { border-color: var(--border); }
.rule-id   { font-size: 9px;  color: var(--text3); letter-spacing: .08em; margin-bottom: 4px; }
.rule-uri  { font-size: 11px; color: var(--text2); word-break: break-all; margin-bottom: 8px; }
.rule-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
.rule-meta { font-size: 9px; color: var(--text3); display: flex; gap: 12px; }
.check-card { background: var(--bg3); border: 1px solid var(--border2); padding: 12px 14px; cursor: pointer; transition: all .15s; display: flex; align-items: flex-start; gap: 10px; }
.check-card:hover { border-color: var(--border); }
.check-card.checked { border-color: var(--neon3); background: rgba(0,255,127,.03); }
.check-box { width: 14px; height: 14px; border: 1px solid var(--border2); flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--neon); background: var(--bg); transition: all .15s; }
.check-card.checked .check-box { border-color: var(--neon); background: var(--neon3); }
.alert { padding: 12px 16px; border: 1px solid; font-size: 11px; line-height: 1.6; display: flex; gap: 10px; align-items: flex-start; animation: slideIn .2s ease; }
@keyframes slideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
.alert-ok   { border-color: var(--neon3); color: var(--neon);  background: rgba(0,255,127,.04); }
.alert-err  { border-color: #7a0000;      color: var(--red);   background: rgba(255,71,87,.04); }
.alert-warn { border-color: #7a4f00;      color: var(--amber); background: rgba(255,179,71,.04); }
.alert-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
.alert-body { flex: 1; }
.alert-hash { font-size: 10px; word-break: break-all; opacity: .7; margin-top: 4px; cursor: pointer; }
.flow-steps { display: flex; }
.flow-step { flex: 1; text-align: center; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; padding: 6px 4px; color: var(--text3); border-bottom: 2px solid var(--border2); transition: all .3s; }
.flow-step.done   { color: var(--neon2); border-color: var(--neon2); }
.flow-step.active { color: var(--neon);  border-color: var(--neon); animation: stepPulse 1.2s infinite; }
@keyframes stepPulse { 0%,100%{ opacity:1 } 50%{ opacity:.5 } }
.sub-meter { display: flex; gap: 4px; margin-top: 6px; }
.sub-slot  { height: 6px; flex: 1; background: var(--border2); transition: background .3s; }
.sub-slot.used { background: var(--neon2); }
.combine-preview { background: var(--bg); border: 1px solid var(--border2); padding: 12px 14px; font-size: 11px; line-height: 1.8; color: var(--text2); min-height: 60px; }
.combine-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.token-chip { font-family: var(--mono); font-size: 10px; padding: 5px 12px; border: 1px solid var(--border2); color: var(--text2); background: transparent; cursor: pointer; transition: all .12s; }
.token-chip.active { border-color: var(--neon3); color: var(--neon); background: rgba(0,255,127,.05); }
.wallet-menu { position: absolute; top: calc(100% + 4px); right: 0; background: var(--bg2); border: 1px solid var(--border2); min-width: 180px; z-index: 200; }
.wallet-menu-item { display: block; width: 100%; text-align: left; font-family: var(--mono); font-size: 11px; letter-spacing: .08em; padding: 10px 16px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text2); cursor: pointer; transition: background .1s; }
.wallet-menu-item:last-child { border-bottom: none; }
.wallet-menu-item:hover { background: var(--bg3); color: var(--text); }
.spin { display: inline-block; width: 10px; height: 10px; border: 1px solid var(--border2); border-top-color: var(--neon); border-radius: 50%; animation: rot .6s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.empty { padding: 40px; text-align: center; color: var(--text3); font-size: 11px; letter-spacing: .08em; }
.empty-icon { font-size: 32px; margin-bottom: 10px; opacity: .3; }
.divider { height: 1px; background: var(--border); margin: 16px 0; }
.scroll-list { display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto; padding-right: 4px; }
.scroll-list::-webkit-scrollbar { width: 4px; }
.scroll-list::-webkit-scrollbar-track { background: var(--bg); }
.scroll-list::-webkit-scrollbar-thumb { background: var(--border2); }
.row-between { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.row  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.col  { display: flex; flex-direction: column; gap: 12px; }
.addr-short { font-size: 10px; color: var(--text3); }
`

// ABI
const RULE_NFT_ABI = [
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
] as const

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
  {
    name: 'deactivateMyCombinedRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

// Types & Constants
interface Token {
  symbol: string
  address: Address
  decimals: number
  logo: string
}

// Tokens per chain — sesuaikan address dengan network yang dipakai
const TOKENS_BY_CHAIN: Record<number, ReadonlyArray<Token>> = {
  // Hardhat local
  31337: [
    {
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logo: 'Ξ',
    },
    {
      symbol: 'USDC',
      address: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // MockERC20 deploy
      decimals: 6,
      logo: '$',
    },
  ],
  // Lisk Sepolia
  4202: [
    {
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logo: 'Ξ',
    },
    {
      symbol: 'USDT',
      address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
      decimals: 6,
      logo: '₮',
    },
  ],
}

const DEFAULT_TOKENS: ReadonlyArray<Token> = [
  {
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logo: 'Ξ',
  },
]

// Flow steps — include 'approving' untuk ERC20
const FLOW_STEPS: ReadonlyArray<PayIDFlowStatus> = [
  'fetching-rule',
  'evaluating',
  'proving',
  'approving',
  'awaiting-wallet',
  'confirming',
  'success',
]

const FLOW_LABELS: ReadonlyArray<string> = [
  'Fetch',
  'Eval',
  'Prove',
  'Approve',
  'Sign',
  'Confirm',
  'Done',
]

const TABS = [
  { id: 'rules', label: 'Rule NFTs', icon: '◈' },
  { id: 'create', label: 'Create Rule', icon: '＋' },
  { id: 'combine', label: 'Combine', icon: '⊕' },
  { id: 'subscription', label: 'Subscription', icon: '★' },
  { id: 'transact', label: 'Pay', icon: '→' },
] as const

type TabId = (typeof TABS)[number]['id']
type AlertType = 'ok' | 'err' | 'warn'
type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'
type StepState = 'idle' | 'active' | 'done'
type CombineDirection = 'none' | 'inbound' | 'outbound'
type RuleFilter = 'all' | 'mine' | 'active'

// Helpers
const shortAddr = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
const shortHash = (h?: string): string =>
  h ? `${h.slice(0, 10)}...${h.slice(-6)}` : '—'
const formatExpiry = (ts?: bigint): string =>
  !ts || ts === 0n
    ? 'No expiry'
    : new Date(Number(ts) * 1000).toLocaleDateString()

// useTx
interface TxState {
  send: (args: WriteContractParameters) => Promise<void>
  hash: Hash | null
  status: TxStatus
  error: string | null
  reset: () => void
  isPending: boolean
}

function useTx(): TxState {
  const { writeContractAsync } = useWriteContract()
  const [hash, setHash] = useState<Hash | null>(null)
  const [status, setStatus] = useState<TxStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
  })

  useEffect(() => {
    if (confirmed && status === 'confirming') setStatus('success')
  }, [confirmed, status])

  const send = useCallback(
    async (args: WriteContractParameters) => {
      setStatus('pending')
      setError(null)
      setHash(null)
      try {
        const h = await writeContractAsync(args)
        setHash(h)
        setStatus('confirming')
      } catch (e: unknown) {
        const err = e as { shortMessage?: string; message?: string }
        const msg = err.shortMessage ?? err.message ?? String(e)
        setError(
          msg.toLowerCase().includes('user rejected')
            ? 'Transaction rejected'
            : msg,
        )
        setStatus('error')
      }
    },
    [writeContractAsync],
  )

  const reset = useCallback(() => {
    setHash(null)
    setStatus('idle')
    setError(null)
  }, [])

  return {
    send,
    hash,
    status,
    error,
    reset,
    isPending: status === 'pending' || status === 'confirming',
  }
}

// Alert
interface AlertProps {
  type?: AlertType
  icon?: string
  title: string
  hash?: Hash | string | null
  onDismiss?: () => void
}

function Alert({ type = 'ok', icon, title, hash, onDismiss }: AlertProps) {
  const cls = { ok: 'alert-ok', err: 'alert-err', warn: 'alert-warn' }[type]
  const ico = icon ?? { ok: '✓', err: '✗', warn: '!' }[type]
  return (
    <div className={`alert ${cls}`}>
      <div className="alert-icon">{ico}</div>
      <div className="alert-body">
        <div>{title}</div>
        {hash && (
          <div
            className="alert-hash"
            onClick={() => navigator.clipboard.writeText(hash)}
            title="Click to copy"
          >
            TX: {hash}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
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
      )}
    </div>
  )
}

// WalletButton
function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showMenu, setShowMenu] = useState(false)

  const handleConnect = useCallback(
    (connector: Connector) => {
      connect({ connector })
      setShowMenu(false)
    },
    [connect],
  )

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="rc-pill online">{shortAddr(address)}</div>
        <button className="btn-connect" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    )
  }

  if (connectors.length === 1) {
    return (
      <button
        className="btn-connect"
        disabled={isPending}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? <span className="spin" /> : '○ Connect Wallet'}
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn-connect"
        onClick={() => setShowMenu((v) => !v)}
        disabled={isPending}
      >
        {isPending ? <span className="spin" /> : '○ Connect Wallet ▾'}
      </button>
      {showMenu && (
        <div className="wallet-menu">
          {connectors.map((c) => (
            <button
              key={c.id}
              className="wallet-menu-item"
              onClick={() => handleConnect(c)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// RulesTab
function RulesTab({ myAddress }: { myAddress: Address | undefined }) {
  const { contracts } = usePayIDContext()
  const [filter, setFilter] = useState<RuleFilter>('all')
  const { data: allRules = [], isLoading, refetch } = useMyRules()
  const tx = useTx()

  const filtered = useMemo<Array<RuleDefinition>>(() => {
    if (filter === 'mine')
      return allRules.filter(
        (r) => r.creator.toLowerCase() === myAddress?.toLowerCase(),
      )
    if (filter === 'active') return allRules.filter((r) => r.active)
    return allRules
  }, [allRules, filter, myAddress])

  return (
    <div className="col">
      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">◈</span> Rule NFTs{' '}
            <span style={{ color: 'var(--text3)', marginLeft: 6 }}>
              ({allRules.length})
            </span>
          </div>
          <div className="row">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'mine', 'active'] as Array<RuleFilter>).map((f) => (
                <button
                  key={f}
                  className={`token-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void refetch()}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
        <div className="rc-card-body">
          {tx.status === 'success' && (
            <div style={{ marginBottom: 12 }}>
              <Alert
                type="ok"
                title="Rule activated — NFT minted!"
                hash={tx.hash}
                onDismiss={tx.reset}
              />
            </div>
          )}
          {tx.status === 'error' && (
            <div style={{ marginBottom: 12 }}>
              <Alert
                type="err"
                title={tx.error ?? 'Error'}
                onDismiss={tx.reset}
              />
            </div>
          )}
          {isLoading && (
            <div className="empty">
              <span className="spin" style={{ width: 20, height: 20 }} />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">◈</div>No rules found
            </div>
          )}
          <div className="scroll-list">
            {filtered.map((rule) => (
              <RuleNFTCard
                key={rule.ruleId.toString()}
                rule={rule}
                myAddress={myAddress}
                tx={tx}
                contracts={contracts}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// CombineTab
function CombineTab({ myAddress }: { myAddress: Address | undefined }) {
  const { contracts } = usePayIDContext()
  const { data: myRules = [], isLoading } = useRules({ creator: myAddress })
  const { data: activeCombined } = useActiveCombinedRule(myAddress)
  const { data: allCombined = [], refetch: refetchAll } = useAllCombinedRules()

  const [selected, setSelected] = useState<Array<RuleDefinition>>([])
  const [direction, setDirection] = useState<CombineDirection>('none')
  const [version, setVersion] = useState('1')
  const tx = useTx()

  const activeRules = useMemo<Array<RuleDefinition>>(
    () => myRules.filter((r) => r.active),
    [myRules],
  )

  const combinedHash = useMemo<Hash | null>(() => {
    if (!selected.length) return null
    try {
      return keccak256(
        toBytes(
          selected
            .map((r) => `${r.tokenId}:${r.ruleHash}`)
            .sort()
            .join('|'),
        ),
      )
    } catch {
      return null
    }
  }, [selected])

  const toggleRule = useCallback(
    (rule: RuleDefinition) =>
      setSelected((prev) =>
        prev.some((r) => r.ruleId === rule.ruleId)
          ? prev.filter((r) => r.ruleId !== rule.ruleId)
          : [...prev, rule],
      ),
    [],
  )

  const handleCombine = () => {
    if (!combinedHash) return
    const ruleNFTs = selected.map<Address>(() => contracts.ruleItemERC721)
    const tokenIds = selected.map((r) => r.tokenId)
    const ver = BigInt(version || '1')
    if (direction === 'none') {
      void tx.send({
        address: contracts.combinedRuleStorage,
        abi: COMBINED_ABI,
        functionName: 'registerCombinedRule',
        args: [combinedHash, ruleNFTs, tokenIds, ver],
        chain: undefined,
        account: null,
      })
    } else {
      void tx.send({
        address: contracts.combinedRuleStorage,
        abi: COMBINED_ABI,
        functionName: 'registerCombinedRuleForDirection',
        args: [
          combinedHash,
          direction === 'inbound' ? 0 : 1,
          ruleNFTs,
          tokenIds,
          ver,
        ],
        chain: undefined,
        account: null,
      })
    }
  }

  return (
    <div className="col">
      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">⊕</span> My Active Policy
          </div>
          {activeCombined && (
            <button
              className="btn btn-danger btn-sm"
              disabled={tx.isPending}
              onClick={() =>
                void tx.send({
                  address: contracts.combinedRuleStorage,
                  abi: COMBINED_ABI,
                  functionName: 'deactivateMyCombinedRule',
                  args: [],
                  chain: undefined,
                  account: null,
                })
              }
            >
              Deactivate
            </button>
          )}
        </div>
        <div className="rc-card-body">
          {!activeCombined ? (
            <div className="empty" style={{ padding: '20px' }}>
              No active combined rule
            </div>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              <div className="row-between">
                <div>
                  <div className="field-label" style={{ marginBottom: 3 }}>
                    Hash
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--neon)',
                      letterSpacing: '.04em',
                    }}
                  >
                    {shortHash(activeCombined.hash)}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge badge-active">● ACTIVE</span>
                  <span className="badge badge-blue">
                    v{activeCombined.version.toString()}
                  </span>
                </div>
              </div>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>
                  Rule Refs ({activeCombined.ruleRefs.length})
                </div>
                {activeCombined.ruleRefs.map((ref: RuleRef, i: number) => (
                  <div key={i} className="combine-item">
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                      NFT {shortAddr(ref.ruleNFT)} · Token #
                      {ref.tokenId.toString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">⊕</span> Register Combined Rule
          </div>
        </div>
        <div className="rc-card-body col">
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              1. Select Active Rule NFTs
            </div>
            {isLoading && (
              <div className="empty">
                <span className="spin" />
              </div>
            )}
            {!isLoading && activeRules.length === 0 && (
              <div className="empty" style={{ padding: '16px' }}>
                No active rules. Activate rules first.
              </div>
            )}
            <div className="scroll-list" style={{ maxHeight: 240 }}>
              {activeRules.map((rule) => {
                const isChecked = selected.some((r) => r.ruleId === rule.ruleId)
                return (
                  <div
                    key={rule.ruleId.toString()}
                    className={`check-card ${isChecked ? 'checked' : ''}`}
                    onClick={() => toggleRule(rule)}
                  >
                    <div className="check-box">{isChecked ? '✓' : ''}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="rule-id">
                        RULE #{rule.ruleId.toString()} · Token #
                        {rule.tokenId.toString()}
                      </div>
                      <div className="rule-uri" style={{ fontSize: 10 }}>
                        {rule.uri}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="divider" />
          <div className="grid2">
            <div className="field">
              <div className="field-label">2. Direction</div>
              <select
                className="field-input"
                value={direction}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setDirection(e.target.value as CombineDirection)
                }
              >
                <option value="none">No direction (both)</option>
                <option value="inbound">Inbound (receiving)</option>
                <option value="outbound">Outbound (sending)</option>
              </select>
            </div>
            <div className="field">
              <div className="field-label">Version</div>
              <input
                className="field-input"
                type="number"
                min="1"
                value={version}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setVersion(e.target.value)
                }
              />
            </div>
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Preview
            </div>
            <div className="combine-preview">
              {selected.length === 0 ? (
                <span style={{ color: 'var(--text3)' }}>
                  Select rules above to preview
                </span>
              ) : (
                <>
                  {selected.map((r, i) => (
                    <div key={i} className="combine-item">
                      <span
                        style={{
                          color: 'var(--neon)',
                          fontSize: 10,
                          minWidth: 60,
                        }}
                      >
                        #{r.ruleId.toString()}
                      </span>
                      <span
                        style={{
                          color: 'var(--text2)',
                          fontSize: 10,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.uri}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid var(--border2)',
                      fontSize: 9,
                      color: 'var(--text3)',
                    }}
                  >
                    HASH: {combinedHash ? shortHash(combinedHash) : '—'}
                  </div>
                </>
              )}
            </div>
          </div>
          {tx.status === 'success' && (
            <Alert
              type="ok"
              title="Combined rule registered!"
              hash={tx.hash}
              onDismiss={tx.reset}
            />
          )}
          {tx.status === 'error' && (
            <Alert
              type="err"
              title={tx.error ?? 'Error'}
              onDismiss={tx.reset}
            />
          )}
          <button
            className="btn btn-primary btn-full"
            onClick={handleCombine}
            disabled={tx.isPending || !selected.length || !combinedHash}
          >
            {tx.isPending ? (
              <>
                <span className="spin" /> Registering...
              </>
            ) : (
              '⊕ Register Combined Rule'
            )}
          </button>
        </div>
      </div>

      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">⊕</span> All Policies ({allCombined.length}
            )
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => void refetchAll()}
          >
            ↻
          </button>
        </div>
        <div className="rc-card-body">
          <div className="scroll-list">
            {allCombined.map((rule: CombinedRule, i: number) => (
              <div key={i} className="rule-card">
                <div className="rule-id">{shortHash(rule.hash)}</div>
                <div className="rule-footer">
                  <div className="row" style={{ gap: 6 }}>
                    <span
                      className={`badge ${rule.active ? 'badge-active' : 'badge-inactive'}`}
                    >
                      {rule.active ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                    <span className="badge badge-blue">
                      v{rule.version.toString()}
                    </span>
                    <span className="addr-short">
                      BY {shortAddr(rule.owner)}
                    </span>
                  </div>
                  <div className="rule-meta">
                    {rule.ruleRefs.length} rule refs
                  </div>
                </div>
              </div>
            ))}
            {allCombined.length === 0 && (
              <div className="empty">No combined rules registered yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// SubscriptionTab
function SubscriptionTab({ myAddress }: { myAddress: Address | undefined }) {
  const { contracts } = usePayIDContext()
  const { data: sub, refetch } = useSubscription(myAddress)
  const tx = useTx()

  const { data: rawSubPrice } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: RULE_NFT_ABI,
    functionName: 'subscriptionPriceETH',
  })
  const subPrice = rawSubPrice

  useEffect(() => {
    if (tx.status === 'success') void refetch()
  }, [tx.status, refetch])

  const typedSub = sub
  const nowTs = BigInt(Math.floor(Date.now() / 1000))
  const daysLeft = typedSub?.expiry
    ? Math.max(0, Math.floor((Number(typedSub.expiry) - Number(nowTs)) / 86400))
    : 0

  return (
    <div className="col">
      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">★</span> Subscription
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => void refetch()}
          >
            ↻ Refresh
          </button>
        </div>
        <div className="rc-card-body col">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div
              style={{
                flex: 1,
                minWidth: 160,
                background: 'var(--bg3)',
                border: '1px solid var(--border2)',
                padding: '16px 20px',
              }}
            >
              <div className="field-label" style={{ marginBottom: 6 }}>
                Status
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontFamily: 'var(--display)',
                  fontWeight: 700,
                  color: typedSub?.isActive ? 'var(--neon)' : 'var(--text3)',
                }}
              >
                {typedSub?.isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>
              {typedSub?.isActive && (
                <div
                  style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}
                >
                  {daysLeft} days remaining · expires{' '}
                  {formatExpiry(typedSub.expiry)}
                </div>
              )}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 160,
                background: 'var(--bg3)',
                border: '1px solid var(--border2)',
                padding: '16px 20px',
              }}
            >
              <div className="field-label" style={{ marginBottom: 6 }}>
                Rule Slots
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontFamily: 'var(--display)',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                {typedSub?.logicalRuleCount ?? 0}
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text3)',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {' '}
                  / {typedSub?.maxSlots ?? 1}
                </span>
              </div>
              <div className="sub-meter">
                {Array.from({ length: typedSub?.maxSlots ?? 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`sub-slot ${i < (typedSub?.logicalRuleCount ?? 0) ? 'used' : ''}`}
                  />
                ))}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 6 }}>
                {typedSub?.isActive
                  ? 'Up to 3 slots with subscription'
                  : '1 free slot without subscription'}
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              padding: '14px 16px',
            }}
          >
            <div
              className="field-label"
              style={{ marginBottom: 8, color: 'var(--amber)' }}
            >
              ★ Subscription Benefits
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.8 }}
            >
              <div>● Free tier: 1 rule slot (create 1 root rule)</div>
              <div>● Subscribed: up to 3 rule slots</div>
              <div>● Duration: 30 days per subscription</div>
              <div>
                ● Price: ~
                {subPrice ? (Number(subPrice) / 1e18).toFixed(6) : '0.001'} ETH
              </div>
              <div>● Renewable before or after expiry</div>
            </div>
          </div>

          {tx.status === 'success' && (
            <Alert
              type="ok"
              title="Subscribed successfully!"
              hash={tx.hash}
              onDismiss={tx.reset}
            />
          )}
          {tx.status === 'error' && (
            <Alert
              type="err"
              title={tx.error ?? 'Error'}
              onDismiss={tx.reset}
            />
          )}

          <button
            className="btn btn-amber btn-full"
            style={{ fontSize: 12 }}
            onClick={() =>
              void tx.send({
                address: contracts.ruleItemERC721,
                abi: RULE_NFT_ABI,
                functionName: 'subscribe',
                args: [],
                value: subPrice ?? parseEther('0.001'),
                chain: undefined,
                account: null,
              })
            }
            disabled={tx.isPending || !myAddress}
          >
            {tx.isPending ? (
              <>
                <span className="spin" />{' '}
                {tx.status === 'confirming' ? 'Confirming...' : 'Waiting...'}
              </>
            ) : typedSub?.isActive ? (
              '★ Extend Subscription (+30 days)'
            ) : (
              '★ Subscribe Now'
            )}
          </button>
          {!myAddress && (
            <Alert type="warn" icon="!" title="Connect wallet to subscribe" />
          )}
        </div>
      </div>
    </div>
  )
}

// TransactTab
function TransactTab({ myAddress }: { myAddress: Address | undefined }) {
  const chainId = useChainId()
  const tokens = TOKENS_BY_CHAIN[chainId] ?? DEFAULT_TOKENS

  const [receiver, setReceiver] = useState('')
  const [payId, setPayId] = useState('')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState<Token>(tokens[0])
  const [showPolicy, setShowPolicy] = useState(false)

  // Reset token ke ETH saat chain berubah
  useEffect(() => {
    setToken(tokens[0])
  }, [chainId])

  const {
    execute,
    reset,
    status,
    isPending,
    error,
    decision,
    denyReason,
    txHash,
  } = usePayIDFlow()

  const isValidAddr = receiver.startsWith('0x') && receiver.length === 42
  const isETH = token.address === '0x0000000000000000000000000000000000000000'

  const { data: receiverPolicy } = useActiveCombinedRule(
    showPolicy && isValidAddr ? (receiver as Address) : undefined,
  )

  const getStepState = useCallback(
    (stepId: PayIDFlowStatus): StepState => {
      if (status === 'idle' || status === 'error' || status === 'denied')
        return 'idle'
      if (stepId === status) return 'active'
      return FLOW_STEPS.indexOf(stepId) < FLOW_STEPS.indexOf(status)
        ? 'done'
        : 'idle'
    },
    [status],
  )

  const handlePay = (_e: ReactMouseEvent<HTMLButtonElement>) => {
    if (!receiver || !amount || !isValidAddr) return
    const params: PayIDFlowParams = {
      receiver: receiver as Address,
      asset: token.address,
      amount: BigInt(Math.round(parseFloat(amount) * 10 ** token.decimals)),
      payId: payId || `pay.id/${receiver.slice(2, 10).toLowerCase()}`,
    }
    void execute(params)
  }

  return (
    <div className="col">
      <div className="rc-card">
        <div className="rc-card-header">
          <div className="rc-card-title">
            <span className="accent">→</span> Execute Payment
          </div>
          {!isETH && (
            <span className="badge badge-blue" style={{ fontSize: 9 }}>
              ERC20 · auto-approve
            </span>
          )}
        </div>
        <div className="rc-card-body col">
          {/* Flow steps */}
          <div className="flow-steps">
            {FLOW_STEPS.map((s, i) => (
              <div key={s} className={`flow-step ${getStepState(s)}`}>
                {FLOW_LABELS[i]}
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Receiver */}
          <div className="field">
            <div className="field-label">Receiver Address *</div>
            <input
              className="field-input"
              placeholder="0x..."
              value={receiver}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setReceiver(e.target.value)
                reset()
              }}
              disabled={isPending}
            />
          </div>

          {/* PAY.ID */}
          <div className="field">
            <div className="field-label">PAY.ID (optional)</div>
            <input
              className="field-input"
              placeholder="pay.id/merchant"
              value={payId}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPayId(e.target.value)
              }
              disabled={isPending}
            />
          </div>

          {/* Amount + Token */}
          <div className="grid2">
            <div className="field">
              <div className="field-label">Amount *</div>
              <input
                className="field-input"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setAmount(e.target.value)
                  reset()
                }}
                disabled={isPending}
              />
            </div>
            <div className="field">
              <div className="field-label">Token</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tokens.map((t) => (
                  <button
                    key={t.symbol}
                    className={`token-chip ${token.symbol === t.symbol ? 'active' : ''}`}
                    onClick={() => {
                      setToken(t)
                      reset()
                    }}
                    disabled={isPending}
                  >
                    {t.logo} {t.symbol}
                  </button>
                ))}
              </div>
              {!isETH && (
                <div className="field-hint">
                  Allowance akan di-approve otomatis sebelum transaksi
                </div>
              )}
            </div>
          </div>

          {/* Preview policy */}
          <div>
            <label
              className="row"
              style={{ cursor: 'pointer', gap: 8, marginBottom: 8 }}
            >
              <input
                type="checkbox"
                checked={showPolicy}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setShowPolicy(e.target.checked)
                }
                style={{ accentColor: 'var(--neon)' }}
              />
              <span className="field-label">
                Preview receiver's active policy
              </span>
            </label>
            {showPolicy && isValidAddr && (
              <div className="combine-preview">
                {!receiverPolicy ? (
                  <span style={{ color: 'var(--text3)' }}>
                    No active policy → payment allowed by default
                  </span>
                ) : (
                  <>
                    <div
                      style={{
                        color: 'var(--neon)',
                        fontSize: 10,
                        marginBottom: 6,
                      }}
                    >
                      POLICY ACTIVE: v{receiverPolicy.version.toString()} ·{' '}
                      {receiverPolicy.ruleRefs.length} rule(s)
                    </div>
                    {receiverPolicy.ruleRefs.map((ref: RuleRef, i: number) => (
                      <div key={i} className="combine-item">
                        <span style={{ fontSize: 9, color: 'var(--text3)' }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                          Token #{ref.tokenId.toString()} @{' '}
                          {shortAddr(ref.ruleNFT)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Alerts */}
          {status === 'success' && txHash && (
            <Alert
              type="ok"
              title="Payment confirmed on-chain!"
              hash={txHash}
              onDismiss={reset}
            />
          )}
          {status === 'denied' && (
            <Alert
              type="warn"
              icon="⊘"
              title={`Payment denied: ${denyReason ?? 'Policy blocked this payment'}`}
              onDismiss={reset}
            />
          )}
          {status === 'error' && error && (
            <Alert type="err" title={error} onDismiss={reset} />
          )}

          {/* Decision badge */}
          {decision && status !== 'idle' && (
            <div className="row">
              <span
                className={`badge ${decision === 'ALLOW' ? 'badge-active' : 'badge-red'}`}
              >
                {decision === 'ALLOW' ? '✓ ALLOWED' : '✗ DENIED'}
              </span>
            </div>
          )}

          {/* Main button */}
          <button
            className={`btn btn-full ${status === 'denied' ? 'btn-danger' : 'btn-primary'}`}
            onClick={
              status === 'idle' || status === 'error' ? handlePay : undefined
            }
            disabled={
              isPending ||
              !myAddress ||
              (status === 'idle' && (!receiver || !amount))
            }
          >
            {isPending && <span className="spin" />}
            {status === 'idle' && '→ Execute Payment'}
            {status === 'fetching-rule' && 'Fetching policy...'}
            {status === 'evaluating' && 'Evaluating rules...'}
            {status === 'proving' && 'Generating proof...'}
            {status === 'approving' && `Approving ${token.symbol}...`}
            {status === 'awaiting-wallet' && 'Confirm in wallet...'}
            {status === 'confirming' && 'Confirming on-chain...'}
            {status === 'success' && '✓ Payment Complete'}
            {status === 'denied' && '⊘ Denied — Reset'}
            {status === 'error' && '↻ Retry'}
          </button>

          {!myAddress && (
            <Alert
              type="warn"
              icon="!"
              title="Connect wallet to send payment"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Root
export default function RuleConsole() {
  const [tab, setTab] = useState<TabId>('rules')
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  return (
    <>
      <style>
        {CSS}
        {CREATE_RULE_CSS}
      </style>
      <div className="rc-wrap">
        <header className="rc-header">
          <div className="rc-logo">
            PAY.ID <span>/ RULE CONSOLE</span>
          </div>
          <div className="rc-hright">
            <div className="rc-pill">CHAIN {chainId || '—'}</div>
            <WalletButton />
          </div>
        </header>

        <nav className="rc-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`rc-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-dot" />
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <main className="rc-main">
          {!isConnected && (
            <Alert
              type="warn"
              icon="!"
              title="Connect your wallet to interact with PAY.ID contracts."
            />
          )}
          {tab === 'rules' && <RulesTab myAddress={address} />}
          {tab === 'create' && <CreateRuleTab />}
          {tab === 'combine' && <CombineTab myAddress={address} />}
          {tab === 'subscription' && <SubscriptionTab myAddress={address} />}
          {tab === 'transact' && <TransactTab myAddress={address} />}
        </main>
      </div>
    </>
  )
}
