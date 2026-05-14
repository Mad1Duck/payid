import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, XCircle, Copy, Check } from 'lucide-react'
import { useVerifyDecision } from 'payid-react'

interface PaymentData {
  amount: number
  token: string
  sender: string
  recipient: string
  timestamp: Date
}

interface RuleEvaluation {
  id: string
  type: string
  field: string
  operator: string
  value: string
  result: 'passed' | 'failed'
  actual: string
}

interface EvaluationResult {
  status: 'allowed' | 'rejected'
  rules: RuleEvaluation[]
}

export function VerifyPage() {
  const [showDetails, setShowDetails] = useState(false)
  const [decisionInput, setDecisionInput] = useState('')
  const [signatureInput, setSignatureInput] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const { data: isValid, isLoading } = useVerifyDecision(
    decisionInput ? JSON.parse(decisionInput) : undefined,
    signatureInput as `0x${string}` | undefined
  )

  // Demo evaluation data
  const paymentData: PaymentData = {
    amount: 250,
    token: 'USDC',
    sender: 'alice.pay.id',
    recipient: 'pay.id/satoshi',
    timestamp: new Date(),
  }

  const evaluationResult: EvaluationResult = {
    status: 'allowed',
    rules: [
      {
        id: '1',
        type: 'minAmount',
        field: 'Amount',
        operator: '>=',
        value: '50 USDC',
        result: 'passed',
        actual: '250 USDC',
      },
      {
        id: '2',
        type: 'allowedToken',
        field: 'Token',
        operator: 'IN',
        value: 'USDC, USDT',
        result: 'passed',
        actual: 'USDC',
      },
      {
        id: '3',
        type: 'allowedSender',
        field: 'Sender',
        operator: 'IN',
        value: 'whitelist',
        result: 'passed',
        actual: 'alice.pay.id',
      },
    ],
  }

  const passedRules = evaluationResult.rules.filter((r) => r.result === 'passed').length
  const failedRules = evaluationResult.rules.filter((r) => r.result === 'failed').length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ decision: decisionInput, signature: signatureInput }, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Verify Decision Proof
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Verify EIP-712 decision proofs on-chain
          </p>
        </div>
      </div>

      {/* Verification Input */}
      <div className="card p-6 space-y-4">
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
            Decision (JSON)
          </label>
          <textarea
            value={decisionInput}
            onChange={(e) => setDecisionInput(e.target.value)}
            className="input font-mono text-xs"
            rows={6}
            placeholder='{"signer":"0x...","decision":"ALLOW","nonce":"0x...","chainId":8453,"ttl":3600}'
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
            Signature
          </label>
          <input
            value={signatureInput}
            onChange={(e) => setSignatureInput(e.target.value)}
            className="input font-mono text-xs"
            placeholder="0x..."
          />
        </div>

        <button
          className="btn btn-primary w-full"
          disabled={!decisionInput || !signatureInput || isLoading}
        >
          {isLoading ? 'Verifying...' : 'Verify Proof'}
        </button>

        {isValid !== undefined && (
          <div
            className="p-4 rounded-lg text-center"
            style={{
              background: isValid ? 'var(--success-alpha)' : 'var(--error-alpha)',
              border: isValid ? '1px solid var(--success)' : '1px solid var(--error)',
              color: isValid ? 'var(--success)' : 'var(--error)',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {isValid ? (
                <CheckCircle2 style={{ width: 20, height: 20 }} />
              ) : (
                <XCircle style={{ width: 20, height: 20 }} />
              )}
              <span className="font-medium">
                {isValid ? 'Proof Valid' : 'Proof Invalid'}
              </span>
            </div>
            <p className="text-xs">
              {isValid
                ? 'The decision proof is cryptographically valid and can be verified on-chain.'
                : 'The decision proof is invalid or has been tampered with.'}
            </p>
          </div>
        )}
      </div>

      {/* Demo Evaluation Section */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle style={{ width: 16, height: 16 }} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Demo Evaluation
            </h3>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Sample payment evaluation
          </span>
        </div>

        {/* Status Banner */}
        <div
          className="p-6 rounded-xl text-center"
          style={{
            background: evaluationResult.status === 'allowed' ? 'var(--success-alpha)' : 'var(--error-alpha)',
            border: evaluationResult.status === 'allowed' ? '1px solid var(--success)' : '1px solid var(--error)',
          }}
        >
          {evaluationResult.status === 'allowed' ? (
            <CheckCircle2 className="mx-auto mb-4" style={{ width: 48, height: 48, color: 'var(--success)' }} />
          ) : (
            <XCircle className="mx-auto mb-4" style={{ width: 48, height: 48, color: 'var(--error)' }} />
          )}
          <h2
            className="text-xl font-bold"
            style={{ color: evaluationResult.status === 'allowed' ? 'var(--success)' : 'var(--error)' }}
          >
            {evaluationResult.status === 'allowed' ? 'Payment Allowed' : 'Payment Rejected'}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {evaluationResult.status === 'allowed'
              ? 'Payment satisfies all recipient rules'
              : 'Payment does not meet recipient requirements'}
          </p>
        </div>

        {/* Payment Summary */}
        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {paymentData.amount} {paymentData.token}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>From</span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                {paymentData.sender}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>To</span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                {paymentData.recipient}
              </span>
            </div>
          </div>
        </div>

        {/* Rule Evaluation Summary */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle style={{ width: 18, height: 18 }} style={{ color: 'var(--text-secondary)' }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Rule Evaluation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {passedRules} passed, {failedRules} failed
              </span>
              {showDetails ? (
                <ChevronUp style={{ width: 18, height: 18 }} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <ChevronDown style={{ width: 18, height: 18 }} style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
          </button>

          {showDetails && (
            <div className="mt-3 space-y-3">
              {evaluationResult.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-lg"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${rule.result === 'passed' ? 'var(--success)' : 'var(--error)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {rule.field}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: rule.result === 'passed' ? 'var(--success-alpha)' : 'var(--error-alpha)',
                        color: rule.result === 'passed' ? 'var(--success)' : 'var(--error)',
                      }}
                    >
                      {rule.result.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                    <div>
                      <span className="font-medium">Operator:</span> {rule.operator}
                    </div>
                    <div>
                      <span className="font-medium">Expected:</span> {rule.value}
                    </div>
                    <div>
                      <span className="font-medium">Actual:</span> {rule.actual}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
