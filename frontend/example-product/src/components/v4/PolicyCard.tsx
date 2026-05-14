import { motion } from 'framer-motion'
import { Shield, Clock, Lock, Crown, Gamepad2, CreditCard } from 'lucide-react'
import { useV4Palette } from './theme'

export interface PolicyCardData {
  id: string
  name: string
  subtitle: string
  tier: 'standard' | 'premium' | 'executive' | 'legendary'
  stats: { label: string; value: string }[]
  rules: string[]
  active: boolean
  owner: string
  expiry?: string
}

const tierConfig = {
  standard: {
    gradient: 'from-slate-500 via-slate-400 to-slate-600',
    glow: 'shadow-slate-500/20',
    accent: '#94A3B8',
    badge: 'bg-slate-500/15 text-slate-400',
    icon: Shield,
    label: 'Standard',
  },
  premium: {
    gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
    glow: 'shadow-emerald-500/30',
    accent: '#00D084',
    badge: 'bg-emerald-500/15 text-emerald-400',
    icon: CreditCard,
    label: 'Premium',
  },
  executive: {
    gradient: 'from-amber-400 via-orange-400 to-rose-500',
    glow: 'shadow-amber-500/30',
    accent: '#F59E0B',
    badge: 'bg-amber-500/15 text-amber-400',
    icon: Crown,
    label: 'DAO Executive',
  },
  legendary: {
    gradient: 'from-violet-400 via-fuchsia-400 to-pink-500',
    glow: 'shadow-violet-500/40',
    accent: '#A78BFA',
    badge: 'bg-violet-500/15 text-violet-400',
    icon: Gamepad2,
    label: 'Legendary',
  },
}

function HolographicBorder({ tier }: { tier: keyof typeof tierConfig }) {
  const cfg = tierConfig[tier]
  return (
    <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
      <motion.div
        className={`absolute inset-0 rounded-2xl bg-linear-to-br ${cfg.gradient} opacity-20`}
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className={`absolute inset-0 rounded-2xl border border-white/10 ${cfg.glow} shadow-lg`} />
      {/* Animated scanline */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

function CardChip() {
  return (
    <div className="relative w-10 h-8 rounded-md bg-linear-to-br from-amber-300 to-yellow-500 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-7 h-5 border border-amber-700/30 rounded-sm grid grid-cols-3 grid-rows-2 gap-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-amber-600/20" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PolicyCard({ policy, index = 0 }: { policy: PolicyCardData; index?: number }) {
  const p = useV4Palette()
  const cfg = tierConfig[policy.tier]
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, rotateY: 2 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ perspective: 1000 }}
    >
      <HolographicBorder tier={policy.tier} />

      {/* Card Body */}
      <div className={`relative p-5 ${p.dark ? 'bg-linear-to-br from-white/3 to-transparent' : 'bg-linear-to-br from-black/2 to-transparent'}`}>
        {/* Top Row: Chip + Tier Badge */}
        <div className="flex items-center justify-between mb-4">
          <CardChip />
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${cfg.badge}`}>
              {cfg.label}
            </span>
            {policy.active && (
              <motion.span
                className="w-2 h-2 rounded-full bg-[#00D084]"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* Card Number / Policy ID */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4" style={{ color: cfg.accent }} />
            <span className={`text-[10px] uppercase tracking-[0.2em] ${p.textMuted}`}>Policy ID</span>
          </div>
          <div className={`text-sm font-mono tracking-wider ${p.textMain}`}>
            {policy.id.replace(/(.{4})/g, '$1 ').trim()}
          </div>
        </div>

        {/* Name + Subtitle */}
        <div className="mb-4">
          <h3 className={`text-base font-bold ${p.textMain} leading-tight`}>{policy.name}</h3>
          <p className={`text-[11px] ${p.textMuted} mt-0.5`}>{policy.subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {policy.stats.map((stat, i) => (
            <div key={i} className={`p-2 rounded-lg ${p.dark ? 'bg-white/3' : 'bg-black/2'}`}>
              <div className={`text-[10px] ${p.textMuted} uppercase tracking-wider mb-0.5`}>{stat.label}</div>
              <div className={`text-xs font-bold font-mono ${p.textMain}`} style={{ color: cfg.accent }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Rules Preview */}
        <div className="flex flex-wrap gap-1.5">
          {policy.rules.slice(0, 3).map((rule, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border border-white/10 ${p.textSecondary}`}>
              {rule}
            </span>
          ))}
          {policy.rules.length > 3 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border border-white/10 ${p.textMuted}`}>
              +{policy.rules.length - 3}
            </span>
          )}
        </div>

        {/* Bottom: Owner + Expiry */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-[#64748B]" />
            <span className={`text-[10px] font-mono ${p.textMuted}`}>{policy.owner.slice(0, 10)}...{policy.owner.slice(-4)}</span>
          </div>
          {policy.expiry && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#64748B]" />
              <span className={`text-[10px] ${p.textMuted}`}>{policy.expiry}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
