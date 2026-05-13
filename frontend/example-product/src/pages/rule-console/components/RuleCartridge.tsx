import { Clock, Coins, DollarSign, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CartridgeType =
  | 'minAmount'
  | 'maxAmount'
  | 'allowedToken'
  | 'allowedSender'
  | 'expiration'

interface RuleCartridgeProps {
  id: string
  type: CartridgeType
  name: string
  summary: string
  image?: string
  isActive?: boolean
  isInSlot?: boolean
  isDragging?: boolean
  showAdvanced?: boolean
  ruleHash?: string
  authorityAddress?: string
}

const cartridgeConfig: Record<
  CartridgeType,
  { icon: LucideIcon; from: string; to: string; accent: string }
> = {
  minAmount:    { icon: DollarSign, from: '#059669', to: '#047857', accent: '#10b981' },
  maxAmount:    { icon: DollarSign, from: '#d97706', to: '#b45309', accent: '#f59e0b' },
  allowedToken: { icon: Coins,      from: '#0891b2', to: '#0e7490', accent: '#06b6d4' },
  allowedSender:{ icon: User,       from: '#7c3aed', to: '#6d28d9', accent: '#8b5cf6' },
  expiration:   { icon: Clock,      from: '#e11d48', to: '#be123c', accent: '#f43f5e' },
}

export function RuleCartridge({
  id,
  type,
  name,
  summary,
  image,
  isActive = false,
  isInSlot = false,
  showAdvanced = false,
  ruleHash,
}: RuleCartridgeProps) {
  const cfg = cartridgeConfig[type]
  const Icon = cfg.icon
  const W = 56

  return (
    <div className="relative select-none" style={{ width: W }}>
      {/* ── Connector tabs at top (go into slot) ── */}
      <div
        className="flex justify-center gap-px mx-1 mb-0"
        style={{ height: '10px' }}
      >
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: 'linear-gradient(180deg, #d4b850 0%, #a07820 100%)',
              borderRadius: '1px 1px 0 0',
              boxShadow: '0 -1px 2px rgba(0,0,0,0.3)',
            }}
          />
        ))}
      </div>

      {/* ── Cartridge body ── */}
      <div
        style={{
          width: W,
          height: isInSlot ? 80 : 86,
          background: 'linear-gradient(180deg, #1e2420 0%, #131a13 60%, #0e1410 100%)',
          borderRadius: isInSlot ? '0 0 4px 4px' : '2px 2px 4px 4px',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: `2px 4px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Label sticker */}
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 4,
            right: 4,
            bottom: 13,
            borderRadius: 3,
            background: `linear-gradient(145deg, ${cfg.from} 0%, ${cfg.to} 100%)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            overflow: 'hidden',
          }}
        >
          {/* Shine */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)',
            }}
          />
          {/* Horizontal stripes */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.08,
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', padding: '0 2px' }}>
            {/* NFT Image or Icon */}
            {image ? (
              <img
                src={image}
                alt=""
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  objectFit: 'cover',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={10} color="#fff" strokeWidth={2.5} />
              </div>
            )}
            <span
              style={{
                fontSize: 6.5,
                fontWeight: 800,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'center',
                lineHeight: 1.1,
                maxWidth: 44,
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {name}
            </span>
          </div>
        </div>

        {/* PAY.ID mark */}
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 5,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.15em',
            fontFamily: 'monospace',
          }}
        >
          PAY.ID
        </div>

        {/* Active LED pulse */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: cfg.accent,
              boxShadow: `0 0 6px ${cfg.accent}`,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Inactive overlay */}
        {!isActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
            }}
          />
        )}
      </div>

      {/* Summary text (tray only) */}
      {!isInSlot && (
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          <span
            style={{
              fontSize: 8,
              fontFamily: 'monospace',
              color: isActive ? 'rgba(100,116,139,0.7)' : 'rgba(248,113,113,0.8)',
            }}
          >
            {summary}
          </span>
        </div>
      )}

      {/* Advanced debug */}
      {showAdvanced && isInSlot && ruleHash && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 4,
            width: 72,
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(13,148,136,0.25)',
            borderRadius: 3,
            padding: '2px 4px',
            fontSize: 5,
            fontFamily: 'monospace',
            color: 'rgba(94,234,212,0.7)',
            zIndex: 50,
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {id.slice(-8)}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.6 }}>
            {ruleHash.slice(0, 12)}…
          </div>
        </div>
      )}
    </div>
  )
}
