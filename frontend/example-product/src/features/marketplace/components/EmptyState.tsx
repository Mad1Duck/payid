import { Filter } from 'lucide-react'

interface Props {
  p: any
}

export function EmptyState({ p }: Props) {
  return (
    <div className="text-center py-12">
      <Filter className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
      <p className={`text-sm ${p.textMuted}`}>No templates match your search.</p>
    </div>
  )
}
