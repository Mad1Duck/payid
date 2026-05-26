import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId, useConnectorClient, useBalance } from 'wagmi';
import { usePayIDContext } from 'payid-react';
import { useV4Palette } from '@/components/v4/theme';
import { toast } from 'sonner';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

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
  const [tokenType, setTokenType] = useState<'erc20' | 'native'>('erc20');
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
      parsedAmount = parseUnits(amount, 18);
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
    if (mode === 'gift' && type === 'targeted' && (!receiver || receiver.length !== 42)) {
      toast.error('Please enter a valid 42-character recipient wallet address.');
      return;
    }
    if (mode === 'gift' && tokenType === 'erc20' && (!erc20Address || erc20Address.length !== 42)) {
      toast.error('Please enter a valid 42-character ERC20 token address for the gift.');
      return;
    }


    setIsLoading(true);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (Number(expiryMinutes) || 60) * 60;
      const targetReceiver = (mode === 'gift' && type === 'targeted') ? receiver : address;
      const payId = `${address.slice(0, 6)}@gift.pay.id`;
      const assetAddress = (mode === 'gift' && tokenType === 'erc20') ? erc20Address : ZERO_ADDR;

      // Import generateDecisionProof
      const { generateDecisionProof } = await import('payid/decision-proof');

      const provider = new BrowserProvider(connectorClient.transport as any);
      const signer = await provider.getSigner();
      const latestBlock = await provider.getBlock('latest');
      const blockTimestamp = latestBlock ? Number(latestBlock.timestamp) : undefined;

      // Resolve token decimals (ERC20 may not be 18, e.g. USDC = 6)
      let tokenDecimals = 18;
      if (tokenType === 'erc20') {
        try {
          const tokenForDecimals = new Contract(
            erc20Address,
            ['function decimals() view returns (uint8)'],
            provider,
          );
          tokenDecimals = Number(await tokenForDecimals.decimals());
        } catch (e) { /* fallback to 18 */ }
      }
      const parsedAmount = parseUnits(amount, tokenDecimals);

      // For ERC20 gifts, approve PayWithPayID to pull tokens from sender at claim time
      if (mode === 'gift' && tokenType === 'erc20') {
        const erc20 = new Contract(
          erc20Address,
          ['function approve(address spender, uint256 amount) returns (bool)'],
          signer,
        );
        toast.info('Step 1/2: Approving ERC20 spend...');
        const approveTx = await erc20.approve(contracts.payWithPayID, parsedAmount);
        await approveTx.wait();

        if (type === 'public') {
          // Public ERC20 gift: receiver unknown — store unsigned params, sign per-claimer at request time
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
      } else if (mode === 'gift' && tokenType === 'native') {
        if (type === 'public') {
          // Public native gift: store pending params so sender can sign per-claimer
          const pendingData = {
            amount: parsedAmount.toString(),
            asset: ZERO_ADDR,
            sender: address,
            expiresAt,
            chainId,
            payId,
            verifyingContract: contracts.payIDVerifier,
          };
          const nativeSym = chain?.nativeCurrency?.symbol ?? 'ETH';
          const giftData: GiftCardData = {
            id: Math.random().toString(36).substring(7),
            mode,
            type,
            amount,
            asset: nativeSym,
            receiver: '',
            expiryMinutes,
            expiresAt,
            theme,
            payload: `pending:${btoa(JSON.stringify(pendingData))}`,
            senderAddress: address,
          };
          setGeneratedGift(giftData);
          localStorage.setItem(`payid_gift_${address}`, JSON.stringify(giftData));
          toast.success('🎁 Public native gift voucher ready! Share the link so anyone can request it.');
          return;
        }
        toast.info('Step 1/2: Signing gift proof...');
      }

      const proof = await generateDecisionProof({
        payId,
        payer: address,
        receiver: targetReceiver,
        asset: assetAddress,
        amount: parsedAmount,
        context: {},
        ruleConfig: {},
        ruleSetHashOverride: '0x0000000000000000000000000000000000000000000000000000000000000000',
        ruleAuthority: '0x0000000000000000000000000000000000000000',
        verifyingContract: contracts.payIDVerifier,
        signer: signer as any,
        chainId,
        blockTimestamp,
        ttlSeconds: expiryMinutes ? parseInt(expiryMinutes) * 60 : 3600,
      });

      // ── Targeted native gift: deliver native token immediately at creation time ─────────
      // payNative requires msg.value from the caller (the sender). We do it here
      // so the friend's claim URL is purely a receipt/notification — no action needed.
      if (mode === 'gift' && tokenType === 'native' && type === 'targeted') {
        const { payWithPayIDAbi } = await import('@/constants/contracts');
        const payContract = new Contract(contracts.payWithPayID, payWithPayIDAbi, signer);
        const decisionForTx = {
          version: proof.payload.version,
          payId: proof.payload.payId,
          payer: proof.payload.payer,
          receiver: targetReceiver as string,
          asset: proof.payload.asset,
          amount: proof.payload.amount,
          contextHash: proof.payload.contextHash,
          ruleSetHash: proof.payload.ruleSetHash,
          ruleAuthority: proof.payload.ruleAuthority,
          issuedAt: proof.payload.issuedAt,
          expiresAt: proof.payload.expiresAt,
          nonce: proof.payload.nonce,
          requiresAttestation: false,
          attestationUIDsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        };
        const nativeSym = chain?.nativeCurrency?.symbol ?? 'ETH';
        toast.info(`Step 2/2: Delivering ${nativeSym}...`);
        const tx = await payContract.payNative(decisionForTx, proof.signature, [], { value: parsedAmount });
        toast.info('Waiting for confirmation...');
        const txReceipt = await tx.wait();
        const receiptPayload = `receipt:${btoa(JSON.stringify({
          txHash: txReceipt?.hash ?? tx.hash,
          receiver: targetReceiver,
          sender: address,
          amount: parsedAmount.toString(),
        }))}`;
        const giftData: GiftCardData = {
          id: Math.random().toString(36).substring(7),
          mode, type, amount,
          asset: nativeSym,
          receiver: targetReceiver as string,
          expiryMinutes, expiresAt, theme,
          payload: receiptPayload,
          senderAddress: address,
        };
        setGeneratedGift(giftData);
        localStorage.setItem(`payid_gift_${address}`, JSON.stringify(giftData));
        toast.success(`🎁 ${nativeSym} delivered! Copy the notification link and send it to your friend.`);
        return;
      }

      // Store the exact EIP-712-signed values verbatim so GiftClaimPage can pass them
      // directly to the contract without any re-encoding or lossy intermediate format.
      const directData = {
        decision: {
          version: proof.payload.version,
          payId: proof.payload.payId,
          payer: proof.payload.payer,
          receiver: targetReceiver,
          asset: proof.payload.asset,
          amount: proof.payload.amount.toString(),
          contextHash: proof.payload.contextHash,
          ruleSetHash: proof.payload.ruleSetHash,
          ruleAuthority: proof.payload.ruleAuthority,
          issuedAt: proof.payload.issuedAt.toString(),
          expiresAt: proof.payload.expiresAt.toString(),
          nonce: proof.payload.nonce,
          requiresAttestation: (proof.payload as any).requiresAttestation ?? false,
          attestationUIDsHash: (proof.payload as any).attestationUIDsHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
        signature: proof.signature,
      };
      const qrPayload = `direct:${btoa(JSON.stringify(directData))}`;

      const nativeSymbol = chain?.nativeCurrency?.symbol ?? 'ETH';
      const assetLabel = mode === 'gift'
        ? (tokenType === 'erc20' ? 'ERC20' : nativeSymbol)
        : nativeSymbol;

      const giftData: GiftCardData = {
        id: Math.random().toString(36).substring(7),
        mode,
        type,
        amount,
        asset: assetLabel,
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
  }, [address, connectorClient, mode, tokenType, erc20Address, type, amount, receiver, expiryMinutes, theme, contracts, chainId, chain]);

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
    tokenType,
    setTokenType,
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
