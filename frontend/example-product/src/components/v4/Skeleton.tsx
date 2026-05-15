import type { CSSProperties } from 'react'
import { useV4Palette } from './theme'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
  rounded?: string
}

export function Skeleton({ className = '', style, rounded = 'rounded-xl' }: SkeletonProps) {
  const p = useV4Palette()
  return (
    <div
      className={`${rounded} animate-pulse ${className}`}
      style={{ background: p.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', ...style }}
    />
  )
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}
