import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RuleCard } from '@/components/RuleCard'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/Layouts/MobileLayout'

// Mock evaluation data
const paymentData = {
  amount: 250,
  token: 'USDC',
  sender: 'alice.pay.id',
  recipient: 'pay.id/satoshi',
  timestamp: new Date(),
}

const evaluationResult = {
  status: 'allowed' as const,
  rules: [
    {
      id: '1',
      type: 'minAmount' as const,
      field: 'Amount',
      operator: '>=',
      value: '50 USDC',
      result: 'passed' as const,
      actual: '250 USDC',
    },
    {
      id: '2',
      type: 'allowedToken' as const,
      field: 'Token',
      operator: 'IN',
      value: 'USDC, USDT',
      result: 'passed' as const,
      actual: 'USDC',
    },
    {
      id: '3',
      type: 'allowedSender' as const,
      field: 'Sender',
      operator: 'IN',
      value: 'whitelist',
      result: 'passed' as const,
      actual: 'alice.pay.id',
    },
  ],
}

// Alternative rejected scenario
const rejectedResult = {
  status: 'rejected' as const,
  rules: [
    {
      id: '1',
      type: 'minAmount' as const,
      field: 'Amount',
      operator: '>=',
      value: '100 USDC',
      result: 'failed' as const,
      actual: '50 USDC',
    },
    {
      id: '2',
      type: 'allowedToken' as const,
      field: 'Token',
      operator: 'IN',
      value: 'USDC, USDT',
      result: 'passed' as const,
      actual: 'USDC',
    },
  ],
}

export default function PaymentEvaluation() {
  const [showDetails, setShowDetails] = useState(false)

  // Toggle between allowed/rejected for demo
  const [isAllowed, setIsAllowed] = useState(true)
  const result = isAllowed ? evaluationResult : rejectedResult

  const passedRules = result.rules.filter((r) => r.result === 'passed').length
  const failedRules = result.rules.filter((r) => r.result === 'failed').length

  return (
    <MobileLayout hideNav>
      <div className="px-5 safe-area-top min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 py-4">
          <button
            // onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              Payment Evaluation
            </h1>
            <p className="text-sm text-muted-foreground">Before you pay</p>
          </div>
          {/* Demo toggle */}
          <button
            onClick={() => setIsAllowed(!isAllowed)}
            className="text-xs text-muted-foreground underline"
          >
            Toggle demo
          </button>
        </header>

        {/* Status Banner */}
        <div
          className={cn(
            'mt-4 p-6 rounded-3xl text-center animate-scale-in',
            result.status === 'allowed'
              ? 'bg-success-muted border border-success/20'
              : 'bg-destructive-muted border border-destructive/20',
          )}
        >
          {result.status === 'allowed' ? (
            <CheckCircle2 className="w-16 h-16 mx-auto text-success mb-4" />
          ) : (
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
          )}
          <h2
            className={cn(
              'text-2xl font-bold',
              result.status === 'allowed' ? 'text-success' : 'text-destructive',
            )}
          >
            {result.status === 'allowed'
              ? 'Payment Allowed'
              : 'Payment Rejected'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {result.status === 'allowed'
              ? 'Payment satisfies all recipient rules'
              : 'Payment does not meet recipient requirements'}
          </p>
        </div>

        {/* Payment Summary */}
        <div className="mt-6 p-4 rounded-2xl bg-card border border-border/50 animate-fade-in">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-foreground">
                {paymentData.amount} {paymentData.token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From</span>
              <span className="font-mono text-sm text-foreground">
                {paymentData.sender}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To</span>
              <span className="font-mono text-sm text-foreground">
                {paymentData.recipient}
              </span>
            </div>
          </div>
        </div>

        {/* Rule Evaluation Summary */}
        <div className="mt-6 animate-slide-up">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">
                Rule Evaluation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {passedRules} passed, {failedRules} failed
              </span>
              {showDetails ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Expanded Rule Details */}
          {showDetails && (
            <div className="mt-3 space-y-3 animate-slide-up">
              {result.rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <RuleCard
                    type={rule.type}
                    field={rule.field}
                    operator={rule.operator}
                    value={rule.value}
                    evaluationResult={rule.result}
                    actualValue={rule.actual}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto py-6 space-y-3">
          {result.status === 'allowed' ? (
            <Button
              size="default"
              variant="default"
              className="w-full mt-4 h-12 bg-accent"
              // onClick={() => navigate("/proof")}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Proceed to Pay
            </Button>
          ) : (
            <Button
              size="default"
              variant="default"
              className="w-full mt-4 h-12"
              disabled
            >
              <XCircle className="w-5 h-5 mr-2" />
              Cannot Proceed
            </Button>
          )}
          <Button variant="default" className="w-full mt-4 h-12">
            Cancel
          </Button>
        </div>
      </div>
    </MobileLayout>
  )
}
