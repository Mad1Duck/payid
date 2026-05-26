import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnectorClient, usePublicClient } from 'wagmi'
import {
  Gift,
  AlertTriangle,
  Wallet,
  CheckCircle,
  Sparkles,
  ExternalLink,
  Copy,
  Link2,
  Clock,
  Lock,
  ArrowRight,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared'
import { formatUnits } from 'viem'
import { BrowserProvider } from 'ethers'
import { usePayIDContext } from 'payid-react'
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'
import { payWithPayIDAbi } from '@/constants/contracts'
import { toast } from 'sonner'

function normalizeDirectPayload(directData: { decision: Record<string, any>; signature: string }) {
  const d = directData.decision
  return {
    _direct: directData,
    _versionHash:        d.version,
    _payIdHash:          d.payId,
    _payer:              d.payer,
    receiver:            d.receiver,
    allowedAsset:        d.asset,
    maxAmount:           d.amount,
    _contextHash:        d.contextHash,
    ruleSetHash:         d.ruleSetHash,
    ruleAuthority:       d.ruleAuthority,
    issuedAt:            Number(d.issuedAt),
    expiresAt:           Number(d.expiresAt),
    policyNonce:         d.nonce,
    requiresAttestation: d.requiresAttestation ?? false,
    attestationUIDsHash: d.attestationUIDsHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
    signature:           directData.signature,
  }
}

const THEME_CONFIG = {
  gold:   { gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #92400e 100%)', color: '#fbbf24', shadow: 'shadow-[0_0_50px_rgba(217,119,6,0.4)] border-amber-500/40' },
  purple: { gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)', color: '#8b5cf6', shadow: 'shadow-[0_0_50px_rgba(124,58,237,0.4)] border-purple-500/40' },
  cyber:  { gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)', color: '#ec4899', shadow: 'shadow-[0_0_50px_rgba(219,39,119,0.4)] border-pink-500/40' },
}

export default function GiftClaimPage() {
  const { isConnected, address } = useAccount()
  const { contracts } = usePayIDContext()
  const { writeContractAsync } = useWriteContract()
  const { data: connectorClient } = useConnectorClient()
  const publicClient = usePublicClient()

  const [payload, setPayload] = useState<string | null>(null)
  const [theme, setTheme] = useState<'gold' | 'purple' | 'cyber'>('gold')
  const [sender, setSender] = useState<string | null>(null)
  const [friend, setFriend] = useState<string | null>(null)
  const [assetSymbol, setAssetSymbol] = useState<string>('ETH')
  const [mode, setMode] = useState<'gift' | 'request'>('gift')

  const [policy, setPolicy] = useState<any | null>(null)
  const [isOpened, setIsOpened] = useState(false)
  const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [claimer, setClaimer] = useState<string | null>(null)
  const [pendingParams, setPendingParams] = useState<any | null>(null)
  const [receiptData, setReceiptData] = useState<{ txHash: string; receiver: string; sender: string; amount: string } | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const [signStatus, setSignStatus] = useState<'idle' | 'signing' | 'done' | 'error'>('idle')
  const [tokenDecimals, setTokenDecimals] = useState(18)

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash ?? undefined })

  useEffect(() => {
    if (!receipt) return
    if (receipt.status === 'success') {
      setStatus('success')
      toast.success('🎁 Gift claimed successfully!')
    } else {
      setStatus('error')
      toast.error('Transaction reverted. The gift may already be claimed or the policy expired.')
    }
  }, [receipt])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payloadParam = params.get('payload')
    const themeParam = params.get('theme') as any
    const senderParam = params.get('sender')
    const assetParam = params.get('asset')
    const friendParam = params.get('friend')
    const modeParam = params.get('mode') as 'gift' | 'request' | null
    const claimerParam = params.get('claimer')

    if (payloadParam) setPayload(payloadParam)
    if (themeParam && THEME_CONFIG[themeParam as keyof typeof THEME_CONFIG]) setTheme(themeParam)
    if (senderParam) setSender(senderParam)
    if (assetParam) setAssetSymbol(assetParam)
    if (friendParam) setFriend(friendParam)
    if (modeParam) setMode(modeParam)
    if (claimerParam) setClaimer(claimerParam)

    if (payloadParam) {
      if (payloadParam.startsWith('receipt:')) {
        try { setReceiptData(JSON.parse(atob(payloadParam.slice('receipt:'.length)))) }
        catch (e) { console.error('Failed to decode gift receipt:', e) }
      } else if (payloadParam.startsWith('pending:')) {
        try { setPendingParams(JSON.parse(atob(payloadParam.slice('pending:'.length)))) }
        catch (e) { console.error('Failed to decode pending gift:', e) }
      } else if (payloadParam.startsWith('direct:')) {
        try { setPolicy(normalizeDirectPayload(JSON.parse(atob(payloadParam.slice('direct:'.length))))) }
        catch (e) { console.error('Failed to decode direct gift payload:', e) }
      } else {
        try { setPolicy(decodeSessionPolicyV2QR(payloadParam)) }
        catch (e) { console.error('Failed to decode gift payload:', e) }
      }
    }
  }, [])

  useEffect(() => {
    const assetAddress = policy?.allowedAsset ?? pendingParams?.asset
    const isNative = !assetAddress || assetAddress === '0x0000000000000000000000000000000000000000'
    if (isNative || !publicClient) { setTokenDecimals(18); return }
    const decimalsAbi = [{ name: 'decimals', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' }] as const
    publicClient.readContract({ address: assetAddress as `0x${string}`, abi: decimalsAbi, functionName: 'decimals' })
      .then(d => setTokenDecimals(Number(d)))
      .catch(() => setTokenDecimals(18))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy, pendingParams])

  const handleRequestGift = useCallback(() => {
    if (!address) { toast.error('Connect your wallet first'); return }
    const base = window.location.href.split('&claimer=')[0]
    navigator.clipboard.writeText(`${base}&claimer=${encodeURIComponent(address)}`)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2500)
    toast.success('Claim request link copied! Send it to the gift creator.')
  }, [address])

  const handleSignForClaimer = useCallback(async () => {
    if (!connectorClient || !address || !claimer || !pendingParams) return
    setSignStatus('signing')
    try {
      const { generateDecisionProof } = await import('payid/decision-proof')
      const provider = new BrowserProvider(connectorClient.transport as any)
      const signer = await provider.getSigner()
      const latestBlock = await provider.getBlock('latest')
      const blockTimestamp = latestBlock ? Number(latestBlock.timestamp) : undefined
      const parsedAmount = BigInt(pendingParams.amount)
      const ttl = Math.max(60, pendingParams.expiresAt - Math.floor(Date.now() / 1000))
      const proof = await generateDecisionProof({
        payId: pendingParams.payId,
        payer: address,
        receiver: claimer,
        asset: pendingParams.asset,
        amount: parsedAmount,
        context: {},
        ruleConfig: {},
        ruleSetHashOverride: '0x0000000000000000000000000000000000000000000000000000000000000000',
        ruleAuthority: '0x0000000000000000000000000000000000000000',
        verifyingContract: pendingParams.verifyingContract,
        signer: signer as any,
        chainId: pendingParams.chainId,
        blockTimestamp,
        ttlSeconds: ttl,
      })
      const directData = {
        decision: {
          version:             proof.payload.version,
          payId:               proof.payload.payId,
          payer:               proof.payload.payer,
          receiver:            claimer,
          asset:               proof.payload.asset,
          amount:              proof.payload.amount.toString(),
          contextHash:         proof.payload.contextHash,
          ruleSetHash:         proof.payload.ruleSetHash,
          ruleAuthority:       proof.payload.ruleAuthority,
          issuedAt:            proof.payload.issuedAt.toString(),
          expiresAt:           proof.payload.expiresAt.toString(),
          nonce:               proof.payload.nonce,
          requiresAttestation: (proof.payload as any).requiresAttestation ?? false,
          attestationUIDsHash: (proof.payload as any).attestationUIDsHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
        signature: proof.signature,
      }
      const signedPayload = `direct:${btoa(JSON.stringify(directData))}`
      const isNativeAsset = !pendingParams.asset || pendingParams.asset === '0x0000000000000000000000000000000000000000'
      const assetLabel = isNativeAsset ? assetSymbol : 'ERC20'
      const origin = window.location.origin + window.location.pathname
      setSignedUrl(`${origin}?payload=${encodeURIComponent(signedPayload)}&theme=${theme}&sender=${encodeURIComponent(address)}&asset=${encodeURIComponent(assetLabel)}&friend=${encodeURIComponent(claimer)}&mode=gift`)
      setSignStatus('done')
      toast.success('Signed! Copy the link and send it to the claimer.')
    } catch (err: any) {
      console.error(err)
      setSignStatus('error')
      toast.error(err.message?.includes('rejected') ? 'Signing rejected' : 'Signing failed')
    }
  }, [connectorClient, address, claimer, pendingParams, theme, assetSymbol])

  const buildDecision = () => {
    if (!policy) return null
    return {
      version:             policy._versionHash as `0x${string}`,
      payId:               policy._payIdHash as `0x${string}`,
      payer:               (policy._payer || sender || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      receiver:            policy.receiver as `0x${string}`,
      asset:               (policy.allowedAsset || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      amount:              BigInt(policy.maxAmount),
      contextHash:         (policy._contextHash || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
      ruleSetHash:         (policy.ruleSetHash || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
      ruleAuthority:       (policy.ruleAuthority || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      issuedAt:            BigInt(policy.issuedAt ?? (Math.floor(Date.now() / 1000) - 30)),
      expiresAt:           BigInt(policy.expiresAt),
      nonce:               (policy.policyNonce || '0x1000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
      requiresAttestation: policy.requiresAttestation ?? false,
      attestationUIDsHash: (policy.attestationUIDsHash || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
    }
  }

  // For ERC20 gifts/requests: anyone eligible calls payERC20 (pulls from payer's approval)
  // For native requests: payer calls payNative with msg.value (they pay the receiver)
  // For native gifts: SENDER calls payNative with msg.value (they deliver to friend)
  const handleClaim = async () => {
    if (!isConnected || !address) { toast.error('Connect your wallet to claim!'); return }
    if (!policy) { toast.error('Invalid gift card payload.'); return }
    const isNative = !policy.allowedAsset || policy.allowedAsset === '0x0000000000000000000000000000000000000000'
    const isNativeGift = isNative && mode === 'gift'
    const isTargeted = friend && friend !== '0x0000000000000000000000000000000000000000' && friend.toLowerCase() !== sender?.toLowerCase()

    if (isNativeGift) {
      // Sender must deliver — only sender wallet can call payNative for a gift
      if (!isSender) {
        toast.error(`Native gifts are delivered by the sender. Share this link with ${sender ? shortAddr(sender) : 'the sender'} to complete the gift.`)
        return
      }
    } else if (isTargeted && friend.toLowerCase() !== address.toLowerCase()) {
      toast.error(`This gift is locked. Switch to wallet ${shortAddr(friend)} to claim.`)
      return
    }

    // Pre-flight ERC20 balance + allowance check
    if (!isNative && publicClient) {
      const erc20Abi = [
        { name: 'balanceOf', type: 'function', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
        { name: 'allowance', type: 'function', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
        { name: 'decimals', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
      ] as const
      const tokenAddr = policy.allowedAsset as `0x${string}`
      const payerAddr = (policy._payer || sender) as `0x${string}`
      const needed = BigInt(policy.maxAmount)
      const [bal, allowance, tokenDecimals] = await Promise.all([
        publicClient.readContract({ address: tokenAddr, abi: erc20Abi, functionName: 'balanceOf', args: [payerAddr] }).catch(() => 0n),
        publicClient.readContract({ address: tokenAddr, abi: erc20Abi, functionName: 'allowance', args: [payerAddr, contracts.payWithPayID as `0x${string}`] }).catch(() => 0n),
        publicClient.readContract({ address: tokenAddr, abi: erc20Abi, functionName: 'decimals' }).catch(() => 18),
      ])
      const dec = Number(tokenDecimals)
      if ((bal as bigint) < needed) {
        toast.error(`Sender's token balance is too low (has ${formatUnits(bal as bigint, dec)}, needs ${formatUnits(needed, dec)}). The sender must top up their tokens and recreate the gift.`, { duration: 12000 })
        return
      }
      if ((allowance as bigint) < needed) {
        toast.error(`Token allowance is insufficient (approved ${formatUnits(allowance as bigint, dec)}, needs ${formatUnits(needed, dec)}). The sender must recreate the gift to re-approve.`, { duration: 12000 })
        return
      }
    }

    setStatus('claiming')
    try {
      const decision = buildDecision()!
      const callArgs = isNative
        ? { address: contracts.payWithPayID, abi: payWithPayIDAbi, functionName: 'payNative' as const, args: [decision as any, policy.signature, []] as const, value: BigInt(policy.maxAmount) }
        : { address: contracts.payWithPayID, abi: payWithPayIDAbi, functionName: 'payERC20' as const, args: [decision as any, policy.signature, []] as const }
      if (publicClient) {
        if (isNative) {
          await publicClient.simulateContract({ address: contracts.payWithPayID, abi: payWithPayIDAbi, functionName: 'payNative' as const, args: [decision as any, policy.signature, []] as const, value: BigInt(policy.maxAmount), account: address as `0x${string}` })
        } else {
          await publicClient.simulateContract({ address: contracts.payWithPayID, abi: payWithPayIDAbi, functionName: 'payERC20' as const, args: [decision as any, policy.signature, []] as const, account: address as `0x${string}` })
        }
      }
      const hash = await writeContractAsync(callArgs as any)
      setTxHash(hash)
    } catch (err: any) {
      console.error('Claim error:', err)
      setStatus('error')
      // Decode known ERC20 / contract 4-byte error selectors into readable messages
      const ERC20_SIG_MESSAGES: Record<string, string> = {
        '0xe450d38c': "Sender's token balance is insufficient. Ask the sender to top up and recreate the gift.",
        '0xfb8f41b2': "Token allowance is insufficient. Ask the sender to recreate the gift to re-approve.",
        '0x8c5be1e5': "ERC20 transfer not approved. Ask the sender to recreate the gift.",
      }
      const rawMsg: string = err?.message || ''
      const sigMatch = rawMsg.match(/0x[0-9a-fA-F]{8}/)
      const knownMsg = sigMatch ? ERC20_SIG_MESSAGES[sigMatch[0].toLowerCase()] : null
      const reason = knownMsg ||
        err?.cause?.data?.errorName ||
        err?.cause?.reason ||
        err?.cause?.shortMessage ||
        err?.shortMessage ||
        rawMsg ||
        'Unknown error'
      toast.error(`Claim failed: ${reason}`, { duration: 10000 })
    }
  }

  const tc = THEME_CONFIG[theme]
  const now = Math.floor(Date.now() / 1000)
  const isExpired = pendingParams ? pendingParams.expiresAt < now : (policy?.expiresAt ?? 0) < now
  const isTargeted = !pendingParams && friend && friend !== '0x0000000000000000000000000000000000000000' && friend.toLowerCase() !== sender?.toLowerCase()
  const isEligible = !isTargeted || (isConnected && address?.toLowerCase() === (friend as string).toLowerCase())
  const isSender = isConnected && address?.toLowerCase() === sender?.toLowerCase()
  const isClaimer = isConnected && !!claimer && address?.toLowerCase() === claimer.toLowerCase()
  const displayAmount = formatUnits(BigInt(pendingParams ? pendingParams.amount : receiptData ? receiptData.amount : (policy?.maxAmount ?? '0')), tokenDecimals)

  if (!payload || (!policy && !pendingParams && !receiptData)) {
    return (
      <div className="max-w-sm mx-auto py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Invalid Claim Link</h2>
          <p className="text-sm text-slate-400 mt-1">This link is missing the required cryptographic parameters or is corrupted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-10 relative flex flex-col items-center min-h-[70vh]">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full filter blur-3xl opacity-20" style={{ background: tc.color }} />
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-[#00D084]/10 rounded-full filter blur-2xl" />
      </div>

      <AnimatePresence mode="wait">
        {/* ── Unboxing View ── */}
        {!isOpened ? (
          <motion.div
            key="unopened"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full text-center space-y-8 relative z-10"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              {mode === 'gift' ? 'You received a Gift Card!' : 'Someone sent you a Payment Request!'}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">
                {mode === 'gift' ? 'Open Your Gift' : 'View Request'}
              </h1>
              <p className="text-sm text-slate-400">
                From <span className="font-mono text-slate-300 font-semibold">{sender ? shortAddr(sender) : 'Unknown'}</span>
              </p>
            </div>

            {/* Bouncing Gift Box */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpened(true)}
              className="w-44 h-44 mx-auto cursor-pointer relative flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full filter blur-3xl opacity-25" style={{ background: tc.gradient }} />
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Gift
                  className="w-28 h-28 drop-shadow-2xl"
                  style={{ color: tc.color, filter: `drop-shadow(0 0 20px ${tc.color}60)` }}
                />
              </motion.div>
            </motion.button>

            <button
              onClick={() => setIsOpened(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-sm font-semibold text-white transition-all cursor-pointer"
            >
              Tap to Open <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          /* ── Opened View ── */
          <motion.div
            key="opened"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full space-y-5 relative z-10"
          >
            {/* Surprise header */}
            <div className="text-center space-y-1">
              <div className="flex justify-center items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-300">
                  {mode === 'gift' ? 'Gift Card' : 'Payment Request'}
                </span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
            </div>

            {/* Card */}
            <motion.div
              whileHover={{ y: -4 }}
              className={`w-full aspect-[1.586/1] rounded-3xl p-6 relative overflow-hidden border ${tc.shadow}`}
              style={{ background: tc.gradient }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wide border border-white/10">
                  <Gift className="w-3.5 h-3.5" />
                  <span>{isTargeted ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER'}</span>
                </div>
                {isExpired && (
                  <div className="flex items-center gap-1 bg-red-900/50 backdrop-blur-md px-2.5 py-1 rounded-full text-red-300 text-[10px] font-bold border border-red-500/30">
                    <Clock className="w-3 h-3" /> EXPIRED
                  </div>
                )}
              </div>

              <div className="mt-7 text-center relative z-10">
                <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase block">
                  {mode === 'gift' ? 'Gift Value' : 'Request Amount'}
                </span>
                <h2 className="text-white text-4xl font-black tracking-tight mt-1">
                  {displayAmount}
                  <span className="text-xl font-normal opacity-70 ml-2">{assetSymbol}</span>
                </h2>
              </div>

              <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end z-10">
                <div>
                  <span className="text-white/40 text-[9px] font-bold block mb-0.5">FROM</span>
                  <span className="text-white text-xs font-mono font-semibold">{sender ? shortAddr(sender) : '—'}</span>
                </div>
                <div className="text-right">
                  <span className="text-white/40 text-[9px] font-bold block mb-0.5">TO</span>
                  <span className="text-white text-xs font-mono font-semibold">
                    {isTargeted ? shortAddr(friend!) : receiptData ? shortAddr(receiptData.receiver) : 'ANYONE (YOU)'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Action Panel */}
            <div className="rounded-2xl border border-white/5 bg-slate-950/50 backdrop-blur-md overflow-hidden">
              {/* ── Delivered receipt: notification view ── */}
              {receiptData ? (
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-[#00D084]/10 border border-[#00D084]/20">
                    <CheckCircle className="w-5 h-5 text-[#00D084] shrink-0" />
                    <p className="text-sm font-semibold text-[#00D084]">Gift Delivered!</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {displayAmount} {assetSymbol} was sent to your wallet from{' '}
                    <span className="font-mono text-white">{sender ? shortAddr(sender) : 'the sender'}</span>.
                  </p>
                  {receiptData.txHash && (
                    <a
                      href={`https://chainscan-galileo.0g.ai/tx/${receiptData.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      View transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : pendingParams ? (
                isExpired ? (
                  <div className="p-5">
                    <Notice type="error" icon={<Clock className="w-4 h-4" />} title="Gift Expired" body="This gift card is no longer claimable." />
                  </div>
                ) : isSender && !claimer ? (
                  // Sender views their own public gift — waiting for requests
                  <div className="p-5 space-y-4">
                    <StepIndicator current={1} total={3} />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Share this link</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Anyone who opens this page can tap the button below to generate a personal claim request. Once they send you the request link, you sign it and send it back.
                      </p>
                    </div>
                    <Notice type="info" icon={<Sparkles className="w-4 h-4" />} body="Waiting for someone to request..." />
                  </div>
                ) : isSender && claimer ? (
                  // Sender needs to sign for a specific claimer (Phase B)
                  signStatus === 'done' && signedUrl ? (
                    (() => {
                      const isNativeAsset = !pendingParams?.asset || pendingParams?.asset === '0x0000000000000000000000000000000000000000'
                      return (
                        <div className="p-5 space-y-4">
                          <StepIndicator current={3} total={3} />
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">
                              {isNativeAsset ? 'Deliver the gift now' : 'Send the signed link'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {isNativeAsset
                                ? `Open the delivery page and send ${assetSymbol} directly to ${shortAddr(claimer)}.`
                                : `Copy this link and send it to ${shortAddr(claimer)} — they'll claim the tokens.`}
                            </p>
                          </div>
                          {isNativeAsset ? (
                            <button
                              onClick={() => { window.location.href = signedUrl }}
                              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-[#00D084] text-[#0F172A] hover:bg-[#00B86E] transition-colors cursor-pointer"
                            >
                              <ArrowRight className="w-4 h-4" /> Deliver {assetSymbol} to {shortAddr(claimer)}
                            </button>
                          ) : (
                            <button
                              onClick={() => { navigator.clipboard.writeText(signedUrl); setCopyDone(true); setTimeout(() => setCopyDone(false), 2500) }}
                              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-[#00D084]/15 hover:bg-[#00D084]/25 text-[#00D084] border border-[#00D084]/30 transition-colors cursor-pointer"
                            >
                              {copyDone ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Signed Claim Link</>}
                            </button>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <div className="p-5 space-y-4">
                      <StepIndicator current={2} total={3} />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">
                          <span className="font-mono text-slate-300">{shortAddr(claimer)}</span> wants to claim
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Approve by signing — you'll send them a personal claim link valid just for their wallet.
                          Amount: <span className="text-white font-semibold">{formatUnits(BigInt(pendingParams.amount), tokenDecimals)} {assetSymbol}</span>
                        </p>
                      </div>
                      <PremiumButton
                        onClick={handleSignForClaimer}
                        isLoading={signStatus === 'signing'}
                        disabled={signStatus === 'signing'}
                        icon={<Sparkles className="w-4 h-4" />}
                      >
                        Sign & Approve for {shortAddr(claimer)}
                      </PremiumButton>
                    </div>
                  )
                ) : isClaimer ? (
                  // Claimer already requested, waiting for sender
                  <div className="p-5 space-y-4">
                    <StepIndicator current={2} total={3} />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Request sent — waiting for sender</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Share this current page link with{' '}
                        <span className="font-mono text-white">{sender ? shortAddr(sender) : 'the sender'}</span>.
                        They'll sign it and send you a personal claim link.
                      </p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(window.location.href); setCopyDone(true); setTimeout(() => setCopyDone(false), 2500) }}
                      className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    >
                      {copyDone ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Your Request Link</>}
                    </button>
                  </div>
                ) : (
                  // New visitor — Phase A
                  <div className="p-5 space-y-4">
                    <StepIndicator current={1} total={3} />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Request this gift</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {!isConnected
                          ? 'Connect your wallet first, then generate your personal claim request link.'
                          : 'Generate a claim request link and send it to the gift creator. They\'ll sign it and send you a claimable link.'
                        }
                      </p>
                    </div>
                    {!isConnected ? (
                      <button className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-[#00D084] text-[#0F172A] cursor-pointer hover:bg-[#00B86E] transition-colors">
                        <Wallet className="w-4 h-4" /> Connect Wallet
                      </button>
                    ) : (
                      <PremiumButton onClick={handleRequestGift} icon={<Link2 className="w-4 h-4" />}>
                        {copyDone ? 'Copied!' : 'Copy Claim Request Link'}
                      </PremiumButton>
                    )}
                  </div>
                )
              ) : isExpired ? (
                <div className="p-5">
                  <Notice type="error" icon={<Clock className="w-4 h-4" />} title="Gift Expired" body="This gift card is no longer claimable." />
                </div>
              ) : isTargeted && !isEligible ? (
                <div className="p-5">
                  <Notice
                    type="warning"
                    icon={<Lock className="w-4 h-4" />}
                    title="Wallet Locked"
                    body={`This gift is for ${shortAddr(friend!)} only. Switch to that wallet in your browser extension.`}
                  />
                </div>
              ) : (
                // Ready to claim / deliver
                <div className="p-5 space-y-4">
                  {(() => {
                    const isNative = !policy?.allowedAsset || policy?.allowedAsset === '0x0000000000000000000000000000000000000000'
                    const isNativeGift = isNative && mode === 'gift'
                    // Native gift: friend waits, sender delivers
                    if (isNativeGift && !isSender) {
                      return (
                        <>
                          <Notice
                            type="info"
                            icon={<Sparkles className="w-4 h-4" />}
                            title="Gift incoming!"
                            body={`${sender ? shortAddr(sender) : 'The sender'} needs to open this link to deliver ${displayAmount} ${assetSymbol} to your wallet. Copy and share this page URL with them.`}
                          />
                          <button
                            onClick={() => { navigator.clipboard.writeText(window.location.href); setCopyDone(true); setTimeout(() => setCopyDone(false), 2500) }}
                            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                          >
                            {copyDone ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link for Sender</>}
                          </button>
                        </>
                      )
                    }
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#00D084]/15 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-[#00D084]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {isNativeGift ? 'Ready to deliver' : "You're eligible to claim"}
                            </p>
                            <p className="text-xs text-slate-400">All cryptographic checks passed</p>
                          </div>
                        </div>
                        {!isConnected ? (
                          <button className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-[#00D084] text-[#0F172A] cursor-pointer hover:bg-[#00B86E] transition-colors">
                            <Wallet className="w-4 h-4" /> Connect Wallet
                          </button>
                        ) : status === 'success' ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-[#00D084]/10 border border-[#00D084]/20">
                              <CheckCircle className="w-5 h-5 text-[#00D084] shrink-0" />
                              <p className="text-sm font-semibold text-[#00D084]">
                                {isNativeGift ? 'Gift delivered!' : mode === 'gift' ? 'Gift claimed successfully!' : 'Payment sent!'}
                              </p>
                            </div>
                            {txHash && (
                              <a
                                href={`https://chainscan-galileo.0g.ai/tx/${txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                              >
                                View on explorer <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <PremiumButton
                            onClick={handleClaim}
                            disabled={status === 'claiming'}
                            isLoading={status === 'claiming'}
                            icon={status === 'claiming' ? undefined : <Sparkles className="w-4 h-4" />}
                          >
                            {status === 'claiming'
                              ? 'Confirming on-chain...'
                              : isNativeGift ? `Deliver ${displayAmount} ${assetSymbol} to Friend`
                              : mode === 'gift' ? 'Claim Gift Card' : 'Pay Request'}
                          </PremiumButton>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`h-1.5 rounded-full transition-all ${
            step < current ? 'bg-[#00D084] flex-1' :
            step === current ? 'bg-[#00D084] flex-[2]' :
            'bg-white/10 flex-1'
          }`}
        />
      ))}
      <span className="text-[10px] text-slate-500 font-mono ml-1 shrink-0">{current}/{total}</span>
    </div>
  )
}

function Notice({ type, icon, title, body }: { type: 'error' | 'warning' | 'info'; icon: React.ReactNode; title?: string; body: string }) {
  const styles = {
    error:   'text-red-400 bg-red-500/8 border-red-500/15',
    warning: 'text-amber-400 bg-amber-500/8 border-amber-500/15',
    info:    'text-slate-400 bg-white/5 border-white/10',
  }
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${styles[type]}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        {title && <p className="text-sm font-semibold text-white mb-0.5">{title}</p>}
        <p className="text-xs leading-relaxed">{body}</p>
      </div>
    </div>
  )
}
