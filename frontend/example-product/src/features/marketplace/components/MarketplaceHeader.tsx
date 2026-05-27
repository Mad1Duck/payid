import { motion } from 'framer-motion'

interface Props {
  p: any
}

export function MarketplaceHeader({ p }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className={`text-2xl font-bold ${p.textMain}`}>Policy Marketplace</h1>
      <p className={`text-sm ${p.textMuted} mt-1`}>
        Browse and subscribe to proven rule templates.
      </p>
    </motion.div>
  )
}
