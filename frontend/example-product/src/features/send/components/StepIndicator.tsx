import { Check } from 'lucide-react'

interface Props {
  step: string
  p: any
}

const STEPS = [
  { id: 'who', label: 'Recipient' },
  { id: 'amount', label: 'Amount' },
  { id: 'review', label: 'Review' },
]

export function StepIndicator({ step, p }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((item, i) => {
        const s = item.id
        const isDone =
          (step === 'amount' && i === 0) ||
          (['review', 'evaluating', 'signing', 'success'].includes(step) && i <= 1) ||
          (step === 'success' && i === 2)
        const isActive =
          step === s ||
          (['evaluating', 'signing'].includes(step) && s === 'review')
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-[#00D084] text-[#0B0F1A]'
                    : isActive
                      ? 'bg-white text-[#0B0F1A]'
                      : p.dark
                        ? 'bg-white/10 text-white/40'
                        : 'bg-black/5 text-black/30'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium capitalize transition-colors ${
                  isDone || isActive ? p.textMain : p.textMuted
                }`}
              >
                {item.label}
              </span>
            </div>
            {i < 2 && (
              <div className={`w-12 h-px mb-4 ${isDone ? 'bg-[#00D084]/40' : p.dark ? 'bg-white/10' : 'bg-black/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
