import { useState, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft, Search, User, X, Lock, Check, Loader2,
  AlertCircle, ChevronRight
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { usePayIDFlow } from 'payid-react'
import { parseEther, type Address } from 'viem'

interface Contact {
  name: string
  payId: string
  address: string
}

const mockContacts: Contact[] = [
  { name: 'Alice Johnson', payId: 'alice@payid.app', address: '0x1234567890123456789012345678901234567890' },
  { name: 'Bob Smith', payId: 'bob@payid.app', address: '0xabcdef1234567890abcdef1234567890abcdef12' },
  { name: 'Carol White', payId: 'carol@payid.app', address: '0x9876543210fedcba9876543210fedcba98765432' },
]

type Step = 'who' | 'amount' | 'review' | 'signing' | 'success'

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export function SendFlow() {
  const { address } = useAccount()
  const {
    status,
    isPending,
    isSuccess,
    error,
    txHash,
    execute,
    reset,
  } = usePayIDFlow()

  const [step, setStep] = useState<Step>('who')
  const [recipient, setRecipient] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [customAddress, setCustomAddress] = useState('')

  const ethPrice = 3500
  const idrRate = 15800
  const fiatAmount = parseFloat(amount || '0') * ethPrice * idrRate
  const networkFee = 0.0001 * ethPrice * idrRate

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)

  const filteredContacts = mockContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.payId.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSelectContact = (contact: Contact) => {
    setRecipient(contact)
    setStep('amount')
  }

  const handleReview = () => {
    if (recipient && amount && parseFloat(amount) > 0) {
      setStep('review')
    }
  }

  const handleSend = useCallback(async () => {
    if (!recipient || !amount || !address) return

    setStep('signing')

    await execute({
      receiver: (customAddress || recipient.address) as Address,
      asset: ETH_ADDRESS,
      amount: parseEther(amount),
      payId: recipient.payId,
    })
  }, [recipient, amount, address, customAddress, execute])

  // If payment flow succeeds, advance to success screen
  if (isSuccess && step === 'signing') {
    setStep('success')
  }

  const handleReset = () => {
    reset()
    setStep('who')
    setRecipient(null)
    setAmount('')
    setNote('')
    setCustomAddress('')
    setSearchQuery('')
  }

  // Progress bar
  const progressSteps = ['who', 'amount', 'review']
  const currentStepIndex = progressSteps.indexOf(step === 'signing' ? 'review' : step === 'success' ? 'review' : step)

  return (
    <div className="animate-fade-in">
      {/* Header with back button */}
      {step !== 'success' && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (step === 'who') window.history.back()
              else if (step === 'signing') return // Can't go back while signing
              else setStep(progressSteps[currentStepIndex - 1] as Step)
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={step === 'signing'}
          >
            <ArrowLeft style={{ width: 20, height: 20, color: 'var(--text-primary)' }} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Send Money
          </h1>
        </div>
      )}

      {/* Progress Steps */}
      {step !== 'success' && step !== 'signing' && (
        <div className="flex items-center gap-2 mb-8">
          {progressSteps.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                style={{
                  background: i <= currentStepIndex ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: i <= currentStepIndex ? 'white' : 'var(--text-muted)',
                }}
              >
                {i < currentStepIndex ? (
                  <Check style={{ width: 16, height: 16 }} />
                ) : (
                  i + 1
                )}
              </div>
              {i < progressSteps.length - 1 && (
                <div
                  className="flex-1 h-0.5 rounded transition-colors"
                  style={{
                    background: i < currentStepIndex ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Who */}
      {step === 'who' && (
        <div className="space-y-6 animate-slide-up">
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Who are you sending to?
            </label>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ width: 18, height: 18, color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts or type a Payment Address..."
                className="input w-full pl-11"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Your Contacts
            </p>
            {filteredContacts.map((contact) => (
              <button
                key={contact.payId}
                onClick={() => handleSelectContact(contact)}
                className="card w-full p-4 flex items-center gap-4 text-left hover:scale-[1.01] transition-transform"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #1A1F71, #2D336B)' }}
                >
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {contact.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {contact.payId}
                  </p>
                </div>
                <ChevronRight style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>

          {/* Manual address input */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Or enter manually
            </p>
            <div className="card p-4 space-y-3">
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="Wallet address (0x...) or Payment Address"
                className="input w-full"
              />
              <button
                onClick={() => {
                  if (customAddress) {
                    setRecipient({
                      name: customAddress.slice(0, 6) + '...' + customAddress.slice(-4),
                      payId: customAddress,
                      address: customAddress,
                    })
                    setStep('amount')
                  }
                }}
                disabled={!customAddress}
                className="btn btn-primary w-full justify-center"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: How much */}
      {step === 'amount' && recipient && (
        <div className="space-y-6 animate-slide-up">
          {/* Recipient summary */}
          <div className="card p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #1A1F71, #2D336B)' }}
            >
              {recipient.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {recipient.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {recipient.payId}
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              How much?
            </label>
            <div className="card p-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>
                  Rp
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-right text-4xl font-bold bg-transparent border-none outline-none"
                  style={{ color: 'var(--text-primary)', paddingLeft: '50px' }}
                />
              </div>
              <p className="text-right text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {amount ? `${parseFloat(amount).toFixed(4)} ETH` : '0 ETH'}
              </p>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Add a note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Lunch money"
              className="input w-full"
            />
          </div>

          <button
            onClick={handleReview}
            disabled={!amount || parseFloat(amount) <= 0}
            className="btn btn-primary w-full justify-center py-3.5 text-base"
          >
            Review & Confirm
          </button>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && recipient && (
        <div className="space-y-6 animate-slide-up">
          <div className="card p-5 space-y-4">
            {/* Recipient */}
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ background: 'linear-gradient(135deg, #1A1F71, #2D336B)' }}
              >
                {recipient.name.charAt(0)}
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {recipient.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {recipient.payId}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center py-2">
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatIDR(fiatAmount)}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {parseFloat(amount).toFixed(4)} ETH
              </p>
            </div>

            {note && (
              <div className="py-2 px-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Note</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{note}</p>
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatIDR(fiatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Network fee</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatIDR(networkFee)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2" style={{ borderTop: '1px dashed var(--border-default)' }}>
                <span style={{ color: 'var(--text-primary)' }}>Total</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatIDR(fiatAmount + networkFee)}</span>
              </div>
            </div>
          </div>

          {/* Trust signal */}
          <div className="flex items-center gap-2 justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
            <Lock style={{ width: 14, height: 14 }} />
            Secured by cryptographic signature
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('amount')}
              className="btn btn-outline flex-1 justify-center py-3.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="btn btn-primary flex-1 justify-center py-3.5 text-base"
            >
              Confirm & Send
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Signing */}
      {step === 'signing' && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="relative mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(26, 31, 113, 0.08)' }}
            >
              <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: 'var(--accent-blue)' }} />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Waiting for confirmation...
          </h2>
          <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Check your wallet app and tap Confirm to complete this payment.
          </p>

          {/* Status messages based on flow status */}
          <div className="mt-6 space-y-2">
            {status === 'fetching-rule' && (
              <p className="text-xs animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
                Checking payment rules...
              </p>
            )}
            {status === 'evaluating' && (
              <p className="text-xs animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
                Evaluating payment policy...
              </p>
            )}
            {status === 'proving' && (
              <p className="text-xs animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
                Generating payment proof...
              </p>
            )}
            {status === 'approving' && (
              <p className="text-xs animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
                Approving token spend...
              </p>
            )}
            {status === 'awaiting-wallet' && (
              <p className="text-xs animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
                Waiting for wallet signature...
              </p>
            )}
            {status === 'confirming' && (
              <p className="text-xs animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
                Confirming on the network...
              </p>
            )}
          </div>

          {error && (
            <div
              className="mt-6 p-4 rounded-xl flex items-start gap-3 max-w-sm"
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
            >
              <AlertCircle style={{ width: 18, height: 18, color: '#EF4444', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#EF4444' }}>
                  Payment could not be completed
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {error}
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs font-medium mt-2 hover:underline"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Success */}
      {step === 'success' && recipient && (
        <div className="flex flex-col items-center justify-center py-12 animate-scale-in">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'rgba(0, 200, 150, 0.12)' }}
          >
            <Check style={{ width: 40, height: 40, color: 'var(--accent-green)' }} />
          </div>

          <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--text-primary)' }}>
            {formatIDR(fiatAmount)} sent to {recipient.name}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {parseFloat(amount).toFixed(4)} ETH
          </p>

          {txHash && (
            <div className="mt-4 p-3 rounded-lg max-w-sm w-full" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Transaction ID</p>
              <p className="text-sm font-mono mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>
                {txHash}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-8 w-full max-w-sm">
            <button
              onClick={handleReset}
              className="btn btn-outline flex-1 justify-center py-3"
            >
              Send Another
            </button>
            <Link
              to="/v3/app/dashboard"
              className="btn btn-primary flex-1 justify-center py-3"
            >
              Go Home
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
