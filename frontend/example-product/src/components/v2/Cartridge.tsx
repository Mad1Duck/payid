import { Zap, Ban, Check, Key, BarChart3, Link2 } from 'lucide-react'

export type CartridgeType = 'velocity' | 'blocklist' | 'allowlist' | 'kyc' | 'volume' | 'chain'

export interface CartridgeData {
  id: string
  type: CartridgeType
  name: string
  summary: string
  image?: string
  ruleHash?: string
  authorityAddress?: string
  active: boolean
}

interface CartridgeProps {
  cartridge: CartridgeData
  status?: 'active' | 'idle' | 'loading' | 'error'
  onDragStart?: (id: string) => void
  onClick?: () => void
  className?: string
}

const CARTRIDGE_ICONS: Record<CartridgeType, typeof Zap> = {
  velocity: Zap,
  blocklist: Ban,
  allowlist: Check,
  kyc: Key,
  volume: BarChart3,
  chain: Link2,
}

const CARTRIDGE_COLORS: Record<CartridgeType, string> = {
  velocity: '#5298FF', // blue
  blocklist: '#EF4444', // red
  allowlist: '#22C55E', // green
  kyc: '#F59E0B', // yellow
  volume: '#8A52FF', // purple
  chain: '#6B7280', // gray
}

const CARTRIDGE_BORDER_COLORS: Record<CartridgeType, string> = {
  velocity: 'rgba(82, 152, 255, 0.3)',
  blocklist: 'rgba(239, 68, 68, 0.3)',
  allowlist: 'rgba(34, 197, 94, 0.3)',
  kyc: 'rgba(245, 158, 11, 0.3)',
  volume: 'rgba(138, 82, 255, 0.3)',
  chain: 'rgba(107, 114, 128, 0.3)',
}

export function Cartridge({ cartridge, status = 'idle', onDragStart, onClick, className = '' }: CartridgeProps) {
  const Icon = CARTRIDGE_ICONS[cartridge.type]
  const borderColor = CARTRIDGE_BORDER_COLORS[cartridge.type]
  const iconColor = CARTRIDGE_COLORS[cartridge.type]

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('cartridgeId', cartridge.id)
    onDragStart?.(cartridge.id)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 ${className}`}
      style={{
        width: '80px',
        height: '100px',
        background: '#1a1a2e',
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        borderBottomLeftRadius: '18px',
        borderBottomRightRadius: '18px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(82, 152, 255, 0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Notch at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-3 rounded-b-lg"
        style={{ background: '#16213e' }}
      />

      {/* Label area */}
      <div
        className="absolute top-4 left-2 right-2 flex flex-col items-center"
        style={{ background: '#16213e', padding: '6px 4px', borderRadius: '6px' }}
      >
        <Icon style={{ width: 16, height: 16, color: iconColor }} />
        <div className="text-[9px] font-medium text-center mt-1" style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {cartridge.name}
        </div>
        {cartridge.image && (
          <img src={cartridge.image} alt="" className="w-6 h-6 mt-1 rounded object-cover" />
        )}
        {!cartridge.image && cartridge.ruleHash && (
          <div className="text-[7px] address text-center mt-1" style={{ color: 'var(--text-muted)' }}>
            {cartridge.ruleHash.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wide"
          style={{
            background: cartridge.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
            color: cartridge.active ? 'var(--status-allow)' : 'var(--text-muted)',
            border: cartridge.active ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${cartridge.active ? 'bg-green-500' : 'bg-gray-500'}`} />
          {cartridge.active ? 'active' : 'idle'}
        </div>
      </div>

      {/* Gold contact pins at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-2">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-4 rounded-sm"
            style={{ background: '#c0a060' }}
          />
        ))}
      </div>

      {/* Loading overlay */}
      {status === 'loading' && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(26, 26, 46, 0.8)' }}
        >
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: iconColor }} />
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(239, 68, 68, 0.2)' }}
        >
          <div className="text-lg">⚠️</div>
        </div>
      )}
    </div>
  )
}
