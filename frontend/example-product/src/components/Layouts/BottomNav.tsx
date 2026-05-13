import { Link } from '@tanstack/react-router'
import { History, Home, Layers, QrCode, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Layers, label: 'Rules', path: '/rules' },
  { icon: QrCode, label: 'Pay', path: '/qr' },
  { icon: Shield, label: 'Verify', path: '/verify' },
  { icon: History, label: 'History', path: '/history' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-120 mx-auto">
      <div className="glass border-t border-slate-200/60 safe-area-bottom bg-white/85 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 btn-tactile text-slate-500 hover:text-slate-700 hover:bg-slate-100/50',
              )}
              activeProps={{ className: 'text-teal-600 bg-teal-50' }}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('w-5 h-5', isActive && 'stroke-[2.5]')}
                  />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
