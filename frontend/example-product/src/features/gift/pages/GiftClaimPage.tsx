import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract } from 'wagmi'
import {
  Gift,
  AlertTriangle,
  Wallet,
  CheckCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared'
import { formatUnits, keccak256, toHex } from 'viem'
import { usePayIDContext } from 'payid-react'
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy'
import { payWithPayIDAbi } from '@/constants/contracts'
import { toast } from 'sonner'

export default function GiftClaimPage() {
  const { isConnected, address } = useAccount()
  const { contracts } = usePayIDContext()
  const { writeContractAsync } = useWriteContract()

  const [payload, setPayload] = useState<string | null>(null)
  const [theme, setTheme] = useState<'gold' | 'purple' | 'cyber'>('gold')
  const [sender, setSender] = useState<string | null>(null)
  const [friend, setFriend] = useState<string | null>(null)
  const [assetSymbol, setAssetSymbol] = useState<string>('ETH')
  const [mode, setMode] = useState<'gift' | 'request'>('gift')

  const [policy, setPolicy] = useState<any | null>(null)
  const [isOpened, setIsOpened] = useState(false)
  const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)

  // Parse query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payloadParam = params.get('payload')
    const themeParam = params.get('theme') as any
    const senderParam = params.get('sender')
    const assetParam = params.get('asset')
    const friendParam = params.get('friend')
    const modeParam = params.get('mode') as 'gift' | 'request' | null

    if (payloadParam) setPayload(payloadParam)
    if (themeParam) setTheme(themeParam)
    if (senderParam) setSender(senderParam)
    if (assetParam) setAssetSymbol(assetParam)
    if (friendParam) setFriend(friendParam)
    if (modeParam) setMode(modeParam)

    if (payloadParam) {
      try {
        const decoded = decodeSessionPolicyV2QR(payloadParam)
        setPolicy(decoded)
      } catch (e) {
        console.error('Failed to decode gift payload:', e)
      }
    }
  }, [])

  const getThemeGradient = (selectedTheme: 'gold' | 'purple' | 'cyber') => {
    switch (selectedTheme) {
      case 'purple':
        return 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)'
      case 'cyber':
        return 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)'
      default:
        return 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #92400e 100%)'
    }
  }

  const getThemeShadow = (selectedTheme: 'gold' | 'purple' | 'cyber') => {
    switch (selectedTheme) {
      case 'purple':
        return 'shadow-[0_0_50px_rgba(124,58,237,0.4)] border-purple-500/40'
      case 'cyber':
        return 'shadow-[0_0_50px_rgba(219,39,119,0.4)] border-pink-500/40'
      default:
        return 'shadow-[0_0_50px_rgba(217,119,6,0.4)] border-amber-500/40'
    }
  }

  // Handle claiming gift on-chain
  const handleClaim = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet to claim the gift!')
      return
    }
    if (!policy) {
      toast.error('Invalid gift card payload.')
      return
    }

    // Verify if claimer is targeted receiver
    const isTargeted = friend && friend !== '0x0000000000000000000000000000000000000000' && friend.toLowerCase() !== sender?.toLowerCase()
    if (isTargeted && friend.toLowerCase() !== address.toLowerCase()) {
      toast.error(`This gift is locked. Please switch to wallet ${shortAddr(friend)} to claim.`)
      return
    }

    setStatus('claiming')
    try {
      // 1. Build Decision struct to match the Gifter's EIP-712 signed signature
      const decision = {
        version: policy._versionHash || '0x0200000000000000000000000000000000000000000000000000000000000000',
        payId: policy._payIdHash || (policy.payId ? keccak256(toHex(policy.payId)) : '0x0000000000000000000000000000000000000000000000000000000000000000'),
        payer: policy._payer || sender || '0x0000000000000000000000000000000000000000', // EXACT Gifter's Address used in signature
        receiver: policy.receiver, // Friend's Address (the Gifter-signed receiver)
        asset: policy.allowedAsset || '0x0000000000000000000000000000000000000000',
        amount: BigInt(policy.maxAmount),
        contextHash: policy._contextHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
        ruleSetHash: policy.ruleSetHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
        ruleAuthority: policy.ruleAuthority || '0x0000000000000000000000000000000000000000',
        issuedAt: BigInt((policy as any).issuedAt || (Math.floor(Date.now() / 1000) - 30)),
        expiresAt: BigInt(policy.expiresAt),
        nonce: policy.policyNonce || '0x1000000000000000000000000000000000000000000000000000000000000000',
        requiresAttestation: false,
        attestationUIDsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      // 2. Submit payNative or payERC20 transaction
      const isNative = !policy.allowedAsset || policy.allowedAsset === '0x0000000000000000000000000000000000000000'
      let hash: `0x${string}`
      if (isNative) {
        hash = await writeContractAsync({
          address: contracts.payWithPayID,
          abi: payWithPayIDAbi,
          functionName: 'payNative',
          args: [decision as any, policy.signature, []],
          value: BigInt(policy.maxAmount),
        })
      } else {
        hash = await writeContractAsync({
          address: contracts.payWithPayID,
          abi: payWithPayIDAbi,
          functionName: 'payERC20',
          args: [decision as any, policy.signature, []],
        })
      }

      setTxHash(hash)
      setStatus('success')
      toast.success('🎁 Gift claimed successfully on 0G Network!')
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      toast.error('Claim failed. Check balance or address eligibility.')
    }
  }

  if (!payload || !policy) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Invalid Claim Link</h2>
        <p className="text-sm text-slate-400">
          The link is missing the EIP-712 cryptographic gift parameters or is corrupt.
        </p>
      </div>
    )
  }

  const isExpired = policy.expiresAt < Math.floor(Date.now() / 1000)
  const isTargeted = friend && friend !== '0x0000000000000000000000000000000000000000' && friend.toLowerCase() !== sender?.toLowerCase()
  const isEligible = !isTargeted || (isConnected && address?.toLowerCase() === friend.toLowerCase())

  return (
    <div className="max-w-md mx-auto py-12 relative flex flex-col items-center justify-center min-h-[70vh]">
      {/* Stars sparkles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-amber-500/10 rounded-full filter blur-xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-[#00D084]/10 rounded-full filter blur-xl animate-pulse" />
      </div>

      <AnimatePresence mode="wait">
        {!isOpened ? (
          /* Unboxing View */
          <motion.div
            key="unopened"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-center space-y-8 relative z-10"
          >
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" /> You received a {mode === 'gift' ? 'Gift' : 'Payment Request'}!
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                A Premium {mode === 'gift' ? 'Gift Box' : 'Payment Request'} is Waiting
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Sent directly via PAY.ID signed cryptographic policy. Click the box below to open it!
              </p>
            </div>

            {/* Bouncing Animated Gift Box */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: [0, -3, 3, -3, 3, 0] }}
              onClick={() => setIsOpened(true)}
              className="w-48 h-48 mx-auto cursor-pointer relative"
            >
              <div
                className="absolute inset-0 rounded-full filter blur-2xl opacity-30"
                style={{ background: getThemeGradient(theme) }}
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full h-full flex items-center justify-center"
              >
                <Gift
                  className="w-32 h-32 filter drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all"
                  style={{
                    color:
                      theme === 'gold'
                        ? '#fbbf24'
                        : theme === 'purple'
                          ? '#8b5cf6'
                          : '#ec4899',
                  }}
                />
              </motion.div>
            </motion.div>

            <div className="text-xs text-slate-500 font-mono">
              From: {sender ? shortAddr(sender) : 'An unknown sender'}
            </div>
          </motion.div>
        ) : (
          /* Opened & Claim View */
          <motion.div
            key="opened"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full space-y-6 text-center relative z-10"
          >
            {/* Confetti Explosion simulated with spark icons */}
            <div className="flex justify-center gap-1.5 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-extrabold uppercase tracking-widest text-white">
                SURPRISE!
              </span>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>

            {/* 3D Premium Card Display */}
            <motion.div
              whileHover={{ y: -5 }}
              className={`w-full aspect-[1.586/1] rounded-3xl p-6 relative overflow-hidden border text-left ${getThemeShadow(
                theme
              )}`}
              style={{ background: getThemeGradient(theme) }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />

              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wide border border-white/10">
                  <Gift className="w-3.5 h-3.5 text-white" />
                  <span>{isTargeted ? 'FRIEND-LOCKED' : 'PUBLIC VOUCHER'}</span>
                </div>
              </div>

              <div className="mt-8 text-center relative z-10">
                <span className="text-white/60 text-[10px] font-bold tracking-wider uppercase block">{mode === 'gift' ? 'Gift Value' : 'Request Amount'}</span>
                <h2 className="text-white text-3xl font-extrabold tracking-tight mt-0.5 animate-bounce">
                  {formatUnits(BigInt(policy.maxAmount), 18)} <span className="text-xl font-normal opacity-80">{assetSymbol}</span>
                </h2>
              </div>

              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-10">
                <div>
                  <span className="text-white/40 text-[9px] font-bold block">FROM</span>
                  <span className="text-white text-xs font-mono font-semibold">
                    {sender ? shortAddr(sender) : '—'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-white/40 text-[9px] font-bold block">TO</span>
                  <span className="text-white text-xs font-mono font-semibold">
                    {isTargeted ? shortAddr(friend!) : 'ANYONE (YOU)'}
                  </span>
                </div>
              </div>

              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
            </motion.div>

            {/* Action card */}
            <div className="rounded-2xl p-5 border bg-slate-950/40 backdrop-blur-md border-white/5 space-y-4">
              {isExpired ? (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>This gift policy has expired and is no longer claimable.</p>
                </div>
              ) : isTargeted && !isEligible ? (
                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/10 text-xs text-left">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>
                    Locked! Only receiver wallet <span className="font-mono text-white">{shortAddr(friend!)}</span> is eligible. Please switch wallets in MetaMask.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    All cryptographic criteria met! {mode === 'gift' ? 'Claim this gift directly to secure the funds to your wallet.' : 'Fulfill this payment request to send the funds securely.'}
                  </p>

                  {!isConnected ? (
                    <PremiumButton className="w-full flex items-center justify-center gap-2 py-3 rounded-xl">
                      <Wallet className="w-4 h-4" /> Connect Wallet
                    </PremiumButton>
                  ) : (
                    <div className="space-y-2">
                      <PremiumButton
                        onClick={handleClaim}
                        disabled={status === 'claiming' || status === 'success'}
                        isLoading={status === 'claiming'}
                        className="w-full py-3 text-xs flex items-center justify-center gap-2 rounded-xl"
                      >
                        {status === 'success' ? (
                          <>
                            <CheckCircle className="w-4 h-4" /> {mode === 'gift' ? 'Claimed Successfully!' : 'Paid Successfully!'}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> {mode === 'gift' ? 'Claim Gift Card Now' : 'Pay Request Now'}
                          </>
                        )}
                      </PremiumButton>

                      {status === 'success' && txHash && (
                        <div className="pt-2 text-center">
                          <a
                            href={`https://chainscan-newton.0g.ai/tx/${txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#00D084] hover:underline"
                          >
                            View Claim Transaction <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
