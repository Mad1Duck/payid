import { Check, ChevronRight } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

interface Props {
  current: number
}

const LABELS = ['Evidence', 'Details', 'Submit']

export function ReportSteps({ current }: Props) {
  const p = useV4Palette()

  return (
    <div className="flex items-center gap-2">
      {LABELS.map((label, i) => {
        const step = i + 1
        const done = current > step
        const active = current === step
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-[#00D084] text-[#0B0F1A]' : active ? 'bg-[#00D084]/20 text-[#00D084] border border-[#00D084]' : `border ${p.cardBorder} ${p.textMuted}`
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : step}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-[#00D084]' : p.textMuted}`}>{label}</span>
            </div>
            {i < LABELS.length - 1 && <ChevronRight className={`w-3 h-3 ${p.textMuted} opacity-40`} />}
          </div>
        )
      })}
    </div>
  )
}
