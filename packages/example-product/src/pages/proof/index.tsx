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
import { Button } from '@/components/ui/button'
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
    <div className="p-4 rounded-2xl bg-card border border-border/50">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-mono text-sm text-foreground mt-1 truncate">
            {displayValue}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  )
}

export default function TransactionProof() {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <MobileLayout hideNav>
      <div className="px-5 safe-area-top min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 py-4">
          <button className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              Transaction Proof
            </h1>
            <p className="text-sm text-muted-foreground">
              Cryptographic verification
            </p>
          </div>
        </header>

        {/* Success Banner */}
        <div className="mt-4 p-6 rounded-3xl bg-success-muted border border-success/20 text-center animate-scale-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-success">Payment Complete</h2>
          <p className="text-lg font-semibold text-foreground mt-2">
            {proofData.amount} {proofData.token}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Transaction verified and recorded
          </p>
        </div>

        {/* Proof Summary */}
        <div className="mt-6 space-y-3 animate-slide-up">
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
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-6 flex items-center justify-center gap-2 py-3 text-accent font-medium"
        >
          <Shield className="w-4 h-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced / Developer View
        </button>

        {/* Advanced Details */}
        {showAdvanced && (
          <div className="mt-2 p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-slide-up">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Full Signature
                </p>
                <p className="font-mono text-xs text-foreground break-all bg-secondary/50 p-3 rounded-lg">
                  {proofData.signature}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Verification Status
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium text-success">
                    Cryptographically Verified
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  The rule hash represents the on-chain authority rules. The
                  context hash encapsulates the payment parameters. Both are
                  signed by the signer to create a verifiable proof.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto py-6 space-y-3">
          <Button variant="outline" size="lg" className="w-full">
            <ExternalLink className="w-5 h-5 mr-2" />
            View on-chain verification
          </Button>
          <Button size="icon" className="w-full">
            Done
          </Button>
        </div>
      </div>
    </MobileLayout>
  )
}
