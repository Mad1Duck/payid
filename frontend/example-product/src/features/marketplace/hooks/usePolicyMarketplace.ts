import { useState } from 'react'
import { useV4Palette } from '@/components/v4/theme'
import { useClipboard } from '@/features/shared'
import { TEMPLATES, CATEGORIES } from '@/features/rules/data/marketplaceTemplates'
import type { RuleTemplate } from '@/features/rules/data/marketplaceTemplates'

export function usePolicyMarketplace() {
  const p = useV4Palette()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [purchased, setPurchased] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<RuleTemplate | null>(null)
  const { copied, copy } = useClipboard()

  const filtered = TEMPLATES.filter((t) => {
    const q = search.toLowerCase()
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const handlePurchase = (id: string) => {
    setPurchased((prev) => new Set(prev).add(id))
  }

  const copyJson = (json: object) => {
    copy(JSON.stringify(json, null, 2))
  }

  return {
    p, search, setSearch, activeCategory, setActiveCategory,
    purchased, setPurchased, selected, setSelected,
    copied, copy, filtered, handlePurchase, copyJson, CATEGORIES,
  }
}
