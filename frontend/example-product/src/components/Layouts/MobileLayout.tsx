import { BottomNav } from './BottomNav'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: ReactNode
  hideNav?: boolean
  className?: string
}

export function MobileLayout({
  children,
  hideNav = false,
  className,
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div
        className={cn(
          'mobile-viewport flex flex-col relative overflow-hidden',
          className,
        )}
      >
        <main
          className={cn(
            'flex-1 overflow-y-auto smooth-scroll',
            !hideNav && 'pb-24 safe-area-bottom safe-area-top',
          )}
        >
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}
