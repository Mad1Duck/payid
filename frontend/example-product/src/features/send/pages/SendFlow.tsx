import { AnimatePresence } from 'framer-motion'
import { useSendFlow } from '../hooks/useSendFlow'
import {
  WalletConnectPrompt,
  StepIndicator,
  RecipientStep,
  AmountStep,
  ReviewStep,
  EvaluatingStep,
  SigningStep,
  SuccessStep,
} from '../components'

export default function SendFlow() {
  const {
    isConnected, balance, chainId, chainName, nativeSymbol, p,
    displayCurrency, convert, format, toggle,
    step, setStep,
    payId, setPayId,
    resolvedName,
    amount, setAmount,
    asset, setAsset,
    txHash,
    denyReason, setDenyReason,
    flowStatus, flowIsPending, flowError,
    balanceValue, pipeline,
    targetPolicy, preflightWarning,
    resolvePayId, handleRunPolicy, reset, copy,
  } = useSendFlow()

  if (!isConnected) {
    return <WalletConnectPrompt p={p} />
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator step={step} p={p} />

      <AnimatePresence mode="wait">
        {step === 'who' && (
          <RecipientStep
            p={p}
            payId={payId}
            setPayId={setPayId}
            resolvePayId={resolvePayId}
          />
        )}

        {step === 'amount' && (
          <AmountStep
            p={p}
            amount={amount}
            setAmount={setAmount}
            setDenyReason={setDenyReason}
            asset={asset}
            setAsset={setAsset}
            balanceValue={balanceValue}
            balance={balance}
            displayCurrency={displayCurrency}
            convert={convert}
            format={format}
            toggle={toggle}
            nativeSymbol={nativeSymbol}
            resolvedName={resolvedName}
            targetPolicy={targetPolicy}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            p={p}
            resolvedName={resolvedName}
            amount={amount}
            asset={asset}
            chainName={chainName}
            chainId={chainId}
            nativeSymbol={nativeSymbol}
            preflightWarning={preflightWarning}
            denyReason={denyReason}
            flowIsPending={flowIsPending}
            onBack={() => setStep('amount')}
            onRunPolicy={handleRunPolicy}
          />
        )}

        {step === 'evaluating' && (
          <EvaluatingStep
            p={p}
            pipeline={pipeline}
            targetPolicy={targetPolicy}
            flowStatus={flowStatus}
            denyReason={denyReason}
            onBack={() => {
              setStep('review')
              setDenyReason('')
            }}
            backDisabled={flowIsPending}
            setStep={setStep}
            setDenyReason={setDenyReason}
            chainId={chainId}
            asset={asset}
          />
        )}

        {step === 'signing' && (
          <SigningStep
            p={p}
            flowStatus={flowStatus}
            denyReason={denyReason}
            flowError={flowError}
            copy={copy}
            reset={reset}
            setStep={setStep}
            handleRunPolicy={handleRunPolicy}
          />
        )}

        {step === 'success' && (
          <SuccessStep
            p={p}
            amount={amount}
            asset={asset}
            resolvedName={resolvedName}
            txHash={txHash}
            reset={reset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
