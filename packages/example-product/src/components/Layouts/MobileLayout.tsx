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
    <div
      className={cn(
        'min-h-screen bg-background flex flex-col max-w-md mx-auto relative',
        className,
      )}
    >
      <main className={cn('flex-1 overflow-y-auto', !hideNav && 'pb-24')}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
