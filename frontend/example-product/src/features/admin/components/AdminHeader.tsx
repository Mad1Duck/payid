import { Shield } from 'lucide-react'

interface Props {
  p: any
  address?: `0x${string}` | undefined
}

export function AdminHeader({ p, address }: Props) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(0,208,132,0.12)' }}
      >
        <Shield className="w-5 h-5 text-[#00D084]" />
      </div>
      <div>
        <h1 className={`text-lg font-bold ${p.textMain}`}>Protocol Admin</h1>
        <p className={`text-xs ${p.textMuted}`}>
          PAY.ID contract configuration & access control
        </p>
      </div>
      <div className="ml-auto">
        <span
          className={`text-[10px] font-mono px-2 py-1 rounded-lg ${p.textMuted}`}
          style={{
            background: p.dark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.05)',
          }}
        >
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
      </div>
    </div>
  )
}
