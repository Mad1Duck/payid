import { Bot } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import type { ChatMsg } from '../types'

export function Bubble({ msg }: { msg: ChatMsg }) {
  const p = useV4Palette()
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-[#8B5CF6]" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#8B5CF6] text-white rounded-br-sm'
            : `${p.dark ? 'bg-white/8' : 'bg-black/6'} ${p.textMain} rounded-bl-sm`
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}
