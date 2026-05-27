import { useAccount } from 'wagmi'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { useCountdown } from '@/features/shared'
import { useReceivePage } from '../hooks/useReceivePage'
import { WalletConnectPrompt, QRCard, QuickControls, PaymentLink, WalletAddress } from '../components'

export default function ReceivePage() {
  const { isConnected, chain } = useAccount()
  const nativeSymbol = chain?.nativeCurrency?.symbol ?? 'ETH'
  const {
    p,
    address,
    payId,
    displayPayId,
    walletAddress,
    copiedPayId,
    copiedWallet,
    showAddress,
    setShowAddress,
    status,
    payload,
    qrDataUrl,
    qrError,
    expiresAt,
    reset,
    maxAmount,
    setMaxAmount,
    expiryMin,
    setExpiryMin,
    handleGenerate,
    handleSaveQR,
    handleShare,
    handleCopyPayId,
    handleCopyWallet,
  } = useReceivePage()

  const { timeLeft, isExpired } = useCountdown(expiresAt, reset)

  const simpleQrUrl = useMemo(() => {
    const paymentUrl = `${window.location.origin}/v4/app/send?to=${encodeURIComponent(payId)}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(paymentUrl)}&format=png&ecc=M`
  }, [payId])

  const hasSecureQr = !!payload
  const activeQrUrl = hasSecureQr ? (qrDataUrl || simpleQrUrl) : simpleQrUrl

  const expiryLabel = (() => {
    const m = Number(expiryMin)
    if (m <= 15) return '15 min'
    if (m <= 60) return '1 hour'
    if (m <= 1440) return '24 hours'
    return '7 days'
  })()

  if (!isConnected) {
    return <WalletConnectPrompt p={p} />
  }

  const isLoading = status === 'signing' || status === 'encoding' || status === 'rendering'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <QRCard
        p={p}
        displayPayId={displayPayId}
        walletAddress={walletAddress}
        activeQrUrl={activeQrUrl}
        isLoading={isLoading}
        isExpired={isExpired}
        hasSecureQr={hasSecureQr}
        timeLeft={timeLeft}
      />

      <QuickControls
        p={p}
        nativeSymbol={nativeSymbol}
        maxAmount={maxAmount}
        setMaxAmount={setMaxAmount}
        expiryMin={expiryMin}
        setExpiryMin={setExpiryMin}
        handleGenerate={handleGenerate}
        reset={reset}
        isLoading={isLoading}
        hasSecureQr={hasSecureQr}
        address={address}
        payload={payload}
      />

      <PaymentLink
        p={p}
        displayPayId={displayPayId}
        payload={payload}
        expiryLabel={expiryLabel}
        copiedPayId={copiedPayId}
        handleCopyPayId={handleCopyPayId}
        handleShare={handleShare}
      />

      <WalletAddress
        p={p}
        showAddress={showAddress}
        setShowAddress={setShowAddress}
        walletAddress={walletAddress}
        copiedWallet={copiedWallet}
        handleCopyWallet={handleCopyWallet}
      />

      <div className="text-center">
        <button
          onClick={() => {
            if (hasSecureQr) {
              handleSaveQR()
            } else {
              window.open(simpleQrUrl, '_blank')
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#00D084] hover:bg-[#00D084]/10 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" /> Save QR Image
        </button>
        {qrError && (
          <p className="mt-2 text-xs text-red-400">{qrError}</p>
        )}
      </div>
    </div>
  )
}
