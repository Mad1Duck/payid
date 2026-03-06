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

/**
 * Parameter yang diisi receiver saat generate QR.
 */
export interface PayIDQRParams {
  /** PAY.ID identifier milik receiver, contoh: "pay.id/toko-budi" */
  payId: string;

  /**
   * Token yang diterima. ZeroAddress = ETH native.
   * @example "0x0000000000000000000000000000000000000000"  // ETH
   * @example "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  // USDC mainnet
   */
  allowedAsset: Address;

  /**
   * Batas maksimum amount per transaksi (dalam satuan terkecil token).
   * Payer tidak bisa melebihi nilai ini.
   * @example 1000000n  // 1 USDC (6 desimal)
   * @example 10000000000000000n  // 0.01 ETH (18 desimal)
   */
  maxAmount: bigint;

  /**
   * Unix timestamp kapan QR kedaluwarsa.
   * Setelah expired, payer tidak bisa pakai QR ini.
   * @example Math.floor(Date.now() / 1000) + 3600  // 1 jam dari sekarang
   */
  expiresAt: number;

  /**
   * ruleSetHash dari CombinedRuleStorage — bind ke rule on-chain milik receiver.
   * Kalau tidak diisi, payer bisa pakai rule apapun (lebih longgar).
   */
  ruleSetHash?: Hash;

  /**
   * Address CombinedRuleStorage yang menyimpan rule receiver.
   * Default: contracts.combinedRuleStorage dari PayIDProvider.
   */
  ruleAuthorityAddress?: Address;

  /**
   * Error correction level untuk QR image.
   * - 'L' = 7%  — cocok untuk QR kecil, rentan rusak
   * - 'M' = 15% — default, balance antara ukuran dan ketahanan
   * - 'Q' = 25% — lebih tahan rusak
   * - 'H' = 30% — paling tahan, ukuran QR lebih besar
   * @default 'M'
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  /**
   * Ukuran QR image dalam pixel (width = height).
   * @default 256
   */
  size?: number;

  /**
   * Warna modul QR (kotak hitam).
   * @default '#000000'
   */
  darkColor?: string;

  /**
   * Warna background QR.
   * @default '#ffffff'
   */
  lightColor?: string;
}

export interface PayIDQRResult {
  /** Status saat ini dari proses generate */
  status: PayIDQRStatus;

  /** true saat signing/encoding/rendering sedang berjalan */
  isPending: boolean;

  /** true saat QR sudah siap */
  isReady: boolean;

  /** Pesan error jika status === 'error' */
  error: string | null;

  /**
   * String payload QR dalam format "payid-v2:<base64url(JSON)>".
   * Tersedia saat status === 'ready'.
   *
   * Bisa dipakai langsung sebagai input ke library QR apapun:
   * @example
   * import QRCode from 'react-qr-code'
   * <QRCode value={payload} />
   */
  payload: string | null;

  /**
   * QR image sebagai data URL ("data:image/png;base64,...").
   * Hanya tersedia kalau package 'qrcode' sudah diinstall.
   * Null jika 'qrcode' tidak ada atau rendering gagal.
   *
   * @example
   * <img src={qrDataUrl} alt="Scan untuk bayar" />
   */
  qrDataUrl: string | null;

  /**
   * SessionPolicyV2 yang sudah disign — tersedia saat status === 'ready'.
   * Bisa di-serialize ke JSON untuk disimpan/dikirim ke server.
   */
  policy: object | null;

  /**
   * Generate QR baru. Memanggil ulang akan mengganti QR sebelumnya.
   * Membutuhkan wallet terhubung (receiver harus sign policy).
   */
  generate: (params: PayIDQRParams) => Promise<void>;

  /** Reset ke state idle, hapus QR yang ada */
  reset: () => void;
}

/**
 * Coba load 'qrcode' package secara dynamic (optional peer dependency).
 * Return null jika tidak terinstall — bukan error fatal.
 */
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

      const provider = new BrowserProvider(connectorClient.transport as Parameters<typeof BrowserProvider>[0]);
      const signer = await provider.getSigner();

      const ruleAuthority = params.ruleAuthorityAddress ?? contracts.combinedRuleStorage;
      const ruleSetHash = params.ruleSetHash ?? ZERO_ADDRESS;

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