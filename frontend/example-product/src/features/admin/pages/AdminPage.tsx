import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Check,
  KeyRound,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sliders,
  Wallet,
  Zap,
} from 'lucide-react'
import { formatEther } from 'viem'
import { Card, Field, Btn, Divider, InitSection, TrustChecker, Badge } from '@/features/shared/components/AdminPrimitives'
import { useAdminPage } from '@/features/admin'

/* ═══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const {
    address, isConnected, p, contracts, txBusy, txError, hash,
    attestationVerifierAddr, vindexRegistryAddr,
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
    isTrustedAuthority, isTrustedAttester, isTrustedSchema,
    isPaused, maxSlot, subCents, oracleAddrRead, priceData, treasuryBal,
    vMinStake, vConsensus,
    ethPrice, priceInEth,
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

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,208,132,0.12)' }}
        >
          <Shield className="w-5 h-5 text-[#00D084]" />
        </div>
        <div>
          <h1 className={`text-lg font-bold ${p.textMain}`}>Protocol Admin</h1>
          <p className={`text-xs ${p.textMuted}`}>
            PAY.ID contract configuration & access control
          </p>
        </div>
        <div className="ml-auto">
          <span
            className={`text-[10px] font-mono px-2 py-1 rounded-lg ${p.textMuted}`}
            style={{
              background: p.dark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.05)',
            }}
          >
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
        </div>
      </div>

      {/* ── 1. Contract Address Registry ── */}
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
          {CONTRACTS_LIST.map((c) => {
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

      {/* ── 2. PayIDVerifier Initialization ── */}
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

      {/* ── 3. PayWithPayID Initialization ── */}
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

      {/* ── 4. AttestationVerifier ── */}
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

      {/* ── 5. RuleItemERC721 ── */}
      <Card
        title="RuleItemERC721 — State & Pricing"
        icon={Activity}
        delay={0.12}
        collapsible
      >
        {/* Status bar */}
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

        {/* Pricing */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Price (¢ USD)', val: subCents?.toString() ?? '—' },
            { label: '≈ ETH', val: priceInEth },
            { label: 'ETH/USD', val: ethPrice ? `$${ethPrice}` : '—' },
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

      {/* ── 6. Treasury ── */}
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
            <span className="text-sm">ETH</span>
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
          label="Amount (ETH)"
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

      {/* ── 7. VRAN ── */}
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
              {vMinStake !== undefined ? `${formatEther(vMinStake)} ETH` : '—'}
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
          label="New Min Stake (ETH)"
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

      {/* ── TX Status bar ── */}
      <AnimatePresence>
        {(txBusy || txError || hash) && (
          <motion.div
            key="tx"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 ${txError ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}
          >
            {txBusy ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
            ) : txError ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${txError ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {txError ??
                  (txBusy ? 'Transaction pending…' : 'Transaction confirmed ✓')}
              </p>
              {hash && !txBusy && (
                <p
                  className={`text-[10px] font-mono mt-1 break-all ${p.textMuted}`}
                >
                  {hash}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Warning ── */}
      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className={`text-[11px] ${p.textMuted}`}>
          All actions require the appropriate role (
          <code className="font-mono">DEFAULT_ADMIN</code>,{' '}
          <code className="font-mono">ADMIN</code>,{' '}
          <code className="font-mono">PAUSER</code>) on the target contract.
          Transactions will revert if the connected wallet lacks the required
          role.
        </p>
      </div>
    </div>
  )
}
