import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

interface Props {
  p: any
}

export function PayrollHeader({ p }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-[#8B5CF6]" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${p.textMain}`}>DAO Payroll</h1>
          <p className={`text-sm ${p.textMuted}`}>Batch distribute to contributors with policy enforcement</p>
        </div>
      </div>
    </motion.div>
  )
}
