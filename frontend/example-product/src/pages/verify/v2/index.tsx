import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/v2/ui/button'
import { RuleCard } from '@/components/v2/RuleCard'
import { WalletButton } from '@/components/v2/WalletButton'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/v2/Layouts/MobileLayout'

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
  const { address, isConnected } = useAccount()
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
              Payment Evaluation
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet'}
            </p>
          </div>
          <WalletButton />
          {/* Demo toggle */}
          <button
            onClick={() => setIsAllowed(!isAllowed)}
            className="text-xs text-slate-500 underline font-medium"
          >
            Toggle demo
          </button>
        </motion.header>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={cn(
            'mt-4 p-6 rounded-2xl text-center',
            result.status === 'allowed'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200',
          )}
        >
          {result.status === 'allowed' ? (
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
          ) : (
            <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
          )}
          <h2
            className={cn(
              'text-2xl font-bold',
              result.status === 'allowed' ? 'text-emerald-700' : 'text-red-700',
            )}
          >
            {result.status === 'allowed'
              ? 'Payment Allowed'
              : 'Payment Rejected'}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            {result.status === 'allowed'
              ? 'Payment satisfies all recipient rules'
              : 'Payment does not meet recipient requirements'}
          </p>
        </motion.div>

        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6 p-4 rounded-xl module-card"
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Amount</span>
              <span className="font-semibold text-slate-900">
                {paymentData.amount} {paymentData.token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">From</span>
              <span className="font-mono text-sm text-slate-900">
                {paymentData.sender}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">To</span>
              <span className="font-mono text-sm text-slate-900">
                {paymentData.recipient}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Rule Evaluation Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-6"
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors btn-tactile"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-slate-900">
                Rule Evaluation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-medium">
                {passedRules} passed, {failedRules} failed
              </span>
              {showDetails ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>
          </button>

          {/* Expanded Rule Details */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 space-y-3"
              >
                {result.rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    type={rule.type}
                    field={rule.field}
                    operator={rule.operator}
                    value={rule.value}
                    evaluationResult={rule.result}
                    actualValue={rule.actual}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-auto py-6 space-y-3"
        >
          {result.status === 'allowed' ? (
            <Button
              size="default"
              className="w-full h-12 rounded-xl btn-tactile bg-teal-600 hover:bg-teal-700 text-white"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Proceed to Pay
            </Button>
          ) : (
            <Button
              size="default"
              className="w-full h-12 rounded-xl btn-tactile bg-slate-300 text-slate-500"
              disabled
            >
              <XCircle className="w-5 h-5 mr-2" />
              Cannot Proceed
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl btn-tactile border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  )
}
