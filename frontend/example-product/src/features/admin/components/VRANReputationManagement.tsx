import { User, TrendingUp } from 'lucide-react'
import { Card, Field, Btn } from '@/features/shared/components/AdminPrimitives'

interface Props {
  targetAddress: string
  setTargetAddress: (val: string) => void
  newReputation: string
  setNewReputation: (val: string) => void
  reputationReason: string
  setReputationReason: (val: string) => void
  adjustReputation: () => void
  txBusy: boolean
}

export function VRANReputationManagement({
  targetAddress,
  setTargetAddress,
  newReputation,
  setNewReputation,
  reputationReason,
  setReputationReason,
  adjustReputation,
  txBusy
}: Props) {
  const isValidAddress = targetAddress.startsWith('0x') && targetAddress.length === 42
  const isValidScore = newReputation !== '' && Number(newReputation) >= 0 && Number(newReputation) <= 1000

  return (
    <Card
      title="VRAN — Reputation Management"
      icon={TrendingUp}
      delay={0.18}
      collapsible
    >
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="text-xs text-[#F59E0B]">
              <p className="font-semibold mb-1">Admin Bootstrap for Demo</p>
              <p>Adjust reputation scores to enable reporting/confirming for demo accounts. Use with caution in production.</p>
            </div>
          </div>
        </div>

        <Field
          label="Target Address"
          value={targetAddress}
          onChange={setTargetAddress}
          placeholder="0x..."
        />
        {targetAddress && !isValidAddress && (
          <p className="text-[#EF4444] text-xs">Must be a valid 42-character 0x address</p>
        )}

        <Field
          label="New Reputation Score (0-1000)"
          value={newReputation}
          onChange={setNewReputation}
          placeholder="e.g. 750"
          type="number"
        />
        {newReputation && !isValidScore && (
          <p className="text-[#EF4444] text-xs">Score must be between 0 and 1000</p>
        )}

        <Field
          label="Reason (optional)"
          value={reputationReason}
          onChange={setReputationReason}
          placeholder="e.g. Demo bootstrap"
        />

        <div className="flex gap-2">
          <Btn
            onClick={adjustReputation}
            disabled={txBusy || !isValidAddress || !isValidScore}
            variant="green"
          >
            Adjust Reputation
          </Btn>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 500 = Default (neutral)</p>
          <p>• 700+ = Can submit/confirm reports</p>
          <p>• 100+ = Trusted threshold</p>
          <p>• &lt; 100 = Auto-blacklisted</p>
        </div>
      </div>
    </Card>
  )
}
