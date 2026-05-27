import { motion } from 'framer-motion'
import { Database, Cloud } from 'lucide-react'

interface StorageOption {
  value: string
  label: string
  icon: any
  description: string
  color: string
}

interface Props {
  p: any
  storageProvider: string
  setStorageProvider: (val: string) => void
}

export function StoragePreference({ p, storageProvider, setStorageProvider }: Props) {
  const storageOptions: StorageOption[] = [
    {
      value: '0g',
      label: '0G Storage',
      icon: Database,
      description: 'Persistent on-chain storage via 0G network',
      color: '#8B5CF6',
    },
    {
      value: 'ipfs',
      icon: Cloud,
      label: 'IPFS',
      description: 'Decentralized file storage via IPFS',
      color: '#0EA5E9',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="rounded-2xl p-5 relative backdrop-blur-20"
      style={{ background: p.glass.bg, border: p.glass.border }}
    >
      <div className={`text-sm font-medium ${p.textMain} mb-3`}>
        Storage Preference
      </div>
      <div className="space-y-2">
        {storageOptions.map((option) => {
          const Icon = option.icon
          const isSelected = storageProvider === option.value
          return (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setStorageProvider(option.value)}
              className={`relative flex items-center gap-3 p-3 rounded-xl w-full text-left transition-colors ${
                isSelected
                  ? 'bg-[#00D084]/10 border border-[#00D084]/30'
                  : p.cardHover
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${option.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: option.color }} />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${p.textMain}`}>
                  {option.label}
                </div>
                <div className={`text-xs ${p.textMuted}`}>
                  {option.description}
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-[#00D084] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
