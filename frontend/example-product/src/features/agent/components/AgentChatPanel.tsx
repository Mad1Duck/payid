import { motion } from 'framer-motion'
import { Brain, Bot, Loader2, Send } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { Bubble } from '@/features/agent/components/Bubble'
import type { AgentPayIDState } from '../hooks/useAgentPayID'
import { AI_MODEL } from '@/features/agent/data/constants'

interface Props {
  s: AgentPayIDState
}

export default function AgentChatPanel({ s }: Props) {
  const p = useV4Palette()
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: p.cardBg, border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}` }}
    >
      {/* Chat header */}
      <div className={`px-4 py-3 flex items-center gap-2 border-b ${p.dark ? 'border-white/8' : 'border-black/8'}`}>
        <Brain className="w-4 h-4 text-[#8B5CF6]" />
        <span className={`text-sm font-semibold ${p.textMain}`}>
          {s.selectedAgent ? `Chat with ${s.selectedAgent.displayName}` : 'Chat with AI Agent'}
        </span>
        <span className={`text-[10px] ml-auto font-mono ${p.textMuted}`}>{AI_MODEL}</span>
        {s.aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />}
      </div>

      {/* Messages */}
      <div ref={s.chatRef as any} className="h-72 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {s.messages.length === 0 && !s.selectedAgent && (
          <div className={`text-center text-xs ${p.textMuted} pt-10`}>Select an AI agent above to start chatting.</div>
        )}
        {s.messages.map((m: any, i: number) => (
          <Bubble key={i} msg={m} />
        ))}
        {s.aiLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#8B5CF6]" />
            </div>
            <div className={`px-3 py-2 rounded-2xl rounded-bl-sm ${p.dark ? 'bg-white/8' : 'bg-black/6'} flex items-center gap-1.5`}>
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`px-4 pb-4 flex gap-2 border-t ${p.dark ? 'border-white/8' : 'border-black/8'} pt-3`}>
        <input
          value={s.input}
          onChange={(e) => s.setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && s.sendMessage()}
          disabled={s.aiLoading || !s.hasApiKey || !s.selectedAgent}
          placeholder={
            !s.hasApiKey
              ? 'Set VITE_0G_AI_API_KEY in .env first'
              : !s.selectedAgent
              ? 'Select an AI agent above to start chatting'
              : `Ask ${s.selectedAgent.displayName} to make a payment…`
          }
          className={`flex-1 px-3 py-2 rounded-xl text-sm border ${
            p.dark
              ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600'
              : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'
          } focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40 disabled:opacity-50`}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={s.sendMessage}
          disabled={s.aiLoading || !s.input.trim() || !s.hasApiKey || !s.selectedAgent}
          className="w-9 h-9 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {s.aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </motion.button>
      </div>
    </div>
  )
}
