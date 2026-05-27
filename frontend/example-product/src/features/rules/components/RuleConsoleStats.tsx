import { useV4Palette } from '@/components/v4/theme'

interface Props {
  isConnected: boolean
  activeCount: number
  myRulesLength: number
  activeCombinedHash: string | null
}

export function RuleConsoleStats({ isConnected, activeCount, myRulesLength, activeCombinedHash }: Props) {
  const p = useV4Palette()
  const card = `rounded-2xl border ${p.cardBorder}`

  const stepBadge = (n: number, label: string, done: boolean) => (
    <div key={n} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${done ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]' : `${p.cardBorder} ${p.textMuted}`}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-[#00D084] text-[#0B0F1A]' : 'bg-current/20'}`}>{n}</span>
      {label}
    </div>
  )

  if (!isConnected) return null

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {stepBadge(1, 'Build Rule', true)}
        {stepBadge(2, 'Deploy NFT', myRulesLength > 0)}
        {stepBadge(3, 'Activate', myRulesLength > 0)}
        {stepBadge(4, 'Go Live', !!activeCombinedHash)}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Rules', value: activeCount.toString(), color: '#00D084' },
          { label: 'Total Rules', value: myRulesLength.toString(), color: '#0EA5E9' },
          { label: 'Policy', value: activeCombinedHash ? 'Live' : 'Off', color: activeCombinedHash ? '#00D084' : '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className={`${card} p-4`} style={{ backgroundColor: p.cardBg }}>
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className={`text-[11px] mt-0.5 ${p.textMuted}`}>{s.label}</p>
          </div>
        ))}
      </div>
    </>
  )
}
