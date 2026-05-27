interface Props {
  label: string
  active?: boolean
  onClick?: () => void
}

export function Chip({ label, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer
        ${active ? 'bg-[#00D084]/20 text-[#00D084] ring-1 ring-[#00D084]/30' : 'bg-white/5 text-[#64748B] hover:bg-white/10'}
      `}
    >
      {label}
    </button>
  )
}
