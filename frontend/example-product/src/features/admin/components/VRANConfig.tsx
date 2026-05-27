import { Sliders } from 'lucide-react'
import { Card, Field, Btn } from '@/features/shared/components/AdminPrimitives'
import { formatEther } from 'viem'

interface Props {
  p: any
  vMinStake: bigint
  vConsensus: bigint
  nativeSymbol: string
  minStake: string
  setMinStake: (val: string) => void
  consensusThreshold: string
  setConsensusThreshold: (val: string) => void
  setStake: () => void
  setConsensus: () => void
  txBusy: boolean
}

export function VRANConfig({
  p, vMinStake, vConsensus, nativeSymbol, minStake, setMinStake,
  consensusThreshold, setConsensusThreshold, setStake, setConsensus, txBusy
}: Props) {
  return (
    <Card
      title="VRAN — VindexRegistry Config"
      icon={Sliders}
      delay={0.16}
      collapsible
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: p.dark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.03)',
          }}
        >
          <p className={`text-[10px] ${p.textMuted}`}>Min Stake</p>
          <p className={`text-sm font-bold ${p.textMain}`}>
            {vMinStake !== undefined ? `${formatEther(vMinStake)} ${nativeSymbol}` : '—'}
          </p>
        </div>
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: p.dark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.03)',
          }}
        >
          <p className={`text-[10px] ${p.textMuted}`}>Consensus Threshold</p>
          <p className={`text-sm font-bold ${p.textMain}`}>
            {vConsensus?.toString() ?? '—'}
          </p>
        </div>
      </div>
      <Field
        label={`New Min Stake (${nativeSymbol})`}
        value={minStake}
        onChange={setMinStake}
        placeholder="e.g. 0.001"
      />
      <div className="flex gap-2 mb-3">
        <Btn
          onClick={setStake}
          disabled={txBusy || !minStake}
          variant="green"
        >
          Update Stake
        </Btn>
      </div>
      <Field
        label="New Consensus Threshold"
        value={consensusThreshold}
        onChange={setConsensusThreshold}
        placeholder="e.g. 3"
        type="number"
      />
      <div className="flex gap-2">
        <Btn
          onClick={setConsensus}
          disabled={txBusy || !consensusThreshold}
          variant="green"
        >
          Update Threshold
        </Btn>
      </div>
    </Card>
  )
}
