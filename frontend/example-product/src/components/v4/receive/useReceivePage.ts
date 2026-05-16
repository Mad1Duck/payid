import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { usePayIDQR } from 'payid-react'
import { useV4Palette } from '../theme'
import { shortAddr, useClipboard } from '@/features/shared'

export function useReceivePage() {
  const p = useV4Palette()
  const { address, isConnected } = useAccount()
  const payId = isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id'
  const walletAddress = address ?? ''
  const { copied, copy } = useClipboard()
  const [showAddress, setShowAddress] = useState(false)

  const { status, payload, qrDataUrl, error: qrError, generate, reset } = usePayIDQR()
  const [maxAmount, setMaxAmount] = useState('')
  const [expiryMin, setExpiryMin] = useState('60')

  const handleGenerate = () => {
    if (!address) return
    const expiresAt = Math.floor(Date.now() / 1000) + (Number(expiryMin) || 60) * 60
    const parsedMax = maxAmount && parseFloat(maxAmount) > 0
      ? BigInt(Math.floor(parseFloat(maxAmount) * 1e18))
      : BigInt('1000000000000000000000000')
    generate({
      payId,
      allowedAsset: '0x0000000000000000000000000000000000000000',
      maxAmount: parsedMax,
      expiresAt,
    })
  }

  const handleSaveQR = () => {
    if (qrDataUrl) {
      const a = document.createElement('a')
      a.href = qrDataUrl
      a.download = 'payid-qr.png'
      a.click()
    } else if (payload) {
      window.open(
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payload)}&format=png`,
        '_blank'
      )
    }
  }

  const handleCopy = useCallback((text: string) => {
    copy(text)
  }, [copy])

  return {
    p, address, isConnected, payId, walletAddress,
    copied, showAddress, setShowAddress,
    status, payload, qrDataUrl, qrError, generate, reset,
    maxAmount, setMaxAmount, expiryMin, setExpiryMin,
    handleGenerate, handleSaveQR, handleCopy,
  }
}
