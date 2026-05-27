import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from 'wagmi';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { RecurringPaymentsAbi } from '@/constants/contracts';
import { addresses } from '@/constants/contracts/addresses';
import { useCallback, useState } from 'react';

export interface Subscription {
  payer: string;
  receiver: string;
  asset: string;
  maxAmount: bigint;
  period: bigint;
  nextCharge: bigint;
  totalCharged: bigint;
  numCharges: bigint;
  active: boolean;
}

export function useRecurringPayments() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const recurringPaymentsAddress = addresses[chainId as keyof typeof addresses]?.RecurringPayments as `0x${string}`;

  // Read subscription by ID
  const { data: subscription, refetch: refetchSubscription } = useReadContract({
    address: recurringPaymentsAddress,
    abi: RecurringPaymentsAbi,
    functionName: 'subscriptions',
    args: undefined as any, // Will be set when called
    query: {
      enabled: false, // Only enable when subId is provided
    },
  });

  // Read next subscription ID
  const { data: nextSubId, refetch: refetchNextSubId } = useReadContract({
    address: recurringPaymentsAddress,
    abi: RecurringPaymentsAbi,
    functionName: 'nextSubId',
  });

  // State for user's subscriptions
  const [userSubscriptions, setUserSubscriptions] = useState<Array<{ subId: bigint; sub: Subscription; }>>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  // Write contract
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Wait for transaction
  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Create subscription
  const createSubscription = async (
    receiver: `0x${string}`,
    asset: `0x${string}`,
    maxAmount: bigint,
    period: bigint,
    value?: bigint
  ) => {
    try {
      writeContract({
        address: recurringPaymentsAddress,
        abi: RecurringPaymentsAbi,
        functionName: 'createSubscription',
        args: [receiver, asset, maxAmount, period],
        value,
      });
      toast.info('Creating subscription...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create subscription');
      throw err;
    }
  };

  // Charge subscription
  const charge = async (
    subId: bigint,
    decision: any,
    sig: `0x${string}`,
    attestationUIDs: readonly `0x${string}`[]
  ) => {
    try {
      writeContract({
        address: recurringPaymentsAddress,
        abi: RecurringPaymentsAbi,
        functionName: 'charge',
        args: [subId, decision, sig, attestationUIDs],
      });
      toast.info('Processing charge...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process charge');
      throw err;
    }
  };

  // Cancel subscription
  const cancel = async (subId: bigint) => {
    try {
      writeContract({
        address: recurringPaymentsAddress,
        abi: RecurringPaymentsAbi,
        functionName: 'cancel',
        args: [subId],
      });
      toast.info('Cancelling subscription...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel subscription');
      throw err;
    }
  };

  // Get subscription by ID
  const getSubscription = (subId: bigint) => {
    return useReadContract({
      address: recurringPaymentsAddress,
      abi: RecurringPaymentsAbi,
      functionName: 'subscriptions',
      args: [subId],
    });
  };

  // Fetch all subscriptions for the current user (as payer)
  const fetchUserSubscriptions = useCallback(async () => {
    if (!address || !publicClient) return;

    setIsLoadingSubs(true);
    try {
      const currentNextSubId = await publicClient.readContract({
        address: recurringPaymentsAddress,
        abi: RecurringPaymentsAbi,
        functionName: 'nextSubId',
      }) as bigint;

      const subs: Array<{ subId: bigint; sub: Subscription; }> = [];

      // Iterate through all possible subscription IDs
      for (let i = 0n; i < currentNextSubId; i++) {
        try {
          const subData = await publicClient.readContract({
            address: recurringPaymentsAddress,
            abi: RecurringPaymentsAbi,
            functionName: 'subscriptions',
            args: [i],
          }) as readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, boolean];

          // Map tuple to Subscription interface
          const sub: Subscription = {
            payer: subData[0],
            receiver: subData[1],
            asset: subData[2],
            maxAmount: subData[3],
            period: subData[4],
            nextCharge: subData[5],
            totalCharged: subData[6],
            numCharges: subData[7],
            active: subData[8],
          };

          // Only include if this user is the payer and subscription is active
          if (sub.payer.toLowerCase() === address.toLowerCase() && sub.active) {
            subs.push({ subId: i, sub });
          }
        } catch (e) {
          // Skip invalid subscription IDs
          continue;
        }
      }

      setUserSubscriptions(subs);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setIsLoadingSubs(false);
    }
  }, [address, publicClient, recurringPaymentsAddress]);

  // Simplified charge for manual use (without decision proof - for testing only)
  // Note: This will fail in production as charge() requires valid decision proof
  const chargeSimple = async (subId: bigint) => {
    toast.error('Manual charge requires DecisionProof. Integrate SDK to generate proof.');
  };

  return {
    // Contract address
    address: recurringPaymentsAddress,

    // Read functions
    nextSubId,
    subscription,
    getSubscription,
    userSubscriptions,
    isLoadingSubs,
    fetchUserSubscriptions,

    // Write functions
    createSubscription,
    charge,
    chargeSimple,
    cancel,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,

    // Refetch helpers
    refetchSubscription,
    refetchNextSubId,
  };
}
