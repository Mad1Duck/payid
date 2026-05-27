import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import PremiumButton from '@/components/v4/PremiumButton'
import { Download } from 'lucide-react'

interface Props {
  p: any
  search: string
  setSearch: (val: string) => void
  activeTab: 'all' | 'received' | 'sent'
  setActiveTab: (tab: 'all' | 'received' | 'sent') => void
}

const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'received' as const, label: 'Incoming' },
  { key: 'sent' as const, label: 'Outgoing' },
]

export function SearchAndTabs({ p, search, setSearch, activeTab, setActiveTab }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="space-y-3"
    >
      <motion.div
        whileFocus={{ scale: 1.01 }}
        className={`flex items-center gap-2 p-3 rounded-xl backdrop-blur-20 ${p.dark ? 'bg-white/3' : 'bg-black/3'}`}
        style={{ border: p.glass.border }}
      >
        <Search className="w-4 h-4 text-[#64748B]" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 bg-transparent text-sm ${p.textMain} placeholder-[#64748B] focus:outline-none`}
        />
      </motion.div>

      <div className="flex items-center gap-1">
        {TABS.map((tab) => (
          <motion.button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#00D084]/10 text-[#00D084]'
                : `${p.textMuted} hover:${p.textSecondary}`
            }`}
          >
            {tab.label}
          </motion.button>
        ))}
        <PremiumButton
          variant="ghost"
          size="sm"
          icon={<Download className="w-3 h-3" />}
          className="ml-auto"
        >
          Export
        </PremiumButton>
      </div>
    </motion.div>
  )
}
