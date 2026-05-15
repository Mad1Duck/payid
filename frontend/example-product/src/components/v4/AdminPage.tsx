import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sliders,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { usePayIDContext } from 'payid-react'
import { formatEther, parseEther } from 'viem'
import {
  attestationVerifierAbi,
  payIDVerifierAbi,
  payWithPayIDAbi,
  ruleItemERC721Abi,
  vindexRegistryAbi,
} from '../../constants/contracts'
import { useV4Palette } from './theme'

/* ── ABI extras ── */
const PRICE_FEED_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const

const TREASURY_ABI = [
  {
    name: 'treasuryBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'withdrawTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawAllTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [],
  },
] as const

/* ── UI helpers ── */
function Card({
  title,
  icon: Icon,
  children,
  delay = 0,
  collapsible = false,
}: {
  title: string
  icon: any
  children: React.ReactNode
  delay?: number
  collapsible?: boolean
}) {
  const p = useV4Palette()
  const [open, setOpen] = useState(true)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl relative overflow-hidden"
      style={{ background: p.cardBg }}
    >
      <div
        className={`absolute inset-0 rounded-2xl border ${p.cardBorder} pointer-events-none`}
      />
      <div className="relative">
        <button
          onClick={() => collapsible && setOpen((o) => !o)}
          className={`w-full flex items-center gap-2.5 p-4 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,208,132,0.12)' }}
          >
            <Icon className="w-3.5 h-3.5 text-[#00D084]" />
          </div>
          <h2 className={`text-sm font-bold ${p.textMain} flex-1 text-left`}>
            {title}
          </h2>
          {collapsible &&
            (open ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ))}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  mono?: boolean
}) {
  const p = useV4Palette()
  return (
    <div className="mb-2.5">
      <label className={`text-[11px] font-medium ${p.textMuted} mb-1 block`}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-xl text-xs border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

function Btn({
  onClick,
  disabled,
  variant = 'green',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'green' | 'red' | 'blue' | 'ghost'
  children: React.ReactNode
}) {
  const colors = {
    green: '#00D084',
    red: '#EF4444',
    blue: '#0EA5E9',
    ghost: 'transparent',
  }
  const textColors = {
    green: 'text-white',
    red: 'text-white',
    blue: 'text-white',
    ghost: 'text-gray-400',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-35 border ${variant === 'ghost' ? 'border-gray-600' : 'border-transparent'} ${textColors[variant]}`}
      style={{
        background: variant === 'ghost' ? 'transparent' : colors[variant],
      }}
    >
      {children}
    </button>
  )
}

function Badge({ ok, label }: { ok: boolean | undefined; label?: string }) {
  if (ok === undefined)
    return <span className="text-[10px] text-gray-500 font-mono">loading…</span>
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
    >
      {ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
      {label ?? (ok ? 'Set' : 'Not set')}
    </span>
  )
}

function Divider() {
  return (
    <div
      className="my-3 h-px"
      style={{ background: 'rgba(128,128,128,0.1)' }}
    />
  )
}

