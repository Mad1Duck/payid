import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Search,
  Filter,
  Check,
  ArrowLeft,
  Code2,
  Users,
  Calendar,
  Cpu,
  Globe,
  ChevronRight,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { shortAddr, reputationBadge } from '@/features/shared'
import { usePolicyMarketplace } from './policy-marketplace/usePolicyMarketplace'

export default function PolicyMarketplace() {
  const {
    p, search, setSearch, activeCategory, setActiveCategory,
    purchased, selected, setSelected,
    copied, filtered, handlePurchase, copyJson, CATEGORIES,
  } = usePolicyMarketplace()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Policy Marketplace</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Browse and subscribe to proven rule templates.
        </p>
      </motion.div>

      {/* Search & Filter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors text-sm`}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                activeCategory === cat
                  ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20'
                  : `${p.cardBorder} ${p.textMuted} hover:bg-black/5`
              }`}
              style={activeCategory === cat ? undefined : { backgroundColor: p.cardBg }}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((template, i) => {
            const Icon = template.icon
            const isPurchased = purchased.has(template.id)
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(template)}
                className={`rounded-2xl p-5 border ${p.cardBorder} flex flex-col cursor-pointer hover:border-[#00D084]/30 transition-colors`}
                style={{ backgroundColor: p.cardBg }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${template.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: template.color }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                    <span className={`text-xs ${p.textMain} font-medium`}>{template.rating}</span>
                    <span className={`text-xs ${p.textMuted}`}>({template.reviews})</span>
                  </div>
                </div>

                <h3 className={`text-sm font-semibold ${p.textMain} mb-1`}>{template.name}</h3>
                <p className={`text-xs ${p.textMuted} mb-3 line-clamp-2`}>{template.description}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${p.dark ? 'bg-white/5' : 'bg-black/5'} ${p.textMuted}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-dashed border-[#E5E7EB]/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs ${p.textMuted}`}>Price</span>
                      <div className={`text-sm font-bold font-mono ${p.textMain}`}>
                        {template.price} {template.currency}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePurchase(template.id)
                      }}
                      disabled={isPurchased}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isPurchased
                          ? 'bg-[#00D084]/10 text-[#00D084]'
                          : 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
                      }`}
                    >
                      {isPurchased ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" /> Subscribed
                        </span>
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
          <p className={`text-sm ${p.textMuted}`}>No templates match your search.</p>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
            onClick={() => setSelected(null)}
          >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-2xl rounded-2xl border ${p.cardBorder} shadow-2xl mt-8 mb-8`}
              style={{ backgroundColor: p.cardBg }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-dashed border-[#E5E7EB]/30">
                <div className="flex items-start justify-between mb-4">
                  <button
                    onClick={() => setSelected(null)}
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
                    <selected.icon className="w-7 h-7" style={{ color: selected.color }} />
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

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className={`text-sm font-semibold ${p.textMain} mb-2`}>About</h3>
                  <p className={`text-sm ${p.textMuted} leading-relaxed`}>{selected.longDescription}</p>
                </div>

                {/* Stats Grid */}
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

                {/* Creator Reputation */}
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

                {/* Compatibility */}
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

                {/* Rule JSON */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#64748B]" />
                      <h3 className={`text-sm font-semibold ${p.textMain}`}>Rule Definition</h3>
                    </div>
                    <button
                      onClick={() => copyJson(selected.ruleJson)}
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

                {/* Tags */}
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

              {/* Footer — CTA */}
              <div className="p-6 border-t border-dashed border-[#E5E7EB]/30">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className={`text-xs ${p.textMuted}`}>One-time purchase</span>
                    <div className={`text-2xl font-bold font-mono ${p.textMain}`}>
                      {selected.price} {selected.currency}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase(selected.id)}
                    disabled={purchased.has(selected.id)}
                    className={`px-8 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                      purchased.has(selected.id)
                        ? 'bg-[#00D084]/10 text-[#00D084]'
                        : 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
                    }`}
                  >
                    {purchased.has(selected.id) ? (
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
    </div>
  )
}
