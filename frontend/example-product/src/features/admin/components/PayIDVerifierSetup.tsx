import { KeyRound } from 'lucide-react'
import { Card, Field, Divider, InitSection, TrustChecker } from '@/features/shared/components/AdminPrimitives'

interface Props {
  p: any
  verifierInit?: boolean
  initVerifier: () => void
  txBusy: boolean
  initRuleAuthorityAddr: string
  setInitRuleAuthorityAddr: (val: string) => void
  initAttestVerifierAddr: string
  setInitAttestVerifierAddr: (val: string) => void
  attestationVerifierAddr: string
  authorityAddr: string
  setAuthorityAddr: (val: string) => void
  isTrustedAuthority: boolean
  setAuthority: (val: boolean) => void
  address: string
}

export function PayIDVerifierSetup({
  p, verifierInit, initVerifier, txBusy, initRuleAuthorityAddr, setInitRuleAuthorityAddr,
  initAttestVerifierAddr, setInitAttestVerifierAddr, attestationVerifierAddr,
  authorityAddr, setAuthorityAddr, isTrustedAuthority, setAuthority, address
}: Props) {
  return (
    <Card
      title="PayIDVerifier — Setup & Authorities"
      icon={KeyRound}
      delay={0.05}
      collapsible
    >
      <InitSection
        label="Initialize PayIDVerifier"
        isInit={verifierInit}
        onInit={initVerifier}
        disabled={txBusy}
        fields={
          <>
            <Field
              label="Initial Owner (admin wallet)"
              value={initRuleAuthorityAddr}
              onChange={setInitRuleAuthorityAddr}
              placeholder={address ?? '0x... (connected wallet = admin)'}
              mono
            />
            <Field
              label="AttestationVerifier Contract"
              value={initAttestVerifierAddr}
              onChange={setInitAttestVerifierAddr}
              placeholder={
                attestationVerifierAddr !==
                '0x0000000000000000000000000000000000000000'
                  ? attestationVerifierAddr
                  : '0x... (AttestationVerifier address)'
              }
              mono
            />
          </>
        }
      />
      <Divider />
      <p className={`text-[11px] font-semibold ${p.textMuted} mb-2`}>
        Trusted Signer Authorities
      </p>
      <TrustChecker
        label="Authority Address"
        addr={authorityAddr}
        setAddr={setAuthorityAddr}
        isTrusted={isTrustedAuthority}
        onSet={() => setAuthority(true)}
        onRevoke={() => setAuthority(false)}
        disabled={txBusy}
      />
    </Card>
  )
}
