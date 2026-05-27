/**
 * usePayIDQR — hook untuk sisi RECEIVER/MERCHANT.
 *
 * Flow:
 *   1. Merchant memanggil generate() dengan constraint pembayaran mereka
 *      (asset, maxAmount, expiry, dll)
 *   2. Hook sign SessionPolicyV2 via wallet yang terhubung (EIP-712)
 *   3. Policy di-encode ke string "payid-v2:<base64url>" — ini QR payload-nya
 *   4. QR image di-render ke canvas/data URL via 'qrcode' (optional peer dep)
 *
 * Di sisi PAYER:
 *   - Scan QR → dapat string "payid-v2:..."
 *   - Decode via decodeSessionPolicyV2QR() dari 'payid/sessionPolicy'
 *   - Pass hasilnya ke usePayIDFlow sebagai sessionPolicyV2 param
 *
 * ─── Instalasi qrcode (optional) ────────────────────────────────────────────
 *   npm install qrcode
 *   npm install --save-dev @types/qrcode
 *
 * Kalau 'qrcode' tidak diinstall, hook tetap berfungsi — hanya
 * qrDataUrl akan null. Kalian bisa render sendiri dari payload string
 * menggunakan library QR apapun (react-qr-code, qrcode.react, dll).
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';
import {
  useAccount,
  useChainId,
  useConnectorClient,
} from 'wagmi';
import { BrowserProvider } from 'ethers';
import type { Address, Hash } from 'viem';

import { usePayIDContext } from '../PayIDProvider';

export type PayIDQRStatus =
  | 'idle'
  | 'signing'
  | 'encoding'
  | 'rendering'
  | 'ready'
  | 'error';

export interface PayIDQRParams {
  payId: string;
  allowedAsset: Address;
  maxAmount: bigint;
  expiresAt: number;
  ruleSetHash?: Hash;
  ruleAuthorityAddress?: Address;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  size?: number;
  darkColor?: string;
  lightColor?: string;
}

export interface PayIDQRResult {
  status: PayIDQRStatus;
  isPending: boolean;
  isReady: boolean;
  error: string | null;
  payload: string | null;
  qrDataUrl: string | null;
  policy: object | null;
  generate: (params: PayIDQRParams) => Promise<void>;
  reset: () => void;
}

async function tryLoadQRCode(): Promise<{
  toDataURL: (text: string, opts: object) => Promise<string>;
} | null> {
  try {
    const mod = await import('qrcode');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function usePayIDQR(): PayIDQRResult {
  const { address: receiver } = useAccount();
  const chainId = useChainId();
  const { contracts } = usePayIDContext();
  const { data: connectorClient } = useConnectorClient();

  const [status, setStatus] = useState<PayIDQRStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [policy, setPolicy] = useState<object | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setPayload(null);
    setQrDataUrl(null);
    setPolicy(null);
  }, []);

  const generate = useCallback(async (params: PayIDQRParams) => {
    if (!receiver) {
      setError('Wallet tidak terhubung. Hubungkan wallet receiver terlebih dahulu.');
      setStatus('error');
      return;
    }

    if (!connectorClient) {
      setError('Wallet connector tidak siap. Coba reconnect wallet.');
      setStatus('error');
      return;
    }

    if (params.expiresAt <= Math.floor(Date.now() / 1000)) {
      setError('expiresAt sudah lewat. Gunakan waktu di masa depan.');
      setStatus('error');
      return;
    }

    if (params.maxAmount <= 0n) {
      setError('maxAmount harus lebih dari 0.');
      setStatus('error');
      return;
    }

    try {
      reset();

      setStatus('signing');

      const provider = new BrowserProvider(connectorClient.transport as any);
      const signer = await provider.getSigner();

      const ruleAuthority = params.ruleAuthorityAddress ?? contracts.combinedRuleStorage;
      const ruleSetHash = params.ruleSetHash ?? ZERO_BYTES32;

      const { createSessionPolicyV2 } = await import('payid/sessionPolicy');

      const signedPolicy = await createSessionPolicyV2({
        receiver,
        ruleSetHash,
        ruleAuthority,
        allowedAsset: params.allowedAsset,
        maxAmount: params.maxAmount,
        expiresAt: params.expiresAt,
        payId: params.payId,
        chainId,
        verifyingContract: contracts.payIDVerifier,
        signer,
      });

      setPolicy(signedPolicy);

      setStatus('encoding');

      const { encodeSessionPolicyV2QR } = await import('payid/sessionPolicy');
      const qrPayload = encodeSessionPolicyV2QR(signedPolicy);

      setPayload(qrPayload);

      setStatus('rendering');

      const qrLib = await tryLoadQRCode();

      if (qrLib) {
        try {
          const dataUrl = await qrLib.toDataURL(qrPayload, {
            errorCorrectionLevel: params.errorCorrectionLevel ?? 'M',
            width: params.size ?? 256,
            color: {
              dark: params.darkColor ?? '#000000',
              light: params.lightColor ?? '#ffffff',
            },
          });
          setQrDataUrl(dataUrl);
        } catch {
          setQrDataUrl(null);
        }
      } else {
        setQrDataUrl(null);
      }

      setStatus('ready');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.toLowerCase().includes('user rejected')
          ? 'Signing ditolak oleh user'
          : msg,
      );
      setStatus('error');
    }
  }, [receiver, chainId, contracts, connectorClient, reset]);

  return {
    status,
    isPending: ['signing', 'encoding', 'rendering'].includes(status),
    isReady: status === 'ready',
    error,
    payload,
    qrDataUrl,
    policy,
    generate,
    reset,
  };
}