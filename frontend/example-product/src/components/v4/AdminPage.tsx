import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Pause,
  Play,
  DollarSign,
  Activity,
  AlertTriangle,
  Check,
  X,
  Lock,
  Globe,
  KeyRound,
  Sliders,
  Wallet,
} from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { usePayIDContext } from 'payid-react'
import { parseEther, formatEther } from 'viem'
import { useV4Palette } from './theme'

/* ─── ABI fragments ─── */
const RULE_ITEM_ABI = [
  { name: 'subscriptionUsdCents', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'ethUsdFeed', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'MAX_SLOT', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'setSubscriptionUsdCents', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newCents', type: 'uint256' }], outputs: [] },
  { name: 'setOracle', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newFeed', type: 'address' }], outputs: [] },
  { name: 'pause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const

const PRICE_FEED_ABI = [
  { name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }] },
] as const

const ATTESTATION_VERIFIER_ABI = [
  { name: 'setTrustedSchema', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'schemaUID', type: 'bytes32' }, { name: 'trusted', type: 'bool' }], outputs: [] },
  { name: 'setTrustedAttester', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'attester', type: 'address' }, { name: 'trusted', type: 'bool' }], outputs: [] },
] as const

const PAYID_VERIFIER_ABI = [
  { name: 'setTrustedAuthority', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'authority', type: 'address' }, { name: 'trusted', type: 'bool' }], outputs: [] },
] as const

const VINDEX_REGISTRY_ABI = [
  { name: 'minStake', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'consensusThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'setMinStake', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newStake', type: 'uint256' }], outputs: [] },
  { name: 'setConsensusThreshold', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newThreshold', type: 'uint8' }], outputs: [] },
] as const

const TREASURY_ABI = [
  { name: 'treasuryBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'withdrawTreasury', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdrawAllTreasury', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }], outputs: [] },
] as const

/* ─── Section Card ─── */
function SectionCard({ title, icon: Icon, children, delay = 0 }: { title: string; icon: any; children: React.ReactNode; delay?: number }) {
  const p = useV4Palette()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl p-5 relative"
      style={{ background: p.cardBg }}
    >
      <div className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,208,132,0.12)' }}>
            <Icon className="w-4 h-4 text-[#00D084]" />
          </div>
          <h2 className={`text-sm font-bold ${p.textMain}`}>{title}</h2>
        </div>
        {children}
      </div>
    </motion.div>
  )
}

