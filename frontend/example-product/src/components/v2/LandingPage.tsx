import { Link } from '@tanstack/react-router'
import { Search, ArrowRight, BookOpen, Github } from 'lucide-react'

interface LandingPageProps {
  className?: string
}

export function LandingPage({ className = '' }: LandingPageProps) {

  return (
    <div className={`min-h-screen flex flex-col ${className}`} style={{ background: 'var(--bg-base)' }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6"
        style={{
          height: '56px',
          background: 'rgba(6, 6, 16, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div
            className="text-xl font-bold tracking-tight"
            style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            PAY
          </div>
          <div className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            .ID
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-6">
          <a href="/v3/app/rules/console" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Rules
          </a>
          <a href="/v3/app/proof" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Docs
          </a>
          <a
            href="https://github.com/payid-sdk/payid-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Github style={{ width: 14, height: 14 }} />
            GitHub
          </a>
        </div>

        {/* Wallet Button */}
        <Link to="/">
          <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 16px' }}>
            Connect Wallet
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Version Badge */}
        <div className="flex items-center gap-2 mb-6 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="badge badge-allow">● v1.0 · WASM Rule Engine Live</span>
        </div>

        {/* Headline */}
        <h1
          className="text-6xl font-bold text-center mb-4 animate-slide-up"
          style={{
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.05em',
            lineHeight: 1.1,
          }}
        >
          Your payment identity,
          <br />
          <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            programmable.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-center max-w-lg mb-8 animate-slide-up"
          style={{
            color: 'var(--text-secondary)',
            fontSize: '18px',
            fontWeight: 300,
            animationDelay: '50ms',
          }}
        >
          PAY.ID gives every wallet a programmable policy layer — set rules, prove decisions on-chain,
          control how you receive.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <Link to="/">
            <button className="btn btn-primary" style={{ fontSize: '14px', padding: '12px 24px' }}>
              Get your PAY.ID
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </Link>
          <button className="btn btn-outline" style={{ fontSize: '14px', padding: '12px 24px' }}>
            How it works
            <BookOpen style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-xl animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="alice$pay.id"
              className="input w-full pl-12 pr-32"
              style={{ height: '52px', fontSize: '16px' }}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}>
              Resolve
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-8 mt-20 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="text-center">
            <div
              className="text-4xl font-bold mb-1"
              style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              14.2K
            </div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Pay IDs registered
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold mb-1"
              style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              $4.8M
            </div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Volume evaluated
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold mb-1"
              style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              99.97%
            </div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Rule uptime
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold mb-1"
              style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              6
            </div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Chains supported
            </div>
          </div>
        </div>

        {/* Cartridge System Section */}
        <div className="mt-32 w-full max-w-4xl animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="text-center mb-8">
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              CARTRIDGE SYSTEM
            </div>
            <h2 className="text-3xl font-bold text-gradient mb-4">
              Compose rules like game cartridges
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Drag and drop rule cartridges into slots to build your payment policy pipeline
            </p>
          </div>

          {/* Visual representation of cartridge system */}
          <div className="flex items-center justify-center gap-4 py-8">
            {/* Cartridge */}
            <div
              className="w-20 h-24 rounded-lg flex flex-col items-center justify-center relative"
              style={{
                background: '#1a1a2e',
                border: '1px solid var(--border-default)',
                borderTopLeftRadius: '2px',
                borderTopRightRadius: '2px',
                borderBottomLeftRadius: '18px',
                borderBottomRightRadius: '18px',
              }}
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-3 rounded-b-lg"
                style={{ background: '#0D0D1A' }}
              />
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Velocity
              </div>
              <div className="flex gap-1 mt-2">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-3 rounded-sm"
                    style={{ background: '#c0a060' }}
                  />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight style={{ width: 24, height: 24, color: 'var(--text-muted)' }} />

            {/* Slot */}
            <div
              className="w-24 h-24 rounded-lg flex flex-col items-center justify-center border-2 border-dashed"
              style={{ borderColor: 'rgba(82, 152, 255, 0.3)' }}
            >
              <div className="text-3xl mb-2">🎮</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ACTIVE SLOT
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>© 2026 PAY.ID — Policy & Proof Layer for Digital Payments</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-blue-400 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-blue-400 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-blue-400 transition-colors">
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
