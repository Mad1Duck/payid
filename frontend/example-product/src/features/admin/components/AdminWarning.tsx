import { AlertTriangle } from 'lucide-react'

interface Props {
  p: any
}

export function AdminWarning({ p }: Props) {
  return (
    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className={`text-[11px] ${p.textMuted}`}>
        All actions require the appropriate role (
        <code className="font-mono">DEFAULT_ADMIN</code>,{' '}
        <code className="font-mono">ADMIN</code>,{' '}
        <code className="font-mono">PAUSER</code>) on the target contract.
        Transactions will revert if the connected wallet lacks the required
        role.
      </p>
    </div>
  )
}
