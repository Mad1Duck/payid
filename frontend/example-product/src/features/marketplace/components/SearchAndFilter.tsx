import { motion } from 'framer-motion'
import { Search } from 'lucide-react'

interface Props {
  p: any
  search: string
  setSearch: (val: string) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void
  CATEGORIES: string[]
}

export function SearchAndFilter({ p, search, setSearch, activeCategory, setActiveCategory, CATEGORIES }: Props) {
  return (
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
  )
}
