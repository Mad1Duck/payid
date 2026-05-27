import { Activity, Pause, Play } from 'lucide-react'
import { Card, Field, Divider, Btn } from '@/features/shared/components/AdminPrimitives'

interface Props {
  p: any
  isPaused: boolean
  maxSlot: bigint
  togglePause: () => void
  txBusy: boolean
  subCents: bigint
  priceInEth: string
  ethPrice: string
  nativeSymbol: string
  priceCents: string
  setPriceCents: (val: string) => void
  setPrice: () => void
  oracleAddrRead: string
  oracleAddr: string
  setOracleAddr: (val: string) => void
  setOracle: () => void
}

export function RuleItemERC721State({
  p, isPaused, maxSlot, togglePause, txBusy, subCents, priceInEth, ethPrice, nativeSymbol,
  priceCents, setPriceCents, setPrice, oracleAddrRead, oracleAddr, setOracleAddr, setOracle
}: Props) {
  return (
    <Card
      title="RuleItemERC721 — State & Pricing"
      icon={Activity}
      delay={0.12}
      collapsible
    >
      <div
        className="flex items-center justify-between p-3 rounded-xl mb-3"
        style={{
          background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <p className={`text-[11px] ${p.textMuted}`}>Contract State</p>
          <p
            className={`text-base font-bold ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}
          >
            {isPaused ? '⏸ Paused' : '▶ Active'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-[11px] ${p.textMuted}`}>Max Slots</p>
          <p className={`text-base font-bold ${p.textMain}`}>
            {maxSlot?.toString() ?? '—'}
          </p>
        </div>
        <button
          onClick={togglePause}
          disabled={txBusy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 ${isPaused ? 'bg-emerald-500' : 'bg-amber-500'}`}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5" /> Unpause
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Price (¢ USD)', val: subCents?.toString() ?? '—' },
          { label: `≈ ${nativeSymbol}`, val: priceInEth },
          { label: `${nativeSymbol}/USD`, val: ethPrice ? `$${ethPrice}` : '—' },
        ].map((s) => (
          <div
            key={s.label}
            className="p-2.5 rounded-xl text-center"
            style={{
              background: p.dark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(0,0,0,0.03)',
            }}
          >
            <p className={`text-[10px] ${p.textMuted}`}>{s.label}</p>
            <p className={`text-sm font-bold ${p.textMain}`}>{s.val}</p>
          </div>
        ))}
      </div>
      <Field
        label="New Subscription Price (USD cents)"
        value={priceCents}
        onChange={setPriceCents}
        placeholder="e.g. 10"
        type="number"
      />
      <div className="flex gap-2 mb-3">
        <Btn
          onClick={setPrice}
          disabled={txBusy || !priceCents}
          variant="green"
        >
          Update Price
        </Btn>
      </div>

      <Divider />
      <p className={`text-[11px] font-semibold ${p.textMuted} mb-2`}>
        Price Oracle
      </p>
      <div
        className={`text-[10px] font-mono p-2 rounded-lg mb-2 break-all ${p.textMuted}`}
        style={{
          background: p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        }}
      >
        {oracleAddrRead ?? 'Not set'}
      </div>
      <Field
        label="New Oracle Address"
        value={oracleAddr}
        onChange={setOracleAddr}
        placeholder="0x..."
        mono
      />
      <div className="flex gap-2">
        <Btn
          onClick={setOracle}
          disabled={txBusy || !oracleAddr}
          variant="blue"
        >
          Set Oracle
        </Btn>
      </div>
    </Card>
  )
}
