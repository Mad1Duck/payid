import { motion } from 'framer-motion'
import { Star, Check } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  icon: any
  color: string
  rating: number
  reviews: number
  tags: string[]
  price: number
  currency: string
}

interface Props {
  template: Template
  p: any
  isPurchased: boolean
  onClick: () => void
  onPurchase: (e: React.MouseEvent) => void
  index: number
}

export function TemplateCard({ template, p, isPurchased, onClick, onPurchase, index }: Props) {
  const Icon = template.icon
  return (
    <motion.div
      key={template.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
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
            onClick={onPurchase}
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
}
