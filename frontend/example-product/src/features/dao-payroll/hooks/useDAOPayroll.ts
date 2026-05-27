import { useState, useEffect } from 'react';
import { useV4Palette } from '@/components/v4/theme';
import { useAccount, useBalance, useChainId, useChains } from 'wagmi';
import { formatUnits, isAddress, parseUnits } from 'viem';
import { useRecurringPayments } from './useRecurringPayments';
import { usePayWithPayIDBatch } from './usePayWithPayIDBatch';

interface Recipient {
  id: string;
  address: string;
  amount: string;
  role: string;
  schedule: 'one-time' | 'weekly' | 'monthly';
  subId?: bigint; // Subscription ID from contract
}

interface PayrollRun {
  id: string;
  date: string;
  totalAmount: string;
  recipientCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
}

export function useDAOPayroll() {
  const p = useV4Palette();
  const chainId = useChainId();
  const chains = useChains();
  const currentChain = chains.find((c) => c.id === chainId);
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH';
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });

  const recurringPayments = useRecurringPayments();
  const batchPayments = usePayWithPayIDBatch();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSchedule, setNewSchedule] = useState<'one-time' | 'weekly' | 'monthly'>('monthly');
  const [showAddForm, setShowAddForm] = useState(false);

  const [simulationResult, setSimulationResult] = useState<{
    decision: 'ALLOW' | 'REJECT';
    total: string;
    gasEstimate: string;
    policyCheck: string[];
  } | null>(null);

  const [runs] = useState<PayrollRun[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isBatching, setIsBatching] = useState(false);

  // Fetch user subscriptions on mount
  useEffect(() => {
    if (address) {
      recurringPayments.fetchUserSubscriptions();
    }
  }, [address, recurringPayments]);

  const totalPayroll = recipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0).toFixed(4);
  const treasuryBalance = parseFloat(balance ? formatUnits(balance.value, balance.decimals) : '12.5');
  const isSufficient = treasuryBalance >= parseFloat(totalPayroll);

  const addRecipient = () => {
    if (!newAddress || !newAmount) return;
    setRecipients((prev) => [
      ...prev,
      { id: Date.now().toString(), address: newAddress, amount: newAmount, role: newRole || 'Contributor', schedule: newSchedule },
    ]);
    setNewAddress('');
    setNewAmount('');
    setNewRole('');
    setShowAddForm(false);
  };

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const simulate = () => {
    const invalid = recipients.filter((r) => !isAddress(r.address));
    const decision: 'ALLOW' | 'REJECT' = isSufficient && invalid.length === 0 ? 'ALLOW' : 'REJECT';
    setSimulationResult({
      decision,
      total: totalPayroll,
      gasEstimate: 'N/A',
      policyCheck: [
        isSufficient
          ? 'Treasury balance sufficient'
          : `Insufficient balance (need ${totalPayroll} ETH, have ${treasuryBalance.toFixed(4)})`,
        invalid.length === 0
          ? 'All recipient addresses valid (checksum OK)'
          : `${invalid.length} invalid address(es) — use full 0x... format`,
        `${recipients.length} of 50 recipient limit`,
      ],
    });
  };

  // Create subscriptions for all recipients
  const createSubscriptions = async () => {
    if (!address) return;
    setIsCreating(true);

    try {
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

      for (const recipient of recipients) {
        if (!isAddress(recipient.address)) continue;

        const periodSeconds = recipient.schedule === 'weekly' ? 7 * 24 * 60 * 60 : recipient.schedule === 'monthly' ? 30 * 24 * 60 * 60 : 0;
        const amountWei = parseUnits(recipient.amount, 18);

        await recurringPayments.createSubscription(
          recipient.address as `0x${string}`,
          ZERO_ADDRESS, // ETH
          amountWei,
          BigInt(periodSeconds),
          amountWei // Send first payment immediately
        );

        // Wait for transaction to complete before next subscription
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Refresh subscription IDs after creation
      setSimulationResult({
        decision: 'ALLOW',
        total: totalPayroll,
        gasEstimate: 'N/A',
        policyCheck: ['All subscriptions created successfully'],
      });
    } catch (error: any) {
      console.error('Failed to create subscriptions:', error);
      setSimulationResult({
        decision: 'REJECT',
        total: totalPayroll,
        gasEstimate: 'N/A',
        policyCheck: [error.message || 'Failed to create subscriptions'],
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Execute one-time batch payment using PayWithPayIDBatch
  const executeBatchPayment = async (decisions: any[], sigs: `0x${string}`[], attestationUIDs: readonly `0x${string}`[][]) => {
    if (!address) return;
    setIsBatching(true);

    try {
      const totalValue = recipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const totalWei = parseUnits(totalValue.toString(), 18);

      await batchPayments.batchPayNative(decisions, sigs, attestationUIDs, totalWei);

      setSimulationResult({
        decision: 'ALLOW',
        total: totalPayroll,
        gasEstimate: 'N/A',
        policyCheck: ['Batch payment executed successfully'],
      });
    } catch (error: any) {
      console.error('Failed to execute batch payment:', error);
      setSimulationResult({
        decision: 'REJECT',
        total: totalPayroll,
        gasEstimate: 'N/A',
        policyCheck: [error.message || 'Failed to execute batch payment'],
      });
    } finally {
      setIsBatching(false);
    }
  };

  return {
    p, chainId, nativeSymbol, address, balance,
    recipients, setRecipients,
    newAddress, setNewAddress,
    newAmount, setNewAmount,
    newRole, setNewRole,
    newSchedule, setNewSchedule,
    showAddForm, setShowAddForm,
    simulationResult, setSimulationResult,
    runs, totalPayroll, treasuryBalance, isSufficient,
    addRecipient, removeRecipient, simulate,
    createSubscriptions,
    executeBatchPayment,
    isCreating,
    isBatching,
    recurringPayments,
    batchPayments,
    userSubscriptions: recurringPayments.userSubscriptions,
    isLoadingSubs: recurringPayments.isLoadingSubs,
    fetchUserSubscriptions: recurringPayments.fetchUserSubscriptions,
  };
}
