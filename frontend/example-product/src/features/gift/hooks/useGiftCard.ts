import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId, useConnectorClient, useBalance } from 'wagmi';
import { usePayIDContext } from 'payid-react';
import { useV4Palette } from '@/components/v4/theme';
import { toast } from 'sonner';
import { BrowserProvider, Contract, formatUnits } from 'ethers';

export interface GiftCardData {
  id: string;
  mode: 'gift' | 'request';
  type: 'public' | 'targeted';
  amount: string;
  asset: string;
  receiver: string; // Friend address (empty for public)
  expiryMinutes: string;
  expiresAt: number;
  theme: 'gold' | 'purple' | 'cyber';
  payload: string;
  senderAddress: string;
}

export function useGiftCard() {
  const p = useV4Palette();
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { contracts } = usePayIDContext();
  const { data: connectorClient } = useConnectorClient();

  const [mode, setMode] = useState<'gift' | 'request'>('gift');
  const [type, setType] = useState<'public' | 'targeted'>('targeted');
  const [amount, setAmount] = useState('0.01');
  const [erc20Address, setErc20Address] = useState('');
  const [receiver, setReceiver] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('60');
  const [theme, setTheme] = useState<'gold' | 'purple' | 'cyber'>('gold');

  const [isLoading, setIsLoading] = useState(false);
  const [generatedGift, setGeneratedGift] = useState<GiftCardData | null>(null);

  // Fetch balance using wagmi
  const { data: balance } = useBalance({ address });

  // Calculate remaining balance dynamically
  const balanceValue = balance?.value ?? 0n;
  let parsedAmount = 0n;
  try {
    if (amount && !isNaN(Number(amount)) && parseFloat(amount) > 0) {
      parsedAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));
    }
  } catch (e) { }
  const remainingValue = balanceValue > parsedAmount ? balanceValue - parsedAmount : 0n;

  const balanceFormatted = balance ? parseFloat(formatUnits(balanceValue, 18)).toFixed(4) : '0.0000';
  const remainingFormatted = balance ? parseFloat(formatUnits(remainingValue, 18)).toFixed(4) : '0.0000';

  // Load generated gifts from localStorage
  useEffect(() => {
    if (!address) {
      setGeneratedGift(null);
      return;
    }
    const stored = localStorage.getItem(`payid_gift_${address}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GiftCardData;
        const now = Math.floor(Date.now() / 1000);
        if (parsed.expiresAt > now) {
          setGeneratedGift(parsed);
        } else {
          localStorage.removeItem(`payid_gift_${address}`);
          setGeneratedGift(null);
        }
      } catch (e) {
        console.error('Failed to parse persisted gift card:', e);
        setGeneratedGift(null);
      }
    } else {
      setGeneratedGift(null);
    }
  }, [address]);

  const handleGenerate = useCallback(async () => {
    if (!address) {
      toast.error('Wallet not connected!');
      return;
    }
    if (!connectorClient) {
      toast.error('Wallet connection not ready. Reconnect wallet.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid gift amount.');
      return;
    }
    if (type === 'targeted' && (!receiver || receiver.length !== 42)) {
      toast.error('Please enter a valid 42-character recipient wallet address.');
      return;
    }
    if (mode === 'gift' && (!erc20Address || erc20Address.length !== 42)) {
      toast.error('Please enter a valid 42-character ERC20 token address for the gift.');
      return;
    }


    setIsLoading(true);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (Number(expiryMinutes) || 60) * 60;
      const parsedAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));

      const targetReceiver = type === 'targeted' ? receiver : address;
      const payId = `${address.slice(0, 6)}@gift.pay.id`;

      // Import generateDecisionProof and sessionPolicy utilities
      const { generateDecisionProof } = await import('payid/decision-proof');
      const { encodeSessionPolicyV2QR } = await import('payid/sessionPolicy');

      const provider = new BrowserProvider(connectorClient.transport as any);
      const signer = await provider.getSigner();

      // For ERC20 gifts, approve PayWithPayID to pull tokens from sender at claim time
      if (mode === 'gift') {
        const erc20 = new Contract(
          erc20Address,
          ['function approve(address spender, uint256 amount) returns (bool)'],
          signer,
        );
        toast.info('Step 1/2: Approving ERC20 spend...');
        const approveTx = await erc20.approve(contracts.payWithPayID, parsedAmount);
        await approveTx.wait();

        if (type === 'public') {
          // Public gift: receiver unknown — store unsigned params, sign per-claimer at request time
          const pendingData = {
            amount: parsedAmount.toString(),
            asset: erc20Address,
            sender: address,
            expiresAt,
            chainId,
            payId,
            verifyingContract: contracts.payIDVerifier,
          };
          const giftData: GiftCardData = {
            id: Math.random().toString(36).substring(7),
            mode,
            type,
            amount,
            asset: 'ERC20',
            receiver: '',
            expiryMinutes,
            expiresAt,
            theme,
            payload: `pending:${btoa(JSON.stringify(pendingData))}`,
            senderAddress: address,
          };
          setGeneratedGift(giftData);
          localStorage.setItem(`payid_gift_${address}`, JSON.stringify(giftData));
          toast.success('🎁 Public gift voucher ready! Share the link so anyone can request it.');
          return;
        }

        toast.success('Approval confirmed. Signing gift...');
      }

      const proof = await generateDecisionProof({
        payId,
        payer: address,
        receiver: targetReceiver,
        asset: mode === 'gift' ? erc20Address : '0x0000000000000000000000000000000000000000',
        amount: parsedAmount,
        context: {},
        ruleConfig: {},
        ruleSetHashOverride: '0x0000000000000000000000000000000000000000000000000000000000000000',
        ruleAuthority: '0x0000000000000000000000000000000000000000',
        verifyingContract: contracts.payIDVerifier,
        signer: signer as any,
        chainId,
        ttlSeconds: expiryMinutes ? parseInt(expiryMinutes) * 60 : 3600,
      });

      // Format EIP-712 Decision signature into the payload QR format
      // IMPORTANT: store the exact hashed values that were signed by the SDK
      // so GiftClaimPage can pass them verbatim to the contract without re-encoding.
      const mockPolicy = {
        version: 'payid.session.policy.v2',
        receiver: targetReceiver,
        ruleSetHash: proof.payload.ruleSetHash,
        ruleAuthority: proof.payload.ruleAuthority,
        allowedAsset: proof.payload.asset,
        maxAmount: proof.payload.amount.toString(),
        expiresAt: Number(proof.payload.expiresAt),
        policyNonce: proof.payload.nonce,       // raw bytes32 nonce (not re-generated)
        payId,                                   // human-readable string (re-hashed at claim)
        chainId,
        verifyingContract: contracts.payIDVerifier,
        signature: proof.signature,
        issuedAt: Number(proof.payload.issuedAt),
        // Store exact EIP-712 signed values to reconstruct Decision struct precisely
        _versionHash: proof.payload.version,     // keccak256("2") pre-computed by SDK
        _payIdHash: proof.payload.payId,          // keccak256(payId string) pre-computed by SDK
        _contextHash: proof.payload.contextHash,  // hashContext({}) pre-computed by SDK
        _payer: proof.payload.payer,              // Gifter's address
      };

      const qrPayload = encodeSessionPolicyV2QR(mockPolicy as any);
      const nativeSymbol = chain?.nativeCurrency?.symbol ?? 'ETH';

      const giftData: GiftCardData = {
        id: Math.random().toString(36).substring(7),
        mode,
        type,
        amount,
        asset: mode === 'gift' ? 'ERC20' : nativeSymbol,
        receiver: targetReceiver,
        expiryMinutes,
        expiresAt,
        theme,
        payload: qrPayload,
        senderAddress: address,
      };

      setGeneratedGift(giftData);
      localStorage.setItem(`payid_gift_${address}`, JSON.stringify(giftData));
      toast.success('🎁 Premium Gift Card generated and signed successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message?.includes('rejected') ? 'Signing rejected by user' : err.message || 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [address, connectorClient, mode, erc20Address, type, amount, receiver, expiryMinutes, theme, contracts, chainId]);

  const handleReset = useCallback(() => {
    setGeneratedGift(null);
    if (address) {
      localStorage.removeItem(`payid_gift_${address}`);
    }
    setAmount('0.01');
    setReceiver('');
    setExpiryMinutes('60');
  }, [address]);

  const nativeSymbol = chain?.nativeCurrency?.symbol ?? 'ETH';

  return {
    p,
    address,
    isConnected,
    mode,
    setMode,
    type,
    setType,
    amount,
    setAmount,
    erc20Address,
    setErc20Address,
    receiver,
    setReceiver,
    expiryMinutes,
    setExpiryMinutes,
    theme,
    setTheme,
    isLoading,
    generatedGift,
    handleGenerate,
    handleReset,
    nativeSymbol,
    balanceFormatted,
    remainingFormatted,
  };
}
