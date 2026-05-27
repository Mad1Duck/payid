import { Sliders } from 'lucide-react'
import { Card, Badge } from '@/features/shared/components/AdminPrimitives'

interface Contract {
  name: string
  addr: string
  init?: boolean
}

interface Props {
  p: any
  contracts: Contract[]
}

export function ContractAddressRegistry({ p, contracts }: Props) {
  return (
    <Card
      title="Contract Address Registry"
      icon={Sliders}
      delay={0.02}
      collapsible
    >
      <p className={`text-[11px] ${p.textMuted} mb-3`}>
        Addresses configured in <code className="font-mono">main.tsx</code>{' '}
        for the current chain.
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(128,128,128,0.1)' }}
      >
        {contracts.map((c) => {
          const isZero =
            !c.addr || c.addr === '0x0000000000000000000000000000000000000000'
          return (
            <div
              key={c.name}
              className="flex flex-col gap-0.5 px-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'rgba(128,128,128,0.08)' }}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${p.textMain}`}>
                  {c.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {c.init !== undefined && (
                    <Badge
                      ok={c.init}
                      label={c.init ? 'Initialized' : 'Not init'}
                    />
                  )}
                  <Badge ok={!isZero} label={isZero ? 'Missing' : 'Set'} />
                </div>
              </div>
              <span
                className={`text-[10px] font-mono ${isZero ? 'text-red-400/60' : 'text-emerald-400/70'}`}
              >
                {c.addr ?? '—'}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
