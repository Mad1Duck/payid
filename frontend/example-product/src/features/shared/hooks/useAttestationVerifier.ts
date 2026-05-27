import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { AttestationVerifierAbi } from '@/constants/contracts';
import { addresses } from '@/constants/contracts/addresses';

export function useAttestationVerifier() {
  const chainId = useChainId();
  const attestationVerifierAddress = addresses[chainId as keyof typeof addresses]?.AttestationVerifier as `0x${string}`;

  // Read contract state
  const { data: isInitialized } = useReadContract({
    address: attestationVerifierAddress,
    abi: AttestationVerifierAbi,
    functionName: 'isInitialized',
  });

  const { data: eas } = useReadContract({
    address: attestationVerifierAddress,
    abi: AttestationVerifierAbi,
    functionName: 'eas',
  });

  // Write contract
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Wait for transaction
  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Verify single attestation (read-only)
  const verifyAttestation = async (attestationUID: `0x${string}`, payer: `0x${string}`) => {
    try {
      const result = await useReadContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'verifyAttestation',
        args: [attestationUID, payer],
      });
      return result;
    } catch (err: any) {
      console.error('Attestation verification failed:', err);
      throw err;
    }
  };

  // Verify batch attestations (read-only)
  const verifyAttestationBatch = async (attestationUIDs: `0x${string}`[], payer: `0x${string}`) => {
    try {
      const result = await useReadContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'verifyAttestationBatch',
        args: [attestationUIDs, payer],
      });
      return result;
    } catch (err: any) {
      console.error('Batch attestation verification failed:', err);
      throw err;
    }
  };

  // Check if attestation is valid (read-only)
  const hasValidAttestation = async (attestationUID: `0x${string}`, payer: `0x${string}`) => {
    try {
      const result = await useReadContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'hasValidAttestation',
        args: [attestationUID, payer],
      });
      return result;
    } catch (err: any) {
      console.error('Valid attestation check failed:', err);
      return false;
    }
  };

  // Verify single attestation and mark as used (write, anti-replay)
  const verifyAttestationOnce = async (attestationUID: `0x${string}`, payer: `0x${string}`) => {
    try {
      writeContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'verifyAttestationOnce',
        args: [attestationUID, payer],
      });
      toast.info('Verifying attestation...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify attestation');
      throw err;
    }
  };

  // Verify batch attestations and mark all as used (write, anti-replay)
  const verifyAttestationBatchOnce = async (attestationUIDs: `0x${string}`[], payer: `0x${string}`) => {
    try {
      writeContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'verifyAttestationBatchOnce',
        args: [attestationUIDs, payer],
      });
      toast.info('Verifying batch attestations...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify batch attestations');
      throw err;
    }
  };

  // Check if schema is trusted
  const isTrustedSchema = async (schemaUID: `0x${string}`) => {
    try {
      const result = await useReadContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'trustedSchemas',
        args: [schemaUID],
      });
      return result;
    } catch (err: any) {
      console.error('Schema trust check failed:', err);
      return false;
    }
  };

  // Check if attester is trusted
  const isTrustedAttester = async (attester: `0x${string}`) => {
    try {
      const result = await useReadContract({
        address: attestationVerifierAddress,
        abi: AttestationVerifierAbi,
        functionName: 'trustedAttesters',
        args: [attester],
      });
      return result;
    } catch (err: any) {
      console.error('Attester trust check failed:', err);
      return false;
    }
  };

  return {
    // Contract address
    address: attestationVerifierAddress,
    isInitialized,
    eas,

    // Read functions
    verifyAttestation,
    verifyAttestationBatch,
    hasValidAttestation,
    isTrustedSchema,
    isTrustedAttester,

    // Write functions
    verifyAttestationOnce,
    verifyAttestationBatchOnce,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
