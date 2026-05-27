import { motion } from 'framer-motion'
import { Repeat } from 'lucide-react'
import { formatUnits } from 'viem'
import { toast } from 'sonner'

interface Subscription {
  subId: bigint
  sub: {
    receiver: string
    maxAmount: bigint
    period: bigint
    totalCharged: bigint
    numCharges: bigint
    nextCharge: bigint
  }
}

interface Props {
  p: any
  nativeSymbol: string
  userSubscriptions: Subscription[]
  isLoadingSubs: boolean
  fetchUserSubscriptions: () => void
}

export function ActiveSubscriptions({ p, nativeSymbol, userSubscriptions, isLoadingSubs, fetchUserSubscriptions }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
      style={{ backgroundColor: p.cardBg }}
    >
      <div className="p-5 border-b border-dashed border-[#E5E7EB]/30 flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${p.textMain}`}>Active Subscriptions</h2>
        <button
          onClick={fetchUserSubscriptions}
          disabled={isLoadingSubs}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            isLoadingSubs
              ? 'opacity-50 cursor-not-allowed'
              : 'bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20'
          }`}
        >
          {isLoadingSubs ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
        {userSubscriptions.length === 0 ? (
          <div className="p-8 text-center">
            <Repeat className="w-8 h-8 mx-auto mb-2 text-[#E5E7EB]" />
            <p className={`text-sm ${p.textMuted}`}>No active subscriptions</p>
            <p className={`text-xs ${p.textMuted} mt-1`}>Create subscriptions to see them here</p>
          </div>
        ) : (
          userSubscriptions.map(({ subId, sub }) => (
            <div key={subId.toString()} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00D084]/10 flex items-center justify-center">
                    <Repeat className="w-4 h-4 text-[#00D084]" />
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${p.textMain}`}>
                      {sub.receiver.slice(0, 6)}...{sub.receiver.slice(-4)}
                    </p>
                    <p className={`text-[10px] ${p.textMuted}`}>
                      {formatUnits(sub.maxAmount, 18)} {nativeSymbol} · {sub.period === 604800n ? 'Weekly' : 'Monthly'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${p.textMain}`}>
                    {formatUnits(sub.totalCharged, 18)} {nativeSymbol}
                  </p>
                  <p className={`text-[10px] ${p.textMuted}`}>
                    {sub.numCharges.toString()} charges
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-[#E5E7EB]/30">
                <div className={`text-[10px] ${p.textMuted}`}>
                  Next charge: {new Date(Number(sub.nextCharge) * 1000).toLocaleDateString()}
                </div>
                <button
                  onClick={() => {
                    toast.info('Manual charge requires DecisionProof - integrate SDK to generate proof')
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg bg-[#00D084] text-[#0B0F1A] font-medium hover:bg-[#00D084]/90 transition-colors`}
                >
                  Charge Now
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
