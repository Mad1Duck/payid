import { Sparkles } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

export default function AgentHeader() {
  const p = useV4Palette()
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#8B5CF620' }}>
          <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
        </div>
        <h1 className={`text-2xl font-bold ${p.textMain}`}>AI Agent Payments</h1>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium">0G TeeML</span>
      </div>
      <p className={`text-sm ${p.textMuted} ml-10`}>
        Qwen via 0G AI decides payment approval → AgentPayID enforces policy on-chain
      </p>
    </div>
  )
}
