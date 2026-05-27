import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { Send, Download, Clock } from 'lucide-react'

interface Action {
  to: string
  icon: any
  label: string
  color: string
}

interface Props {
  p: any
}

const ACTIONS: Action[] = [
  { to: '/v4/app/send', icon: Send, label: 'Send', color: '#00D084' },
  { to: '/v4/app/receive', icon: Download, label: 'Receive', color: '#0EA5E9' },
  { to: '/v4/app/history', icon: Clock, label: 'History', color: '#F59E0B' },
]

export function QuickActions({ p }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="grid grid-cols-3 gap-3"
    >
      {ACTIONS.map((action) => (
        <Link key={action.label} to={action.to}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={`rounded-2xl p-4 flex flex-col items-center gap-2 text-center cursor-pointer`}
            style={{ background: p.cardBg }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${action.color}15` }}>
              <action.icon className="w-5 h-5" style={{ color: action.color }} />
            </div>
            <span className={`text-sm font-medium ${p.textMain}`}>{action.label}</span>
          </motion.div>
        </Link>
      ))}
    </motion.div>
  )
}
