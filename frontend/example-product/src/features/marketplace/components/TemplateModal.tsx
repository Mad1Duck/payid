import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, Users, Calendar, Cpu, Globe, Code2, Copy, CheckCircle2, ChevronRight } from 'lucide-react'
import { shortAddr, reputationBadge } from '@/features/shared'

interface Template {
  id: string
  name: string
  description: string
  longDescription: string
  icon: any
  color: string
  category: string
  rating: number
  reviews: number
  version: string
  usageCount: number
  createdAt: string
  updatedAt: string
  creator: string
  creatorReputation: number
  compatibility: string[]
  tags: string[]
  ruleJson: any
  price: number
  currency: string
}

interface Props {
  selected: Template | null
  p: any
  purchased: Set<string>
  copied: boolean
  onClose: () => void
  onPurchase: (id: string) => void
  onCopyJson: (json: any) => void
}

export function TemplateModal({ selected, p, purchased, copied, onClose, onPurchase, onCopyJson }: Props) {
  if (!selected) return null

  const Icon = selected.icon
  const isPurchased = purchased.has(selected.id)

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-2xl rounded-2xl border ${p.cardBorder} shadow-2xl mt-8 mb-8`}
            style={{ backgroundColor: p.cardBg }}
          >
            <div className="p-6 border-b border-dashed border-[#E5E7EB]/30">
              <div className="flex items-start justify-between mb-4">
                <button
                  onClick={onClose}
                  className={`flex items-center gap-1 text-xs font-medium ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer`}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div
                  className="text-[10px] px-2 py-1 rounded-full font-medium"
                  style={{
                    background: `${selected.color}15`,
                    color: selected.color,
                  }}
                >
                  {selected.category}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${selected.color}15` }}
                >
                  <Icon className="w-7 h-7" style={{ color: selected.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-xl font-bold ${p.textMain}`}>{selected.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                      <span className={`text-sm ${p.textMain} font-medium`}>{selected.rating}</span>
                      <span className={`text-xs ${p.textMuted}`}>({selected.reviews} reviews)</span>
                    </div>
                    <span className={`text-xs ${p.textMuted}`}>v{selected.version}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className={`text-sm font-semibold ${p.textMain} mb-2`}>About</h3>
                <p className={`text-sm ${p.textMuted} leading-relaxed`}>{selected.longDescription}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Users</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${p.textMain}`}>{selected.usageCount.toLocaleString()}</span>
                </div>
                <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Created</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${p.textMain}`}>{selected.createdAt}</span>
                </div>
                <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Updated</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${p.textMain}`}>{selected.updatedAt}</span>
                </div>
                <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Creator</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${p.textMain}`}>{shortAddr(selected.creator)}</span>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: `${reputationBadge(selected.creatorReputation).color}15`,
                    color: reputationBadge(selected.creatorReputation).color,
                  }}
                >
                  {Math.floor(selected.creatorReputation / 100)}
                </div>
                <div>
                  <p className={`text-xs ${p.textMuted}`}>
                    Creator reputation:{' '}
                    <span className={`font-medium ${p.textMain}`}>{selected.creatorReputation}</span>
                  </p>
                  <p className="text-[10px]" style={{ color: reputationBadge(selected.creatorReputation).color }}>
                    {reputationBadge(selected.creatorReputation).label}
                  </p>
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-semibold ${p.textMain} mb-2`}>Compatibility</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.compatibility.map((c) => (
                    <span
                      key={c}
                      className={`text-xs px-3 py-1.5 rounded-lg border ${p.cardBorder} ${p.textMuted}`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#64748B]" />
                    <h3 className={`text-sm font-semibold ${p.textMain}`}>Rule Definition</h3>
                  </div>
                  <button
                    onClick={() => onCopyJson(selected.ruleJson)}
                    className={`flex items-center gap-1 text-xs font-medium ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy JSON
                      </>
                    )}
                  </button>
                </div>
                <pre
                  className={`p-4 rounded-xl text-xs font-mono overflow-x-auto border ${p.cardBorder} ${p.dark ? 'bg-[#0B0F1A]' : 'bg-[#F1F5F9]'}`}
                >
                  <code className={p.textMain}>{JSON.stringify(selected.ruleJson, null, 2)}</code>
                </pre>
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-3 py-1.5 rounded-full border ${p.cardBorder} ${p.textMuted}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-dashed border-[#E5E7EB]/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className={`text-xs ${p.textMuted}`}>One-time purchase</span>
                  <div className={`text-2xl font-bold font-mono ${p.textMain}`}>
                    {selected.price} {selected.currency}
                  </div>
                </div>
                <button
                  onClick={() => onPurchase(selected.id)}
                  disabled={isPurchased}
                  className={`px-8 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    isPurchased
                      ? 'bg-[#00D084]/10 text-[#00D084]'
                      : 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
                  }`}
                >
                  {isPurchased ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Already Subscribed
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Subscribe Now <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
