import { Zap } from 'lucide-react'
import { Card, Field, InitSection } from '@/features/shared/components/AdminPrimitives'

interface Props {
  p: any
  pwpInit: boolean
  initPWP: () => void
  txBusy: boolean
  initPWPVerifierAddr: string
  setInitPWPVerifierAddr: (val: string) => void
  initPWPAttestAddr: string
  setInitPWPAttestAddr: (val: string) => void
}

export function PayWithPayIDSetup({
  p, pwpInit, initPWP, txBusy, initPWPVerifierAddr, setInitPWPVerifierAddr,
  initPWPAttestAddr, setInitPWPAttestAddr
}: Props) {
  return (
    <Card
      title="PayWithPayID — Entrypoint Setup"
      icon={Zap}
      delay={0.08}
      collapsible
    >
      <InitSection
        label="Initialize PayWithPayID"
        isInit={pwpInit}
        onInit={initPWP}
        disabled={txBusy}
        fields={
          <>
            <Field
              label="PayIDVerifier Address"
              value={initPWPVerifierAddr}
              onChange={setInitPWPVerifierAddr}
              placeholder="0x... (PayIDVerifier address)"
              mono
            />
            <Field
              label="AttestationVerifier Address"
              value={initPWPAttestAddr}
              onChange={setInitPWPAttestAddr}
              placeholder="0x... (AttestationVerifier address)"
              mono
            />
          </>
        }
      />
    </Card>
  )
}
