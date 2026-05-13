import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCode,
  Hash,
  Key,
  Shield,
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { WalletButton } from '@/components/WalletButton'
import { MobileLayout } from '@/components/Layouts/MobileLayout'

// Mock proof data
const proofData = {
  transactionId: '0x7a8f...3b2c',
  status: 'verified',
  timestamp: new Date(),
  amount: 250,
  token: 'USDC',
  ruleHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678',
  contextHash:
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  signerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE8A',
  signature:
    '0x9f8e7d6c5b4a3210fedcba0987654321fedcba0987654321fedcba0987654321a1b2c3d4',
}

interface CopyableFieldProps {
  label: string
  value: string
  icon: typeof Hash
  isFullWidth?: boolean
}

function CopyableField({
  label,
  value,
  icon: Icon,
  isFullWidth = false,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayValue = isFullWidth
    ? `${value.slice(0, 16)}...${value.slice(-8)}`
    : `${value.slice(0, 10)}...${value.slice(-6)}`

  return (
    <div className="p-4 rounded-xl module-card">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-600 font-medium">{label}</p>
          <p className="font-mono text-sm text-slate-900 mt-1 truncate">
            {displayValue}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="btn-tactile p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>
    </div>
  )
}

export default function TransactionProof() {
  const { address, isConnected } = useAccount()
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <MobileLayout hideNav>
      <div className="px-5 safe-area-top min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 py-4"
        >
          <Link to="/">
            <button className="btn-tactile p-2.5 -ml-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/20">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Transaction Proof
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet'}
            </p>
          </div>
          <WalletButton />
        </motion.header>

        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-4 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-700">Payment Complete</h2>
          <p className="text-lg font-semibold text-slate-900 mt-2">
            {proofData.amount} {proofData.token}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Transaction verified and recorded
          </p>
        </motion.div>

        {/* Proof Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6 space-y-3"
        >
          <CopyableField
            label="Rule Hash"
            value={proofData.ruleHash}
            icon={Hash}
          />
          <CopyableField
            label="Context Hash"
            value={proofData.contextHash}
            icon={FileCode}
          />
          <CopyableField
            label="Signer Address"
            value={proofData.signerAddress}
            icon={Key}
          />
        </motion.div>

        {/* Advanced Toggle */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-6 flex items-center justify-center gap-2 py-3 text-teal-600 font-semibold btn-tactile"
        >
          <Shield className="w-4 h-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced / Developer View
        </motion.button>

        {/* Advanced Details */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 p-4 rounded-xl bg-slate-50 border border-slate-200"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide mb-1 font-semibold">
                    Full Signature
                  </p>
                  <p className="font-mono text-xs text-slate-900 break-all bg-white p-3 rounded-lg border border-slate-200">
                    {proofData.signature}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide mb-1 font-semibold">
                    Verification Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-semibold text-emerald-600">
                      Cryptographically Verified
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-600">
                    The rule hash represents the on-chain authority rules. The
                    context hash encapsulates the payment parameters. Both are
                    signed by the signer to create a verifiable proof.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-auto py-6 space-y-3"
        >
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl btn-tactile border-slate-200 hover:bg-slate-50"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            View on-chain verification
          </Button>
          <Button className="w-full h-12 rounded-xl btn-tactile bg-slate-900 hover:bg-slate-800 text-white">
            Done
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  )
}
