import { Link } from '@tanstack/react-router'
import { Cpu, Crown, Plus } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

interface NavProps {
  currentPath: string
}

interface PageHeaderProps {
  isConnected: boolean
  sub: { isActive: boolean; maxSlots: number } | null
  myRulesLength: number
}

export function RuleConsoleHeader({ currentPath }: NavProps) {
  const p = useV4Palette()

  return (
    <div className={`flex items-center gap-2 border-b ${p.cardBorder} pb-3`}>
      <Link
        to="/v4/app/rules"
        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
          currentPath === '/v4/app/rules'
            ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 shadow-[0_0_12px_rgba(0,208,132,0.08)]'
            : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent cursor-pointer'
        }`}
      >
        <Cpu className="w-3.5 h-3.5" />
        Policy Console & Enforcer
      </Link>
      <Link
        to="/v4/app/rules/builder"
        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
          currentPath === '/v4/app/rules/builder'
            ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 shadow-[0_0_12px_rgba(0,208,132,0.08)]'
            : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent cursor-pointer'
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        Custom Rule Builder
      </Link>
    </div>
  )
}

export function RuleConsolePageHeader({ isConnected, sub, myRulesLength }: PageHeaderProps) {
  const p = useV4Palette()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h1 className={`text-2xl font-bold ${p.textMain} flex items-center gap-2`}>
          <Cpu className="w-6 h-6 text-[#8B5CF6]" />
          Rule Console
        </h1>
        <p className={`text-sm ${p.textMuted} mt-0.5`}>
          Drag &amp; drop rules into slots and register your live payment policy
        </p>
      </div>
      {isConnected && (
        <div className="flex flex-col gap-2 items-center justify-center">
          <div
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border ${p.cardBorder} text-xs ${p.textMuted}`}
            style={{ backgroundColor: p.cardBg }}
          >
            <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>
              {sub?.isActive
                ? `Pro · ${myRulesLength}/${sub.maxSlots}`
                : `Free · ${myRulesLength}/1`}
            </span>
          </div>
          <Link
            to="/v4/app/rules/builder"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-white text-xs font-semibold hover:bg-[#8B5CF6]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Rule
          </Link>
        </div>
      )}
    </div>
  )
}
