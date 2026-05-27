import { Lock, Shield } from 'lucide-react'
import { useAdminPage } from '@/features/admin'
import {
  AdminHeader,
  ContractAddressRegistry,
  PayIDVerifierSetup,
  PayWithPayIDSetup,
  AttestationVerifierSetup,
  RuleItemERC721State,
  TreasurySection,
  VRANConfig,
  TxStatusBar,
  AdminWarning,
} from '../components'

/* ═══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const {
    address, isConnected, p, txBusy, txError, hash,
    attestationVerifierAddr,
    initRuleAuthorityAddr, setInitRuleAuthorityAddr,
    initAttestVerifierAddr, setInitAttestVerifierAddr,
    initPWPVerifierAddr, setInitPWPVerifierAddr,
    initPWPAttestAddr, setInitPWPAttestAddr,
    authorityAddr, setAuthorityAddr,
    schemaUID, setSchemaUID,
    attesterAddr, setAttesterAddr,
    priceCents, setPriceCents,
    oracleAddr, setOracleAddr,
    withdrawTo, setWithdrawTo,
    withdrawAmount, setWithdrawAmount,
    minStake, setMinStake,
    consensusThreshold, setConsensusThreshold,
    verifierInit, pwpInit, attVerInit,
    isAdmin,
    isTrustedAuthority, isTrustedAttester, isTrustedSchema,
    isPaused, maxSlot, subCents, oracleAddrRead, treasuryBal,
    vMinStake, vConsensus,
    ethPrice, priceInEth, nativeSymbol,
    initVerifier, initPWP, setAuthority, setSchema, setAttester, setPrice, setOracle, togglePause, withdraw, withdrawAll, setStake, setConsensus,
    CONTRACTS_LIST,
  } = useAdminPage()

  /* ── Render ── */
  if (!isConnected)
    return (
      <div
        className={`p-8 rounded-2xl text-center border ${p.cardBorder} mt-6`}
        style={{ background: p.cardBg }}
      >
        <Lock className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className={`${p.textMain} font-medium`}>Wallet not connected</p>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Connect an admin wallet to access protocol settings
        </p>
      </div>
    )

  if (!isAdmin)
    return (
      <div
        className={`p-8 rounded-2xl text-center border ${p.cardBorder} mt-6`}
        style={{ background: p.cardBg }}
      >
        <Shield className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className={`${p.textMain} font-medium`}>Access Denied</p>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Your wallet does not have admin privileges.
        </p>
      </div>
    )

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      <AdminHeader p={p} address={address} />

      <ContractAddressRegistry p={p} contracts={CONTRACTS_LIST} />

      <PayIDVerifierSetup
        p={p}
        verifierInit={verifierInit}
        initVerifier={initVerifier}
        txBusy={txBusy}
        initRuleAuthorityAddr={initRuleAuthorityAddr}
        setInitRuleAuthorityAddr={setInitRuleAuthorityAddr}
        initAttestVerifierAddr={initAttestVerifierAddr}
        setInitAttestVerifierAddr={setInitAttestVerifierAddr}
        attestationVerifierAddr={attestationVerifierAddr}
        authorityAddr={authorityAddr}
        setAuthorityAddr={setAuthorityAddr}
        isTrustedAuthority={isTrustedAuthority}
        setAuthority={setAuthority}
        address={address}
      />

      <PayWithPayIDSetup
        p={p}
        pwpInit={pwpInit}
        initPWP={initPWP}
        txBusy={txBusy}
        initPWPVerifierAddr={initPWPVerifierAddr}
        setInitPWPVerifierAddr={setInitPWPVerifierAddr}
        initPWPAttestAddr={initPWPAttestAddr}
        setInitPWPAttestAddr={setInitPWPAttestAddr}
      />

      <AttestationVerifierSetup
        p={p}
        attVerInit={attVerInit}
        txBusy={txBusy}
        schemaUID={schemaUID}
        setSchemaUID={setSchemaUID}
        isTrustedSchema={isTrustedSchema}
        setSchema={setSchema}
        attesterAddr={attesterAddr}
        setAttesterAddr={setAttesterAddr}
        isTrustedAttester={isTrustedAttester}
        setAttester={setAttester}
      />

      <RuleItemERC721State
        p={p}
        isPaused={isPaused}
        maxSlot={maxSlot}
        togglePause={togglePause}
        txBusy={txBusy}
        subCents={subCents}
        priceInEth={priceInEth}
        ethPrice={ethPrice}
        nativeSymbol={nativeSymbol}
        priceCents={priceCents}
        setPriceCents={setPriceCents}
        setPrice={setPrice}
        oracleAddrRead={oracleAddrRead}
        oracleAddr={oracleAddr}
        setOracleAddr={setOracleAddr}
        setOracle={setOracle}
      />

      <TreasurySection
        p={p}
        treasuryBal={treasuryBal}
        nativeSymbol={nativeSymbol}
        withdrawTo={withdrawTo}
        setWithdrawTo={setWithdrawTo}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        withdraw={withdraw}
        withdrawAll={withdrawAll}
        txBusy={txBusy}
      />

      <VRANConfig
        p={p}
        vMinStake={vMinStake}
        vConsensus={vConsensus}
        nativeSymbol={nativeSymbol}
        minStake={minStake}
        setMinStake={setMinStake}
        consensusThreshold={consensusThreshold}
        setConsensusThreshold={setConsensusThreshold}
        setStake={setStake}
        setConsensus={setConsensus}
        txBusy={txBusy}
      />

      <TxStatusBar p={p} txBusy={txBusy} txError={txError} hash={hash} />

      <AdminWarning p={p} />
    </div>
  )
}
