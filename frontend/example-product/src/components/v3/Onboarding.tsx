import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Wallet, User, Send } from 'lucide-react'
import { WalletButton } from '../v2/WalletButton'

type OnboardingStep = 'welcome' | 'connect' | 'claim' | 'done'

export function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [payIdInput, setPayIdInput] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const handleCheckAvailability = () => {
    if (payIdInput.length >= 3) {
      setIsAvailable(true) // Mock availability check
    }
  }

  const steps = [
    { icon: Wallet, label: 'Connect your wallet' },
    { icon: User, label: 'Claim your address' },
    { icon: Send, label: 'Send & receive' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 animate-fade-in" style={{ background: 'var(--bg-base)' }}>
      {step === 'welcome' && (
        <div className="max-w-sm w-full text-center space-y-8 animate-slide-up">
          {/* Logo */}
          <div className="space-y-2">
            <div className="text-4xl font-bold tracking-tight">
              <span style={{ color: 'var(--accent-blue)' }}>PAY</span>
              <span style={{ color: 'var(--accent-green)' }}>.ID</span>
            </div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              Send crypto like sending a message
            </p>
          </div>

          {/* Visual Steps */}
          <div className="space-y-4">
            {steps.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(26, 31, 113, 0.08)' }}
                >
                  <s.icon style={{ width: 20, height: 20, color: 'var(--accent-blue)' }} />
                </div>
                <p className="text-sm font-medium text-left" style={{ color: 'var(--text-primary)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => setStep('connect')}
              className="btn btn-primary w-full justify-center py-3.5 text-base"
            >
              Get Started
              <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button
                onClick={() => setStep('connect')}
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-blue)' }}
              >
                Connect wallet
              </button>
            </p>
          </div>
        </div>
      )}

      {step === 'connect' && (
        <div className="max-w-sm w-full text-center space-y-8 animate-slide-up">
          <div className="space-y-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(26, 31, 113, 0.08)' }}
            >
              <Wallet style={{ width: 32, height: 32, color: 'var(--accent-blue)' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Connect your wallet
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your wallet is like your bank account — we never store your password or private keys.
            </p>
          </div>

          <WalletButton />

          <button
            onClick={() => setStep('claim')}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent-blue)' }}
          >
            Skip for now →
          </button>
        </div>
      )}

      {step === 'claim' && (
        <div className="max-w-sm w-full space-y-8 animate-slide-up">
          <div className="text-center space-y-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(0, 200, 150, 0.08)' }}
            >
              <User style={{ width: 32, height: 32, color: 'var(--accent-green)' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Claim your address
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Choose a memorable address that friends can use to send you money.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                Payment Address
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={payIdInput}
                    onChange={(e) => {
                      setPayIdInput(e.target.value)
                      setIsAvailable(null)
                    }}
                    placeholder="yourname"
                    className="input w-full"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    @payid.app
                  </span>
                </div>
              </div>
              {isAvailable === true && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--accent-green)' }}>
                  <Check style={{ width: 14, height: 14 }} />
                  This address is available!
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="input w-full"
              />
            </div>

            <button
              onClick={() => {
                handleCheckAvailability()
                if (payIdInput && displayName) {
                  setStep('done')
                }
              }}
              disabled={!payIdInput || !displayName}
              className="btn btn-primary w-full justify-center py-3.5"
            >
              Continue
              <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="max-w-sm w-full text-center space-y-8 animate-scale-in">
          <div className="space-y-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(0, 200, 150, 0.12)' }}
            >
              <Check style={{ width: 40, height: 40, color: 'var(--accent-green)' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              All set!
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your Payment Address is ready
            </p>
          </div>

          <div className="card p-5 text-left">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Your Payment Address</p>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-blue)' }}>
              {payIdInput}@payid.app
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {displayName}
            </p>
          </div>

          <Link
            to="/v3/app/dashboard"
            className="btn btn-primary w-full justify-center py-3.5 text-base inline-flex"
          >
            Start Using PAY.ID
            <ArrowRight style={{ width: 18, height: 18 }} />
          </Link>
        </div>
      )}
    </div>
  )
}