/* ─── Input Field ─── */
function Field({ label, value, onChange, placeholder, type = 'text', unit }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; unit?: string }) {
  const p = useV4Palette()
  return (
    <div className="mb-3">
      <label className={`text-xs font-medium ${p.textMuted} mb-1 block`}>{label}</label>
      <div className="flex gap-2">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30`}
        />
        {unit && <span className={`self-center text-xs ${p.textMuted}`}>{unit}</span>}
      </div>
    </div>
  )
}

/* ─── Action Button ─── */
function ActionBtn({ onClick, disabled, color = '#00D084', children }: { onClick: () => void; disabled?: boolean; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{ background: color }}
    >
      {children}
    </button>
  )
}

/* ─── Status Badge ─── */
function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
      {active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const { contracts } = usePayIDContext()
  const p = useV4Palette()

  const { writeContract, isPending, error, data: hash } = useWriteContract()
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash })

  const txBusy = isPending || confirming
  const txError = error ? ((error as any).shortMessage ?? (error as any).message ?? 'Transaction failed') : null

  /* ─── Local states ─── */
  const [priceCents, setPriceCents] = useState('')
  const [oracleAddr, setOracleAddr] = useState('')
  const [schemaUID, setSchemaUID] = useState('')
  const [attesterAddr, setAttesterAddr] = useState('')
  const [authorityAddr, setAuthorityAddr] = useState('')
  const [minStake, setMinStake] = useState('')
  const [consensusThreshold, setConsensusThreshold] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawTo, setWithdrawTo] = useState('')

  /* ─── Reads ─── */
  const { data: subCents } = useReadContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: 'subscriptionUsdCents' })
  const { data: oracleAddrRead } = useReadContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: 'ethUsdFeed' })
  const { data: isPaused } = useReadContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: 'paused' })
  const { data: maxSlot } = useReadContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: 'MAX_SLOT' })

  const { data: priceData } = useReadContract({
    address: oracleAddrRead,
    abi: PRICE_FEED_ABI,
    functionName: 'latestRoundData',
    query: { enabled: !!oracleAddrRead && oracleAddrRead !== '0x0000000000000000000000000000000000000000' },
  })

  const { data: vMinStake } = useReadContract({ address: contracts.vindexRegistry, abi: VINDEX_REGISTRY_ABI, functionName: 'minStake' })
  const { data: vConsensus } = useReadContract({ address: contracts.vindexRegistry, abi: VINDEX_REGISTRY_ABI, functionName: 'consensusThreshold' })

  const { data: treasuryBal } = useReadContract({ address: contracts.ruleItemERC721, abi: TREASURY_ABI, functionName: 'treasuryBalance' })

  const ethPrice = priceData ? (Number(priceData[1]) / 1e8).toFixed(2) : null
  const priceInEth = subCents && ethPrice ? ((Number(subCents) / 100) / Number(ethPrice)).toFixed(6) : '—'

  /* ─── Handlers ─── */
  const handleSetPrice = () => { if (!priceCents) return; writeContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: 'setSubscriptionUsdCents', args: [BigInt(priceCents)] }) }
  const handleSetOracle = () => { if (!oracleAddr) return; writeContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: 'setOracle', args: [oracleAddr as `0x${string}`] }) }
  const handleTogglePause = () => { writeContract({ address: contracts.ruleItemERC721, abi: RULE_ITEM_ABI, functionName: isPaused ? 'unpause' : 'pause' }) }

  const attestationVerifierAddr = (contracts as any).attestationVerifier ?? '0x0000000000000000000000000000000000000000' as `0x${string}`
  const vindexRegistryAddr = (contracts as any).vindexRegistry ?? '0x0000000000000000000000000000000000000000' as `0x${string}`

  const handleSetSchema = (trusted: boolean) => { if (!schemaUID) return; writeContract({ address: attestationVerifierAddr, abi: ATTESTATION_VERIFIER_ABI, functionName: 'setTrustedSchema', args: [schemaUID as `0x${string}`, trusted] }) }
  const handleSetAttester = (trusted: boolean) => { if (!attesterAddr) return; writeContract({ address: attestationVerifierAddr, abi: ATTESTATION_VERIFIER_ABI, functionName: 'setTrustedAttester', args: [attesterAddr as `0x${string}`, trusted] }) }
  const handleSetAuthority = (trusted: boolean) => { if (!authorityAddr) return; writeContract({ address: contracts.payIDVerifier, abi: PAYID_VERIFIER_ABI, functionName: 'setTrustedAuthority', args: [authorityAddr as `0x${string}`, trusted] }) }
  const handleSetMinStake = () => { if (!minStake) return; writeContract({ address: vindexRegistryAddr, abi: VINDEX_REGISTRY_ABI, functionName: 'setMinStake', args: [parseEther(minStake)] }) }
  const handleSetConsensus = () => { if (!consensusThreshold) return; writeContract({ address: vindexRegistryAddr, abi: VINDEX_REGISTRY_ABI, functionName: 'setConsensusThreshold', args: [Number(consensusThreshold)] }) }

  const handleWithdraw = () => {
    if (!withdrawTo || !withdrawAmount) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI,
      functionName: 'withdrawTreasury',
      args: [withdrawTo as `0x${string}`, parseEther(withdrawAmount)],
    })
  }

  const handleWithdrawAll = () => {
    if (!withdrawTo) return
    writeContract({
      address: contracts.ruleItemERC721,
      abi: TREASURY_ABI,
      functionName: 'withdrawAllTreasury',
      args: [withdrawTo as `0x${string}`],
    })
  }

  /* ─── Render ─── */
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain} flex items-center gap-2`}>
          <Shield className="w-6 h-6 text-[#00D084]" />
          Protocol Admin
        </h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>Manage PAY.ID protocol parameters and access control</p>
      </div>

      {!isConnected ? (
        <div className={`p-8 rounded-2xl text-center border ${p.cardBorder}`} style={{ background: p.cardBg }}>
          <Lock className="w-10 h-10 text-[#475569] mx-auto mb-3" />
          <p className={`${p.textMain} font-medium`}>Wallet not connected</p>
          <p className={`text-sm ${p.textMuted} mt-1`}>Connect an admin wallet to access protocol settings</p>
        </div>
      ) : (
        <>
          {/* Connected admin card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #00D084 0%, #00B86E 50%, #009E5C 100%)' }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Admin Wallet</div>
                <div className="text-white/70 text-xs font-mono">{address?.slice(0, 10)}...{address?.slice(-8)}</div>
              </div>
              <div className="ml-auto">
                <StatusBadge active={!isPaused} label={isPaused ? 'Paused' : 'Active'} />
              </div>
            </div>
          </motion.div>

          {/* Contract Status */}
          <SectionCard title="Contract Status" icon={Activity} delay={0.05}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-xs ${p.textMuted}`}>RuleItemERC721 State</p>
                <p className={`text-lg font-bold ${p.textMain}`}>{isPaused ? 'Paused' : 'Active'}</p>
              </div>
              <button
                onClick={handleTogglePause}
                disabled={txBusy}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity ${isPaused ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'} disabled:opacity-40`}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Unpause' : 'Pause'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className={`text-xs ${p.textMuted}`}>Max Rule Slots</p>
                <p className={`text-lg font-bold ${p.textMain}`}>{maxSlot?.toString() ?? '—'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className={`text-xs ${p.textMuted}`}>Connected Wallet</p>
                <p className={`text-sm font-mono ${p.textMain}`}>{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
            </div>
          </SectionCard>

          {/* Subscription Pricing */}
          <SectionCard title="Subscription Pricing" icon={DollarSign} delay={0.1}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className={`text-xs ${p.textMuted}`}>Price (USD cents)</p>
                <p className={`text-lg font-bold ${p.textMain}`}>{subCents?.toString() ?? '—'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className={`text-xs ${p.textMuted}`}>Equiv. ETH</p>
                <p className={`text-lg font-bold ${p.textMain}`}>{priceInEth}</p>
              </div>
            </div>
            {ethPrice && <p className={`text-xs ${p.textMuted} mb-3`}>Oracle ETH/USD: ${ethPrice}</p>}
            <Field label="New Price (USD cents)" value={priceCents} onChange={setPriceCents} placeholder="e.g. 35" type="number" />
            <ActionBtn onClick={handleSetPrice} disabled={txBusy || !priceCents} color="#00D084">Update Price</ActionBtn>
          </SectionCard>

          {/* Oracle */}
          <SectionCard title="Price Oracle" icon={Globe} delay={0.15}>
            <div className="p-3 rounded-xl mb-3 font-mono text-xs break-all" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
              <p className={`text-xs ${p.textMuted} mb-1`}>Current Oracle</p>
              <p className={p.textMain}>{oracleAddrRead ?? '—'}</p>
            </div>
            <Field label="New Oracle Address" value={oracleAddr} onChange={setOracleAddr} placeholder="0x..." />
            <ActionBtn onClick={handleSetOracle} disabled={txBusy || !oracleAddr} color="#0EA5E9">Set Oracle</ActionBtn>
          </SectionCard>

          {/* Treasury */}
          <SectionCard title="Subscription Treasury" icon={Wallet} delay={0.175}>
            <div className="p-3 rounded-xl mb-3" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
              <p className={`text-xs ${p.textMuted}`}>Accumulated Balance</p>
              <p className={`text-2xl font-bold text-[#00D084]`}>{treasuryBal ? formatEther(treasuryBal) : '—'} ETH</p>
            </div>
            <Field label="Recipient Address" value={withdrawTo} onChange={setWithdrawTo} placeholder="0x..." />
            <Field label="Amount (ETH)" value={withdrawAmount} onChange={setWithdrawAmount} placeholder="e.g. 0.01" />
            <div className="flex gap-2">
              <ActionBtn onClick={handleWithdraw} disabled={txBusy || !withdrawTo || !withdrawAmount} color="#00D084">Withdraw</ActionBtn>
              <ActionBtn onClick={handleWithdrawAll} disabled={txBusy || !withdrawTo} color="#0EA5E9">Withdraw All</ActionBtn>
            </div>
          </SectionCard>

          {/* Attestation Verifier */}
          <SectionCard title="Attestation Verifier" icon={Shield} delay={0.2}>
            <Field label="Schema UID" value={schemaUID} onChange={setSchemaUID} placeholder="0x..." />
            <div className="flex gap-2 mb-3">
              <ActionBtn onClick={() => handleSetSchema(true)} disabled={txBusy || !schemaUID} color="#00D084">Trust</ActionBtn>
              <ActionBtn onClick={() => handleSetSchema(false)} disabled={txBusy || !schemaUID} color="#EF4444">Revoke</ActionBtn>
            </div>
            <Field label="Attester Address" value={attesterAddr} onChange={setAttesterAddr} placeholder="0x..." />
            <div className="flex gap-2">
              <ActionBtn onClick={() => handleSetAttester(true)} disabled={txBusy || !attesterAddr} color="#00D084">Trust</ActionBtn>
              <ActionBtn onClick={() => handleSetAttester(false)} disabled={txBusy || !attesterAddr} color="#EF4444">Revoke</ActionBtn>
            </div>
          </SectionCard>

          {/* Trusted Authorities */}
          <SectionCard title="PayID Verifier — Authorities" icon={KeyRound} delay={0.25}>
            <Field label="Authority Address" value={authorityAddr} onChange={setAuthorityAddr} placeholder="0x..." />
            <div className="flex gap-2">
              <ActionBtn onClick={() => handleSetAuthority(true)} disabled={txBusy || !authorityAddr} color="#00D084">Whitelist</ActionBtn>
              <ActionBtn onClick={() => handleSetAuthority(false)} disabled={txBusy || !authorityAddr} color="#EF4444">Remove</ActionBtn>
            </div>
          </SectionCard>

          {/* VRAN Config */}
          <SectionCard title="VRAN Config" icon={Sliders} delay={0.3}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className={`text-xs ${p.textMuted}`}>Min Stake</p>
                <p className={`text-sm font-bold ${p.textMain}`}>{vMinStake ? `${formatEther(vMinStake)} ETH` : '—'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className={`text-xs ${p.textMuted}`}>Consensus Threshold</p>
                <p className={`text-sm font-bold ${p.textMain}`}>{vConsensus?.toString() ?? '—'}</p>
              </div>
            </div>
            <Field label="New Min Stake (ETH)" value={minStake} onChange={setMinStake} placeholder="e.g. 0.001" />
            <div className="mb-3">
              <ActionBtn onClick={handleSetMinStake} disabled={txBusy || !minStake} color="#00D084">Update Stake</ActionBtn>
            </div>
            <Field label="New Consensus Threshold" value={consensusThreshold} onChange={setConsensusThreshold} placeholder="e.g. 3" type="number" />
            <ActionBtn onClick={handleSetConsensus} disabled={txBusy || !consensusThreshold} color="#00D084">Update Threshold</ActionBtn>
          </SectionCard>

          {/* TX Status */}
          {(txBusy || txError || hash) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border ${txError ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}
            >
              <div className="flex items-center gap-2">
                {txError ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Activity className="w-4 h-4 text-emerald-400" />}
                <p className={`text-sm font-medium ${txError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {txError ? txError : txBusy ? 'Transaction pending...' : 'Transaction confirmed'}
                </p>
              </div>
              {hash && !txBusy && (
                <p className={`text-xs font-mono mt-1 break-all ${p.textMuted}`}>{hash}</p>
              )}
            </motion.div>
          )}

          {/* Warning */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm font-semibold text-amber-400`}>Admin Access Only</p>
              <p className={`text-xs ${p.textMuted} mt-1`}>
                All actions on this page require the appropriate role (DEFAULT_ADMIN, ADMIN, PAUSER, ENGINE) on the target contract.
                Transactions will revert if your wallet does not hold the required role.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
