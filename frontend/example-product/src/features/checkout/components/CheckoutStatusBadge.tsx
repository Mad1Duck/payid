import { ShieldCheck, AlertTriangle } from 'lucide-react'

interface Props {
  isExpired: boolean
  isSignatureValid: boolean
  timeLeft: string
}

export function CheckoutStatusBadge({ isExpired, isSignatureValid, timeLeft }: Props) {
  if (isExpired || timeLeft === 'Expired') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/20 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5" /> Expired
      </span>
    )
  }
  if (!isSignatureValid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-semibold border border-yellow-500/20">
        <AlertTriangle className="w-3.5 h-3.5" /> Unverified Sig
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D084]/15 text-[#00D084] text-xs font-semibold border border-[#00D084]/20">
      <ShieldCheck className="w-3.5 h-3.5" /> Signature Verified
    </span>
  )
}
