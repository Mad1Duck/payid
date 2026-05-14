import { useState } from 'react'
import { Clipboard } from 'lucide-react'

export interface UserOperation {
  sender: string
  nonce: string
  initCode: string
  callData: string
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  paymasterAndData: string
  signature: string
}

export interface PaymentContext {
  sender: string
  receiver: string
  amount: string
  token: string
  chainId: number
  chainName: string
  paymaster?: string
  mode: 'standard' | 'erc4337'
  userOp?: UserOperation
}

interface WalletContextPanelProps {
  context: PaymentContext
  onEvaluate?: () => void
  onClear?: () => void
  onUpdate?: (context: PaymentContext) => void
  className?: string
}

const CHAINS = [
  { id: 1, name: 'Ethereum' },
  { id: 8453, name: 'Base' },
  { id: 137, name: 'Polygon' },
  { id: 42161, name: 'Arbitrum' },
  { id: 10, name: 'Optimism' },
]

const TOKENS = ['ETH', 'USDC', 'USDT', 'DAI']

export function WalletContextPanel({ context, onEvaluate, onClear, onUpdate, className = '' }: WalletContextPanelProps) {
  const [localContext, setLocalContext] = useState(context)
  const [pasted, setPasted] = useState<string | null>(null)

  const handlePaste = async (field: keyof PaymentContext) => {
    try {
      const text = await navigator.clipboard.readText()
      setLocalContext({ ...localContext, [field]: text })
      setPasted(field)
      setTimeout(() => setPasted(null), 1000)
    } catch {
      // Clipboard read failed
    }
  }

  const handleUpdate = () => {
    onUpdate?.(localContext)
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div className={`card p-5 ${className}`}>
      {/* Header */}
      <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Payment Context
      </div>

      <div className="separator mb-4" />

      {/* Context Form */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Sender
            </label>
            <div className="relative">
              <input
                type="text"
                value={localContext.sender}
                onChange={(e) => setLocalContext({ ...localContext, sender: e.target.value })}
                placeholder="0x..."
                className="input w-full pr-20"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={() => handlePaste('sender')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}
              >
                {pasted === 'sender' ? 'Pasted!' : 'Paste'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Receiver
            </label>
            <div className="relative">
              <input
                type="text"
                value={localContext.receiver}
                onChange={(e) => setLocalContext({ ...localContext, receiver: e.target.value })}
                placeholder="0x..."
                className="input w-full pr-20"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={() => handlePaste('receiver')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}
              >
                {pasted === 'receiver' ? 'Pasted!' : 'Paste'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Amount
            </label>
            <input
              type="text"
              value={localContext.amount}
              onChange={(e) => setLocalContext({ ...localContext, amount: e.target.value })}
              placeholder="0.5"
              className="input w-full"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Token
            </label>
            <select
              value={localContext.token}
              onChange={(e) => setLocalContext({ ...localContext, token: e.target.value })}
              className="input w-full"
            >
              {TOKENS.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Chain
            </label>
            <select
              value={localContext.chainId}
              onChange={(e) => {
                const chain = CHAINS.find((c) => c.id === parseInt(e.target.value))
                setLocalContext({ ...localContext, chainId: parseInt(e.target.value), chainName: chain?.name || '' })
              }}
              className="input w-full"
            >
              {CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name} ({chain.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Paymaster (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={localContext.paymaster || ''}
                onChange={(e) => setLocalContext({ ...localContext, paymaster: e.target.value })}
                placeholder="0x..."
                className="input w-full pr-20"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={() => handlePaste('paymaster' as any)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}
              >
                {pasted === 'paymaster' ? 'Pasted!' : 'Paste'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="separator mb-4" />

      {/* Mode Toggle */}
      <div className="mb-4">
        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
          Mode
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="standard"
              checked={localContext.mode === 'standard'}
              onChange={(e) => setLocalContext({ ...localContext, mode: e.target.value as any })}
              className="w-4 h-4"
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Standard
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="erc4337"
              checked={localContext.mode === 'erc4337'}
              onChange={(e) => setLocalContext({ ...localContext, mode: e.target.value as any })}
              className="w-4 h-4"
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              ERC-4337 UserOp
            </span>
          </label>
        </div>
      </div>

      {/* UserOp Preview */}
      {localContext.mode === 'erc4337' && localContext.userOp && (
        <>
          <div className="separator mb-4" />
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
              UserOp Preview
            </label>
            <div
              className="p-3 rounded-lg overflow-auto"
              style={{ background: 'rgba(0, 0, 0, 0.3)', maxHeight: '150px' }}
            >
              <pre className="text-xs address" style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(localContext.userOp, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}

      <div className="separator mb-4" />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button onClick={onClear} className="btn btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>
          Clear
        </button>
        <button onClick={onEvaluate} className="btn btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
          Evaluate
        </button>
      </div>
    </div>
  )
}
