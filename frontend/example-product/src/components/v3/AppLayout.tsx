import React from 'react'
import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { Home, Send, Download, Clock, Users, Settings, Bell } from 'lucide-react'
import { useAccount } from 'wagmi'
import { WalletButton } from '../v2/WalletButton'

function shortAddr(addr?: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
}

const navItems = [
  { icon: Home, label: 'Home', path: '/v3/app/dashboard' },
  { icon: Send, label: 'Send', path: '/v3/app/send' },
  { icon: Download, label: 'Receive', path: '/v3/app/receive' },
  { icon: Clock, label: 'History', path: '/v3/app/history' },
  { icon: Users, label: 'Contacts', path: '/v3/app/contacts' },
  { icon: Settings, label: 'Settings', path: '/v3/app/settings' },
]

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation()
  const { address, isConnected } = useAccount()
  const currentPath = location.pathname

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Top Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6"
        style={{
          height: '56px',
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <Link to="/v3/app/dashboard" className="flex items-center gap-1.5">
          <div
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--accent-blue)' }}
          >
            PAY
          </div>
          <div className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent-green)' }}>
            .ID
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Notifications"
          >
            <Bell style={{ width: 20, height: 20 }} />
          </button>
          <WalletButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-8 md:ml-50">
        <div className="max-w-lg mx-auto w-full px-4 py-6">
          {children || <Outlet />}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = currentPath.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors"
                style={{
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}
              >
                <item.icon style={{ width: 22, height: 22 }} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Side Navigation - Desktop Only */}
      <aside
        className="hidden md:flex fixed left-0 top-14 bottom-0 flex-col py-4"
        style={{
          width: '200px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
        }}
      >
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(26, 31, 113, 0.08)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                <item.icon style={{ width: 20, height: 20 }} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {isConnected && address && (
          <div className="px-4 py-3 mx-2 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Connected Wallet
            </div>
            <div className="text-sm font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
              {shortAddr(address)}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
