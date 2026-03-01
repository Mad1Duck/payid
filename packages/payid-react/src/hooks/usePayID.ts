import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { usePayIDContext } from '../PayIDProvider';
import PayIDVerifierABI from '../abis/PayIDModule#PayIDVerifier.json';
import PayWithPayIDABI from '../abis/PayIDModule#PayWithPayID.json';

// Types
interface Decision {
  version: `0x${string}`;
  payId: `0x${string}`;
  payer: `0x${string}`;
  receiver: `0x${string}`;
  asset: `0x${string}`;
  amount: bigint;
  contextHash: `0x${string}`;
  ruleSetHash: `0x${string}`;
  ruleAuthority: `0x${string}`;
  issuedAt: bigint;
  expiresAt: bigint;
  nonce: `0x${string}`;
  requiresAttestation: boolean;
}

// useVerifyDecision
/**
 * Verify EIP-712 decision proof (view only)
 *
 * ```tsx
 * const { data: isValid } = useVerifyDecision(decision, signature)
 * ```
 */
export function useVerifyDecision(
  decision: Decision | undefined,
  signature: `0x${string}` | undefined
) {
  const { contracts } = usePayIDContext();

  return useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierABI.abi,
    functionName: 'verifyDecision',
    args: decision && signature ? [decision, signature] : undefined,
    query: { enabled: !!decision && !!signature },
  });
}

// useNonceUsed 
/**
 * Cek apakah nonce sudah dipakai (replay protection)
 */
export function useNonceUsed(
  payer: `0x${string}` | undefined,
  nonce: `0x${string}` | undefined
) {
  const { contracts } = usePayIDContext();

  return useReadContract({
    address: contracts.payIDVerifier,
    abi: PayIDVerifierABI.abi,
    functionName: 'usedNonce',
    args: payer && nonce ? [payer, nonce] : undefined,
    query: { enabled: !!payer && !!nonce },
  });
}

// usePayETH 
/**
 * Pay with ETH via PAY.ID
 *
 * ```tsx
 * const { pay, isPending, isSuccess } = usePayETH()
 *
 * await pay({ decision, signature, attestationUIDs: [] })
 * ```
 */
export function usePayETH() {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pay = (params: {
    decision: Decision;
    signature: `0x${string}`;
    attestationUIDs?: `0x${string}`[];
  }) => {
    writeContract({
      address: contracts.payWithPayID,
      abi: PayWithPayIDABI.abi,
      functionName: 'payETH',
      args: [params.decision, params.signature, params.attestationUIDs ?? []],
      value: params.decision.amount,
    });
  };

  return { pay, hash, isPending, isConfirming, isSuccess, error };
}

// usePayERC20
/**
 * Pay with ERC20 via PAY.ID
 *
 * ```tsx
 * const { pay, isPending, isSuccess } = usePayERC20()
 *
 * // Pastikan approve dulu sebelum pay
 * await pay({ decision, signature, attestationUIDs: [] })
 * ```
 */
export function usePayERC20() {
  const { contracts } = usePayIDContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pay = (params: {
    decision: Decision;
    signature: `0x${string}`;
    attestationUIDs?: `0x${string}`[];
  }) => {
    writeContract({
      address: contracts.payWithPayID,
      abi: PayWithPayIDABI.abi,
      functionName: 'payERC20',
      args: [params.decision, params.signature, params.attestationUIDs ?? []],
    });
  };

  return { pay, hash, isPending, isConfirming, isSuccess, error };
}
