import { Outlet, Link } from '@tanstack/react-router'
import { Home, Search, FileText, Zap, Shield, CreditCard, Building, Settings } from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
import { WalletButton } from './WalletButton'

interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/v3/app/dashboard' },
    { icon: Search, label: 'History', path: '/v3/app/history' },
    { icon: FileText, label: 'Rules Console', path: '/v3/app/rules/console' },
    { icon: Shield, label: 'Proof', path: '/v3/app/proof' },
    { icon: Zap, label: 'QR Code', path: '/v3/app/qr' },
    { icon: CreditCard, label: 'Rule Builder', path: '/v3/app/rule-builder' },
    { icon: Building, label: 'Subscription', path: '/v3/app/subscription' },
    { icon: Settings, label: 'Verify', path: '/v3/app/verify' },
  ]

  const shortAddr = (addr?: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6"
        style={{
          height: '64px',
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            PAY
          </div>
          <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            .ID
          </div>
        </Link>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search PayID address..."
              className="input w-full pl-10 pr-24"
              style={{ height: '40px' }}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary" style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}>
              Resolve
            </button>
          </div>
        </div>

        {/* Wallet Connector */}
        <div className="flex items-center gap-4">
          {isConnected && address ? (
            <div className="flex items-center gap-3">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Connected:
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="address">{shortAddr(address)}</span>
              </div>
              <button onClick={() => disconnect()} className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }}>
                Disconnect
              </button>
            </div>
          ) : (
            <WalletButton />
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex flex-col py-6"
          style={{
            width: '200px',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-default)',
          }}
        >
          <div className="px-4 mb-4">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              PayID
            </div>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                activeProps={{
                  className: 'active-nav-item',
                  style: {
                    background: 'linear-gradient(90deg, rgba(82, 152, 255, 0.15), transparent)',
                    borderLeft: '3px solid var(--accent-blue)',
                  },
                }}
                inactiveProps={{
                  className: 'inactive-nav-item',
                  style: { color: 'var(--text-secondary)' },
                }}
              >
                <item.icon style={{ width: 18, height: 18 }} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8" style={{ minHeight: 'calc(100vh - 64px)' }}>
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
