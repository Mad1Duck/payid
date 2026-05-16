import { Layers, Repeat, ShieldCheck, Clock } from 'lucide-react'

export const TABS = [
  { id: 'batch', label: 'Batch Pay', icon: Layers },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'escrow', label: 'Escrow', icon: ShieldCheck },
  { id: 'vesting', label: 'Vesting', icon: Clock },
] as const