/* ── Sub-component: Init row with on-chain status ── */
function InitSection({
  label,
  isInit,
  onInit,
  fields,
  disabled,
}: {
  label: string
  isInit: boolean | undefined
  onInit: () => void
  fields: React.ReactNode
  disabled: boolean
}) {
  const p = useV4Palette()
  return (
    <div
      className="p-3 rounded-xl mb-3"
      style={{
        background: p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        border: '1px solid rgba(128,128,128,0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xs font-bold ${p.textMain}`}>{label}</span>
        <Badge ok={isInit} label={isInit ? 'Initialized' : 'Not initialized'} />
      </div>
      {fields}
      <Btn
        onClick={onInit}
        disabled={disabled || isInit === true}
        variant="green"
      >
        {isInit ? '✓ Already Initialized' : 'Initialize'}
      </Btn>
    </div>
  )
}

/* ── Sub-component: Trust check input ── */
function TrustChecker({
  label,
  addr,
  setAddr,
  isTrusted,
  onSet,
  onRevoke,
  disabled,
}: {
  label: string
  addr: string
  setAddr: (v: string) => void
  isTrusted: boolean | undefined
  onSet: () => void
  onRevoke: () => void
  disabled: boolean
}) {
  return (
    <div>
      <Field
        label={label}
        value={addr}
        onChange={setAddr}
        placeholder="0x..."
        mono
      />
      <div className="flex items-center gap-2 mt-1">
        {addr.startsWith('0x') && addr.length === 42 && (
          <Badge
            ok={isTrusted}
            label={isTrusted ? 'Trusted ✓' : 'Not trusted'}
          />
        )}
        <div className="ml-auto flex gap-1.5">
          <Btn onClick={onSet} disabled={disabled || !addr} variant="green">
            Set / Trust
          </Btn>
          <Btn onClick={onRevoke} disabled={disabled || !addr} variant="red">
            Revoke
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const { contracts } = usePayIDContext()
  const p = useV4Palette()

  const { writeContract, isPending, error, data: hash } = useWriteContract()
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash })
  const txBusy = isPending || confirming
  const txError = error
    ? ((error as any).shortMessage ??
      (error as any).message ??
      'Transaction failed')
    : null

  /* ── Contract addresses ── */
  const attestationVerifierAddr: `0x${string}` =
    (contracts as any).attestationVerifier ??
    '0x0000000000000000000000000000000000000000'
  const vindexRegistryAddr: `0x${string}` =
    (contracts as any).vindexRegistry ??
    '0x0000000000000000000000000000000000000000'

  /* ── Form state ── */
  // PayIDVerifier.initialize(initialOwner, _attestationVerifier)
  const [initRuleAuthorityAddr, setInitRuleAuthorityAddr] = useState(
    () => address ?? '',
  )
  const [initAttestVerifierAddr, setInitAttestVerifierAddr] = useState(() =>
    attestationVerifierAddr !== '0x0000000000000000000000000000000000000000'
      ? attestationVerifierAddr
      : '',
  )
  // PayWithPayID.initialize(verifier_, attestationVerifier_)
  const [initPWPVerifierAddr, setInitPWPVerifierAddr] = useState(() =>
    contracts.payIDVerifier !== '0x0000000000000000000000000000000000000000'
      ? contracts.payIDVerifier
      : '',
  )
  const [initPWPAttestAddr, setInitPWPAttestAddr] = useState(() =>
    attestationVerifierAddr !== '0x0000000000000000000000000000000000000000'
      ? attestationVerifierAddr
      : '',
  )

  const [authorityAddr, setAuthorityAddr] = useState('')
  const [schemaUID, setSchemaUID] = useState('')
  const [attesterAddr, setAttesterAddr] = useState('')

  const [priceCents, setPriceCents] = useState('')
  const [oracleAddr, setOracleAddr] = useState('')
  const [withdrawTo, setWithdrawTo] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const [minStake, setMinStake] = useState('')
  const [consensusThreshold, setConsensusThreshold] = useState('')

  /* ── Sync init-form fields when context loads ── */
  useEffect(() => {
    if (address) setInitRuleAuthorityAddr((v) => v || address)
  }, [address])
  useEffect(() => {
    if (
      attestationVerifierAddr !== '0x0000000000000000000000000000000000000000'
    ) {
      setInitAttestVerifierAddr((v) => v || attestationVerifierAddr)
      setInitPWPAttestAddr((v) => v || attestationVerifierAddr)
    }
  }, [attestationVerifierAddr])
  useEffect(() => {
    if (
      contracts.payIDVerifier !== '0x0000000000000000000000000000000000000000'
    ) {
      setInitPWPVerifierAddr((v) => v || contracts.payIDVerifier)
    }
  }, [contracts.payIDVerifier])

  /* ── On-chain reads ── */
  const { data: verifierInit } = useReadContract({
    address: contracts.payIDVerifier,
    abi: payIDVerifierAbi,
    functionName: 'isInitialized',
  })
  const { data: pwpInit } = useReadContract({
    address: contracts.payWithPayID,
    abi: payWithPayIDAbi,
    functionName: 'isInitialized',
  })
  const { data: attVerInit } = useReadContract({
    address: attestationVerifierAddr,
    abi: attestationVerifierAbi,
    functionName: 'isInitialized',
    query: {
      enabled:
        attestationVerifierAddr !==
        '0x0000000000000000000000000000000000000000',
    },
  })

  const { data: isTrustedAuthority } = useReadContract({
    address: contracts.payIDVerifier,
    abi: payIDVerifierAbi,
    functionName: 'trustedAuthorities',
    args: [authorityAddr as `0x${string}`],
    query: {
      enabled: authorityAddr.startsWith('0x') && authorityAddr.length === 42,
    },
  })
  const { data: isTrustedAttester } = useReadContract({
    address: attestationVerifierAddr,
    abi: attestationVerifierAbi,
    functionName: 'trustedAttesters',
    args: [attesterAddr as `0x${string}`],
    query: {
      enabled: attesterAddr.startsWith('0x') && attesterAddr.length === 42,
    },
  })
  const { data: isTrustedSchema } = useReadContract({
    address: attestationVerifierAddr,
    abi: attestationVerifierAbi,
    functionName: 'trustedSchemas',
    args: [schemaUID as `0x${string}`],
    query: { enabled: schemaUID.startsWith('0x') && schemaUID.length === 66 },
  })

  const { data: isPaused } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'paused',
  })
  const { data: maxSlot } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'MAX_SLOT',
  })
  const { data: subCents } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'subscriptionUsdCents',
  })
  const { data: oracleAddrRead } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: ruleItemERC721Abi,
    functionName: 'ethUsdFeed',
  })
  const { data: priceData } = useReadContract({
    address: oracleAddrRead,
    abi: PRICE_FEED_ABI,
    functionName: 'latestRoundData',
    query: {
      enabled:
        !!oracleAddrRead &&
        oracleAddrRead !== '0x0000000000000000000000000000000000000000',
    },
  })
  const { data: treasuryBal } = useReadContract({
    address: contracts.ruleItemERC721,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalance',
  })

  const { data: vMinStake } = useReadContract({
    address: vindexRegistryAddr,
    abi: vindexRegistryAbi,
    functionName: 'minStake',
    query: {
      enabled:
        vindexRegistryAddr !== '0x0000000000000000000000000000000000000000',
    },
  })
  const { data: vConsensus } = useReadContract({
    address: vindexRegistryAddr,
    abi: vindexRegistryAbi,
    functionName: 'consensusThreshold',
    query: {
      enabled:
        vindexRegistryAddr !== '0x0000000000000000000000000000000000000000',
    },
  })

  const ethPrice = priceData ? (Number(priceData[1]) / 1e8).toFixed(2) : null
  const priceInEth =
    subCents && ethPrice
      ? (Number(subCents) / 100 / Number(ethPrice)).toFixed(6)
      : '—'

  /* ── Handlers ── */
  const initVerifier = () => {
    if (!initRuleAuthorityAddr || !initAttestVerifierAddr) return
    writeContract({
      address: contracts.payIDVerifier,
      abi: payIDVerifierAbi,
      functionName: 'initialize',
      args: [
        initRuleAuthorityAddr as `0x${string}`,
        initAttestVerifierAddr as `0x${string}`,
      ],
    })
  }
  const initPWP = () => {
    if (!initPWPVerifierAddr || !initPWPAttestAddr) return
    writeContract({
      address: contracts.payWithPayID,
      abi: payWithPayIDAbi,
      functionName: 'initialize',
      args: [
        initPWPVerifierAddr as `0x${string}`,
        initPWPAttestAddr as `0x${string}`,
      ],
    })
  }
  const setAuthority = (trusted: boolean) => {
    if (!authorityAddr) return
    writeContract({
      address: contracts.payIDVerifier,
      abi: payIDVerifierAbi,
      functionName: 'setTrustedAuthority',
      args: [authorityAddr as `0x${string}`, trusted],
    })
  }
  const setSchema = (trusted: boolean) => {
    if (!schemaUID) return
    writeContract({
      address: attestationVerifierAddr,
      abi: attestationVerifierAbi,
      functionName: 'setTrustedSchema',
      args: [schemaUID as `0x${string}`, trusted],
    })
  }
  const setAttester = (trusted: boolean) => {
    if (!attesterAddr) return
    writeContract({
      address: attestationVerifierAddr,
      abi: attestationVerifierAbi,
      functionName: 'setTrustedAttester',
      args: [attesterAddr as `0x${string}`, trusted],
    })
  }
  const setPrice = () => {
    if (!priceCents) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: ruleItemERC721Abi,
      functionName: 'setSubscriptionUsdCents',
      args: [BigInt(priceCents)],
    })
  }
  const setOracle = () => {
    if (!oracleAddr) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: ruleItemERC721Abi,
      functionName: 'setOracle',
      args: [oracleAddr as `0x${string}`],
    })
  }
  const togglePause = () => {
    writeContract({
      address: contracts.ruleItemERC721,
      abi: ruleItemERC721Abi,
      functionName: isPaused ? 'unpause' : 'pause',
    })
  }
  const withdraw = () => {
    if (!withdrawTo || !withdrawAmount) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI,
      functionName: 'withdrawTreasury',
      args: [withdrawTo as `0x${string}`, parseEther(withdrawAmount)],
    })
  }
  const withdrawAll = () => {
    if (!withdrawTo) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI,
      functionName: 'withdrawAllTreasury',
      args: [withdrawTo as `0x${string}`],
    })
  }
  const setStake = () => {
    if (!minStake) return
    writeContract({
      address: vindexRegistryAddr,
      abi: vindexRegistryAbi,
      functionName: 'setMinStake',
      args: [parseEther(minStake)],
    })
  }
  const setConsensus = () => {
    if (!consensusThreshold) return
    writeContract({
      address: vindexRegistryAddr,
      abi: vindexRegistryAbi,
      functionName: 'setConsensusThreshold',
      args: [Number(consensusThreshold)],
    })
  }

  const CONTRACTS_LIST = [
    { name: 'PayWithPayID', addr: contracts.payWithPayID, init: pwpInit },
    {
      name: 'PayIDVerifier',
      addr: contracts.payIDVerifier,
      init: verifierInit,
    },
    {
      name: 'CombinedRuleStorage',
      addr: contracts.combinedRuleStorage,
      init: undefined,
    },
    { name: 'RuleAuthority', addr: contracts.ruleAuthority, init: undefined },
    { name: 'RuleItemERC721', addr: contracts.ruleItemERC721, init: undefined },
    {
      name: 'AttestationVerifier',
      addr: attestationVerifierAddr,
      init: attVerInit,
    },
    { name: 'VindexRegistry', addr: vindexRegistryAddr, init: undefined },
  ]

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
