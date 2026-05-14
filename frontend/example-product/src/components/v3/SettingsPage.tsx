import { useState } from 'react'
import {
  User, Wallet, Globe, Bell, Shield, Info, LogOut, ChevronRight,
  Copy, Check, ExternalLink, Sparkles
} from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'

function shortAddr(addr?: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
}

const iconColors: Record<string, string> = {
  User: 'bg-indigo-50 text-indigo-600',
  Wallet: 'bg-emerald-50 text-emerald-600',
  Globe: 'bg-sky-50 text-sky-600',
  Bell: 'bg-amber-50 text-amber-600',
  Shield: 'bg-rose-50 text-rose-600',
  Info: 'bg-slate-50 text-slate-500',
}

export function SettingsPage() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR')
  const [notifications, setNotifications] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const payId = address ? `user${address.slice(2, 6)}@payid.app` : '—'

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const profileMeta = [
    { label: 'PayID', value: payId },
    { label: 'Chain', value: chainId ? String(chainId) : '—' },
  ]

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Display Name',
          value: 'My Account',
          action: () => {},
        },
        {
          icon: Wallet,
          label: 'Payment Address',
          value: payId,
          copyable: true,
          field: 'payid',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Globe,
          label: 'Currency',
          value: currency,
          toggle: () => setCurrency((c) => (c === 'IDR' ? 'USD' : 'IDR')),
        },
        {
          icon: Bell,
          label: 'Notifications',
          value: notifications ? 'On' : 'Off',
          toggle: () => setNotifications((v) => !v),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: Shield,
          label: 'Connected Wallet',
          value: isConnected ? shortAddr(address) : 'Not connected',
          action: () => {},
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'Version',
          value: '1.0.0-beta',
        },
        {
          icon: Info,
          label: 'Open Source',
          value: 'GitHub',
          external: 'https://github.com/madduck/payid-sdk',
        },
      ],
    },
  ]

  const getIconClass = (icon: unknown) => {
    const name = (icon as { displayName?: string }).displayName || ''
    return iconColors[name] || 'bg-gray-50 text-gray-500'
  }

  const isActive = (item: { value: string | boolean }) =>
    item.value === 'On' || (item.value === 'IDR' && currency === 'IDR') || (item.value === 'USD' && currency === 'USD')

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 mb-8"
        style={{
          background: 'linear-gradient(145deg, #1e2480 0%, #2d35a0 40%, #1e2480 100%)',
          boxShadow: '0 12px 40px -12px rgba(30, 36, 128, 0.4)',
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white ring-2 ring-white/20">
              {address ? address.charAt(2).toUpperCase() : '?'}
            </div>
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#1e2480]">
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-white truncate">My Account</p>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-sm text-white/60 font-mono">{shortAddr(address)}</p>
          </div>
        </div>

        <div className="relative mt-5 flex gap-3">
          {profileMeta.map((m) => (
            <div
              key={m.label}
              className="flex-1 rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3"
            >
              <p className="text-[11px] text-white/50 font-medium">{m.label}</p>
              <p className="text-sm text-white font-mono truncate">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-8">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
              {group.title}
            </p>
            <div
              className="rounded-3xl bg-white p-2"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.06)',
              }}
            >
              {group.items.map((item, idx) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl transition-colors duration-200 hover:bg-gray-50/80 cursor-pointer group ${
                    idx !== group.items.length - 1 ? 'mb-1' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${getIconClass(item.icon)}`}
                  >
                    <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    {item.value !== undefined && (
                      <p className="text-[13px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {typeof item.value === 'boolean' ? (item.value ? 'On' : 'Off') : String(item.value)}
                      </p>
                    )}
                  </div>

                  {'copyable' in item && item.copyable && (
                    <button
                      onClick={() => handleCopy(payId, 'payid')}
                      className="flex-shrink-0 p-2.5 rounded-xl hover:bg-indigo-50 transition-colors duration-200"
                    >
                      {copiedField === 'payid' ? (
                        <Check className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" strokeWidth={2} />
                      )}
                    </button>
                  )}

                  {'toggle' in item && item.toggle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        item.toggle()
                      }}
                      className="flex-shrink-0 relative h-7 w-12 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      style={{
                        backgroundColor: isActive(item) ? '#4f46e5' : '#e5e7eb',
                      }}
                    >
                      <span
                        className="absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        style={{
                          transform: isActive(item) ? 'translateX(20px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                  )}

                  {'external' in item && item.external && (
                    <a
                      href={item.external}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" strokeWidth={2} />
                    </a>
                  )}

                  {'action' in item && item.action && !('toggle' in item) && !('copyable' in item) && !('external' in item) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        item.action()
                      }}
                      className="flex-shrink-0 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Disconnect */}
      {isConnected && (
        <button
          onClick={() => disconnect()}
          className="w-full mt-8 rounded-2xl border border-red-100 bg-white p-4 flex items-center gap-3 justify-center transition-all duration-200 hover:bg-red-50 hover:border-red-200 active:scale-[0.98]"
        >
          <LogOut className="w-[18px] h-[18px] text-red-500" strokeWidth={2} />
          <span className="text-sm font-semibold text-red-500">
            Disconnect Wallet
          </span>
        </button>
      )}
    </div>
  )
}
