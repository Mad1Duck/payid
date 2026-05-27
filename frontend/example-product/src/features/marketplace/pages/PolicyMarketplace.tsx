import { AnimatePresence } from 'framer-motion'
import { usePolicyMarketplace } from '../hooks/usePolicyMarketplace'
import {
  MarketplaceHeader,
  SearchAndFilter,
  TemplateCard,
  TemplateModal,
  EmptyState,
} from '../components'

export default function PolicyMarketplace() {
  const {
    p, search, setSearch, activeCategory, setActiveCategory,
    purchased, selected, setSelected,
    copied, filtered, handlePurchase, copyJson, CATEGORIES,
  } = usePolicyMarketplace()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <MarketplaceHeader p={p} />

      <SearchAndFilter
        p={p}
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        CATEGORIES={CATEGORIES}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((template, i) => (
            <TemplateCard
              key={template.id}
              template={template}
              p={p}
              isPurchased={purchased.has(template.id)}
              onClick={() => setSelected(template)}
              onPurchase={(e) => {
                e.stopPropagation()
                handlePurchase(template.id)
              }}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && <EmptyState p={p} />}

      <TemplateModal
        selected={selected}
        p={p}
        purchased={purchased}
        copied={copied}
        onClose={() => setSelected(null)}
        onPurchase={handlePurchase}
        onCopyJson={copyJson}
      />
    </div>
  )
}
