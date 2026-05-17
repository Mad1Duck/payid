import { useState, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { usePayIDFlow } from 'payid-react';
import { useV4Palette } from '@/components/v4/theme';
import { decodeSessionPolicyV2QR, decodeSessionPolicyV2 } from 'payid/sessionPolicy';
import type { SessionPolicyV2 } from 'payid/sessionPolicy';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'sonner';

export type CheckoutStatus =
  | 'idle'
  | 'loading'
  | 'invalid-payload'
  | 'ready'
  | 'evaluating'
  | 'allowed'
  | 'denied'
  | 'paying'
  | 'success'
  | 'error';

export function useCheckout() {
  const p = useV4Palette();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<CheckoutStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [policy, setPolicy] = useState<SessionPolicyV2 | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSignatureValid, setIsSignatureValid] = useState(false);

  // Payment inputs
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  // PayID Flow integration
  const flow = usePayIDFlow();

  // Load and decode policy from URL search param
  useEffect(() => {
    const parsePayload = async () => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const payloadParam = params.get('payload');

      if (!payloadParam) {
        setErrorMsg('Payment link is incomplete. The "payload" parameter was not found.');
        setStatus('invalid-payload');
        return;
      }

      try {
        // 1. Decode base64url payload
        const decoded = decodeSessionPolicyV2QR(payloadParam);
        setPolicy(decoded);

        // 2. Check if chain matches
        if (decoded.chainId !== chainId) {
          setErrorMsg(`Network mismatch. This policy was created for Chain #${decoded.chainId}, but your wallet is connected to Chain #${chainId}.`);
          setStatus('invalid-payload');
          return;
        }

        // Get latest block timestamp to check expiry in sync with chain
        let blockTimestamp = Math.floor(Date.now() / 1000);
        if (publicClient) {
          try {
            const block = await publicClient.getBlock({ blockTag: 'latest' });
            blockTimestamp = Number(block.timestamp);
          } catch (e) {
            console.warn('Failed to retrieve block timestamp, using local time.', e);
          }
        }

        // 3. Verify expiry
        if (blockTimestamp >= decoded.expiresAt) {
          setIsExpired(true);
        }

        // 4. Verify EIP-712 signature
        try {
          decodeSessionPolicyV2(decoded, blockTimestamp);
          setIsSignatureValid(true);
        } catch (e: any) {
          if (e?.message === 'SESSION_POLICY_V2_EXPIRED') {
            setIsExpired(true);
          } else {
            setIsSignatureValid(false);
            console.error('EIP-712 signature verification failed:', e);
          }
        }

        // Pre-fill max amount as initial input
        const maxFormatted = formatUnits(BigInt(decoded.maxAmount), 18);
        setAmount(maxFormatted);

        setStatus('ready');
      } catch (err: any) {
        console.error('Failed to decode payload:', err);
        setErrorMsg(err?.message || 'QR or payment link format is corrupt or invalid.');
        setStatus('invalid-payload');
      }
    };

    parsePayload();
  }, [chainId, publicClient]);

  // Sync state with payid-react flow hook status
  useEffect(() => {
    if (flow.status === 'success') {
      setStatus('success');
      toast.success('Payment Successful! Transaction confirmed on-chain.');
    } else if (flow.status === 'error') {
      setStatus('error');
      setErrorMsg(flow.error);
    } else if (flow.status === 'denied') {
      setStatus('denied');
      setErrorMsg(flow.denyReason);
    } else if (
      ['fetching-rule', 'proving', 'approving', 'awaiting-wallet', 'confirming'].includes(flow.status)
    ) {
      setStatus('paying');
    }
  }, [flow.status, flow.error, flow.denyReason]);

  // Handle amount change and validation
  const handleAmountChange = (val: string) => {
    setAmount(val);
    setAmountError(null);

    if (!policy) return;

    if (!val || parseFloat(val) <= 0) {
      setAmountError('Amount must be greater than 0.');
      return;
    }

    try {
      const parsed = parseUnits(val, 18);
      const maxAllowed = BigInt(policy.maxAmount);
      if (parsed > maxAllowed) {
        setAmountError(`Amount exceeds the policy maximum limit (${formatUnits(maxAllowed, 18)} ETH).`);
      }
    } catch {
      setAmountError('Invalid number format.');
    }
  };

  // Run on-chain guardrails evaluation
  const handleEvaluate = async () => {
    if (!policy || !address || amountError) return;

    try {
      setStatus('evaluating');
      const parsedAmount = parseUnits(amount, 18);

      // We call the flow to evaluate rules (this will fetch on-chain rules and evaluate them)
      await flow.execute({
        receiver: policy.receiver as `0x${string}`,
        asset: policy.allowedAsset as `0x${string}`,
        amount: parsedAmount,
        payId: policy.payId,
        ruleAuthorityAddress: policy.ruleAuthority as `0x${string}`,
      });
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message || 'Policy evaluation failed.');
    }
  };

  // Confirm and submit checkout transaction
  const handleConfirmPay = async () => {
    if (!policy || !address || amountError) return;

    try {
      const parsedAmount = parseUnits(amount, 18);
      
      toast.info('Initiating payment... Please confirm the policy signature in MetaMask.');

      // Execute payid-react on-chain flow
      await flow.execute({
        receiver: policy.receiver as `0x${string}`,
        asset: policy.allowedAsset as `0x${string}`,
        amount: parsedAmount,
        payId: policy.payId,
        ruleAuthorityAddress: policy.ruleAuthority as `0x${string}`,
      });
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message || 'Payment submission failed.');
    }
  };

  return {
    p,
    address,
    isConnected,
    status,
    errorMsg,
    policy,
    isExpired,
    isSignatureValid,
    amount,
    amountError,
    handleAmountChange,
    handleEvaluate,
    handleConfirmPay,
    flow,
    reset: () => {
      flow.reset();
      setStatus('ready');
      setErrorMsg(null);
      if (policy) {
        const maxFormatted = formatUnits(BigInt(policy.maxAmount), 18);
        setAmount(maxFormatted);
      }
    },
  };
}
