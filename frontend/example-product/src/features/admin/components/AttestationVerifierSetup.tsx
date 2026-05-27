import { Shield } from 'lucide-react'
import { Card, Divider, TrustChecker, Badge, Field } from '@/features/shared/components/AdminPrimitives'

interface Props {
  p: any
  attVerInit: boolean
  txBusy: boolean
  schemaUID: string
  setSchemaUID: (val: string) => void
  isTrustedSchema: boolean
  setSchema: (val: boolean) => void
  attesterAddr: string
  setAttesterAddr: (val: string) => void
  isTrustedAttester: boolean
  setAttester: (val: boolean) => void
}

export function AttestationVerifierSetup({
  p, attVerInit, txBusy, schemaUID, setSchemaUID, isTrustedSchema, setSchema,
  attesterAddr, setAttesterAddr, isTrustedAttester, setAttester
}: Props) {
  return (
    <Card
      title="AttestationVerifier — Trust Policies"
      icon={Shield}
      delay={0.1}
      collapsible
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold ${p.textMuted}`}>
          Contract Status
        </span>
        <Badge
          ok={attVerInit}
          label={attVerInit ? 'Initialized' : 'Not initialized'}
        />
      </div>
      <Divider />
      <p className={`text-[11px] font-semibold ${p.textMuted} mb-2`}>
        Trusted Schemas (EAS)
      </p>
      <TrustChecker
        label="Schema UID (bytes32)"
        addr={schemaUID}
        setAddr={setSchemaUID}
        isTrusted={isTrustedSchema}
        onSet={() => setSchema(true)}
        onRevoke={() => setSchema(false)}
        disabled={txBusy}
      />
      <Divider />
      <p className={`text-[11px] font-semibold ${p.textMuted} mb-2`}>
        Trusted Attesters
      </p>
      <TrustChecker
        label="Attester Address"
        addr={attesterAddr}
        setAddr={setAttesterAddr}
        isTrusted={isTrustedAttester}
        onSet={() => setAttester(true)}
        onRevoke={() => setAttester(false)}
        disabled={txBusy}
      />
    </Card>
  )
}
