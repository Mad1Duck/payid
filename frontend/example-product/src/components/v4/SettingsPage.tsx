import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Globe, Bell, Shield, Wallet, ChevronRight, Sun, Moon, LogOut } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useV4Palette, useV4Theme } from './theme'

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase()
  const bg = useMemo(() => {
    const colors = ['#00D084', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }, [name])

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

export default function SettingsPage() {
  const p = useV4Palette()
  const { toggle } = useV4Theme()
  const { address, isConnected } = useAccount()
  const payId = isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id'

  const settings = [
    { icon: Globe, label: 'Currency', value: 'USD', color: '#0EA5E9' },
    { icon: Bell, label: 'Notifications', value: 'On', color: '#F59E0B' },
    { icon: Shield, label: 'Security', value: 'Biometric', color: '#00D084' },
    { icon: Wallet, label: 'Network', value: 'Hardhat · 31337', color: '#8B5CF6' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Settings</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>Manage your account and preferences</p>
      </div>

      {/* Profile Card — PIVY Style */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-[24px] p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)' }}
      >
        <div className="relative z-10 flex items-center gap-4">
          <Avatar name={isConnected && address ? address : 'demo'} size={56} />
          <div>
            <div className="text-white text-lg font-semibold">{isConnected && address ? shortAddr(address) : 'Not Connected'}</div>
            <div className="text-white/70 text-sm font-mono">{payId}</div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      {/* Theme Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl p-5 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.dark ? 'bg-white/4' : 'bg-black/4'}`}>
              {p.dark ? <Moon className="w-5 h-5 text-[#64748B]" /> : <Sun className="w-5 h-5 text-[#F59E0B]" />}
            </div>
            <div>
              <div className={`text-sm font-medium ${p.textMain}`}>Appearance</div>
              <div className={`text-xs ${p.textMuted}`}>{p.dark ? 'Dark' : 'Light'} mode</div>
            </div>
          </div>
          <button
            onClick={toggle}
            className={`relative w-12 h-7 rounded-full transition-colors ${p.dark ? 'bg-[#00D084]/30' : 'bg-[#00D084]/20'}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${p.dark ? 'left-1' : 'translate-x-5 left-1'}`} />
          </button>
        </div>
      </motion.div>

      {/* Settings List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl p-2 relative"
        style={{ background: p.cardBg }}
      >
        <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
        <div className="relative space-y-1">
          {settings.map((row) => (
            <div
              key={row.label}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${p.cardHover}`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${row.color}15` }}>
                <row.icon className="w-5 h-5" style={{ color: row.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${p.textMain}`}>{row.label}</div>
                <div className={`text-xs ${p.textMuted}`}>{row.value}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#475569]" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Disconnect */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl p-5 relative"
        style={{ background: 'rgba(239,68,68,0.04)' }}
      >
        <div className="absolute inset-0 rounded-2xl border pointer-events-none" style={{ borderColor: 'rgba(239,68,68,0.12)' }} />
        <div className="relative flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-[#EF4444]" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-[#EF4444] font-medium">Disconnect Wallet</div>
            <div className={`text-xs ${p.textMuted}`}>Sign out from your current session</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
