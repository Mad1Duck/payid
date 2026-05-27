import { motion } from 'framer-motion'
import { useV4Palette } from '@/components/v4/theme'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistoryItem {
  date: string
  score: number
  change: number
  reason: string
}

interface ReputationHistoryProps {
  currentScore: number
}

// Mock history data for visualization until on-chain history is available
function generateMockHistory(currentScore: number): HistoryItem[] {
  const now = new Date()
  const items: HistoryItem[] = [
    {
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.max(0, currentScore - 50),
      change: -50,
      reason: 'Report submitted against this address',
    },
    {
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.max(0, currentScore - 30),
      change: 20,
      reason: 'Positive activity recorded',
    },
    {
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.max(0, currentScore - 10),
      change: 20,
      reason: 'Reputation adjustment',
    },
    {
      date: 'Now',
      score: currentScore,
      change: 10,
      reason: 'Current score',
    },
  ]
  return items
}

export function ReputationHistory({ currentScore }: ReputationHistoryProps) {
  const p = useV4Palette()
  const history = generateMockHistory(currentScore)

  return (
    <div className="rounded-3xl p-5 relative backdrop-blur-20" style={{ background: p.glass.bg, border: p.glass.border }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className={`w-5 h-5 text-[#00D084]`} />
        <h3 className={`font-semibold ${p.textMain}`}>Score History</h3>
      </div>

      <div className="space-y-3">
        {history.map((item, index) => {
          const isPositive = item.change >= 0
          const isCurrent = index === history.length - 1

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCurrent ? 'bg-[#00D084]' : isPositive ? 'bg-[#0EA5E9]' : 'bg-[#EF4444]'
                  }`}
                />
                {index < history.length - 1 && (
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 p-3 rounded-xl ${isCurrent ? 'bg-[#00D084]/5 border border-[#00D084]/20' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-xs ${p.textMuted}`}>{item.date}</div>
                  <div className="flex items-center gap-1">
                    {item.change > 0 ? (
                      <TrendingUp className="w-3 h-3 text-[#00D084]" />
                    ) : item.change < 0 ? (
                      <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                    ) : (
                      <Minus className="w-3 h-3 text-gray-400" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        item.change > 0 ? 'text-[#00D084]' : item.change < 0 ? 'text-[#EF4444]' : 'text-gray-400'
                      }`}
                    >
                      {item.change > 0 ? '+' : ''}{item.change}
                    </span>
                  </div>
                </div>
                <div className={`text-sm font-medium ${p.textMain} mt-0.5`}>
                  Score: {item.score}
                </div>
                <div className={`text-xs ${p.textMuted}`}>{item.reason}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className={`text-xs ${p.textMuted} mt-3 text-center`}>
        Historical data is simulated until on-chain events are indexed
      </div>
    </div>
  )
}
