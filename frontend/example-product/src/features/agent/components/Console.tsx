import { useEffect, useRef } from 'react'
import type { LogLine } from '../types'

export function Console({ logs }: { logs: Array<LogLine> }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [logs])
  const cls = {
    info: 'text-slate-400',
    ok: 'text-[#00D084]',
    err: 'text-red-400',
  }
  return (
    <div
      ref={ref}
      className="h-36 overflow-y-auto font-mono text-xs space-y-0.5"
      style={{ scrollbarWidth: 'thin' }}
    >
      {!logs.length && (
        <p className="text-slate-500 italic text-center pt-4">
          On-chain logs appear here after AI approves…
        </p>
      )}
      {logs.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-slate-600 shrink-0">{l.time}</span>
          <span className={cls[l.level]}>{l.msg}</span>
        </div>
      ))}
    </div>
  )
}
