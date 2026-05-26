import { useState, useCallback, useEffect } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { usePayIDQR } from 'payid-react';
import { useV4Palette } from '@/components/v4/theme';
import { shortAddr } from '@/features/shared';
import { toast } from 'sonner';
import { decodeSessionPolicyV2QR } from 'payid/sessionPolicy';

export function useReceivePage() {
  const p = useV4Palette();
  const { address, isConnected } = useAccount();
  const payId = isConnected && address ? `${address}@pay.id` : 'connect@pay.id';
  const displayPayId = isConnected && address ? `${shortAddr(address)}@pay.id` : 'connect@pay.id';
  const walletAddress = address ?? '';

  // Independent copied states
  const [copiedPayId, setCopiedPayId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const [showAddress, setShowAddress] = useState(false);

  const { status, payload, qrDataUrl, error: qrError, generate, reset } = usePayIDQR();

  // Persisted state
  const [localPayload, setLocalPayload] = useState<string | null>(null);
  const [localQrDataUrl, setLocalQrDataUrl] = useState<string | null>(null);
  const [localExpiresAt, setLocalExpiresAt] = useState<number | null>(null);

  const [maxAmount, setMaxAmount] = useState('');
  const [expiryMin, setExpiryMin] = useState('60');

  // Hydrate persisted session on mount or wallet change
  useEffect(() => {
    // Clear hook's internal state on address switch/disconnect to avoid leakage
    reset();

    if (!address) {
      setLocalPayload(null);
      setLocalQrDataUrl(null);
      setLocalExpiresAt(null);
      return;
    }
    const stored = localStorage.getItem(`payid_rx_${address}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Math.floor(Date.now() / 1000);
        if (parsed.expiresAt > now) {
          setLocalPayload(parsed.payload);
          setLocalQrDataUrl(parsed.qrDataUrl || null);
          setLocalExpiresAt(parsed.expiresAt);
        } else {
          localStorage.removeItem(`payid_rx_${address}`);
          setLocalPayload(null);
          setLocalQrDataUrl(null);
          setLocalExpiresAt(null);
        }
      } catch (e) {
        console.error('Failed to parse persisted session:', e);
        setLocalPayload(null);
        setLocalQrDataUrl(null);
        setLocalExpiresAt(null);
      }
    } else {
      setLocalPayload(null);
      setLocalQrDataUrl(null);
      setLocalExpiresAt(null);
    }
  }, [address, reset]);

  // Save generated session to localStorage
  useEffect(() => {
    if (payload && address) {
      let expiresAt = Math.floor(Date.now() / 1000) + (Number(expiryMin) || 60) * 60;
      try {
        const decoded = decodeSessionPolicyV2QR(payload);
        if (decoded && decoded.expiresAt) {
          expiresAt = Number(decoded.expiresAt);
        }
      } catch (e) {
        console.error('Failed to decode expiresAt from payload:', e);
      }

      setLocalPayload(payload);
      setLocalQrDataUrl(qrDataUrl || null);
      setLocalExpiresAt(expiresAt);

      localStorage.setItem(`payid_rx_${address}`, JSON.stringify({
        payload,
        qrDataUrl: qrDataUrl || null,
        expiresAt,
      }));
    }
  }, [payload, qrDataUrl, address, expiryMin]);

  const handleGenerate = () => {
    if (!address) return;
    const expiresAt = Math.floor(Date.now() / 1000) + (Number(expiryMin) || 60) * 60;
    const parsedMax = maxAmount && parseFloat(maxAmount) > 0
      ? parseUnits(maxAmount, 18)
      : BigInt('1000000000000000000000000');
    generate({
      payId,
      allowedAsset: '0x0000000000000000000000000000000000000000',
      maxAmount: parsedMax,
      expiresAt,
      ruleSetHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });
  };

  const handleSaveQR = () => {
    const dataUrl = localQrDataUrl || qrDataUrl;
    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'payid-qr.png';
      a.click();
      toast.success('QR Code saved successfully!');
    } else if (localPayload) {
      window.open(
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(localPayload)}&format=png`,
        '_blank'
      );
      toast.info('QR Code payload opened in new tab.');
    }
  };

  const handleCopyPayId = useCallback(() => {
    const activePayload = localPayload || payload;
    const shareUrl = activePayload
      ? `${window.location.origin}/v4/app/checkout?payload=${encodeURIComponent(activePayload)}`
      : `${window.location.origin}/v4/app/send?to=${encodeURIComponent(payId)}`;

    navigator.clipboard.writeText(shareUrl);
    setCopiedPayId(true);
    toast.success(activePayload ? 'Checkout link copied to clipboard!' : 'Payment link copied to clipboard!');
    setTimeout(() => setCopiedPayId(false), 2000);
  }, [payId, payload, localPayload]);

  const handleCopyWallet = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopiedWallet(true);
    toast.success('Wallet Address copied to clipboard!');
    setTimeout(() => setCopiedWallet(false), 2000);
  }, [walletAddress]);

  const handleShare = useCallback(() => {
    const activePayload = localPayload || payload;
    const shareUrl = activePayload
      ? `${window.location.origin}/v4/app/checkout?payload=${encodeURIComponent(activePayload)}`
      : `${window.location.origin}/v4/app/send?to=${encodeURIComponent(payId)}`;
    const shareText = activePayload
      ? `Open this link to pay me via PAY.ID Invoice: ${displayPayId}`
      : `Scan or click this link to pay me via PAY.ID: ${displayPayId}`;

    if (navigator.share) {
      navigator.share({
        title: 'PAY.ID Payment Link',
        text: shareText,
        url: shareUrl,
      })
        .then(() => toast.success('Shared successfully!'))
        .catch(() => { });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(activePayload ? 'Direct checkout link copied to clipboard!' : 'Direct payment link copied to clipboard!');
    }
  }, [payId, displayPayId, payload, localPayload]);

  const handleReset = useCallback(() => {
    reset();
    setLocalPayload(null);
    setLocalQrDataUrl(null);
    setLocalExpiresAt(null);
    if (address) {
      localStorage.removeItem(`payid_rx_${address}`);
    }
  }, [reset, address]);

  return {
    p, address, isConnected, payId, displayPayId, walletAddress,
    copiedPayId, copiedWallet,
    showAddress, setShowAddress,
    status,
    payload: localPayload || payload,
    qrDataUrl: localQrDataUrl || qrDataUrl,
    qrError,
    expiresAt: localExpiresAt,
    maxAmount, setMaxAmount, expiryMin, setExpiryMin,
    handleGenerate, handleSaveQR, handleShare, reset: handleReset,
    handleCopyPayId, handleCopyWallet,
  };
}
