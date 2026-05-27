import { Wallet } from 'lucide-react'
import { Card, Field, Btn } from '@/features/shared/components/AdminPrimitives'
import { formatEther } from 'viem'

interface Props {
  p: any
  treasuryBal: bigint
  nativeSymbol: string
  withdrawTo: string
  setWithdrawTo: (val: string) => void
  withdrawAmount: string
  setWithdrawAmount: (val: string) => void
  withdraw: () => void
  withdrawAll: () => void
  txBusy: boolean
}

export function TreasurySection({
  p, treasuryBal, nativeSymbol, withdrawTo, setWithdrawTo, withdrawAmount, setWithdrawAmount,
  withdraw, withdrawAll, txBusy
}: Props) {
  return (
    <Card
      title="Subscription Treasury"
      icon={Wallet}
      delay={0.14}
      collapsible
    >
      <div
        className="p-3 rounded-xl mb-3 text-center"
        style={{
          background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        }}
      >
        <p className={`text-[11px] ${p.textMuted}`}>Accumulated Balance</p>
        <p className="text-2xl font-bold text-[#00D084]">
          {treasuryBal !== undefined ? formatEther(treasuryBal) : '—'}{' '}
          <span className="text-sm">{nativeSymbol}</span>
        </p>
      </div>
      <Field
        label="Recipient Address"
        value={withdrawTo}
        onChange={setWithdrawTo}
        placeholder="0x..."
        mono
      />
      <Field
        label={`Amount (${nativeSymbol})`}
        value={withdrawAmount}
        onChange={setWithdrawAmount}
        placeholder="e.g. 0.01"
      />
      <div className="flex gap-2">
        <Btn
          onClick={withdraw}
          disabled={txBusy || !withdrawTo || !withdrawAmount}
          variant="green"
        >
          Withdraw
        </Btn>
        <Btn
          onClick={withdrawAll}
          disabled={txBusy || !withdrawTo}
          variant="blue"
        >
          Withdraw All
        </Btn>
      </div>
    </Card>
  )
}
