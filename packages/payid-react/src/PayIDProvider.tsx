import { createContext, useContext, type ReactNode } from 'react';
import { useChainId } from 'wagmi';
import type { PayIDContracts } from './types';
import { PAYID_CONTRACTS } from './contracts/addresses';

// Context

export interface PayIDContextValue {
  contracts: PayIDContracts;
  chainId: number;
}

const PayIDContext = createContext<PayIDContextValue | null>(null);

// Provider

interface PayIDProviderProps {
  children: ReactNode;
  /**
   * Override contract addresses per chainId.
   * Overrides are merged on top of PAYID_CONTRACTS defaults.
   *
   * @example
   * <PayIDProvider contracts={{
   *   31337: {
   *     ruleItemERC721:      '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
   *     combinedRuleStorage: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
   *     ruleAuthority:       '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
   *     payIDVerifier:       '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
   *     payWithPayID:        '0x0165878A594ca255338adfa4d48449f69242Eb8F',
   *   }
   * }}>
   */
  contracts?: Partial<Record<number, PayIDContracts>>;
}

export function PayIDProvider({ children, contracts: overrides }: PayIDProviderProps) {
  const chainId = useChainId();

  // Priority: overrides[chainId] → PAYID_CONTRACTS[chainId] → zero addresses
  // OLD BUG: wrapped in try/catch so overrides were silently ignored when
  // chainId existed in PAYID_CONTRACTS but had zero addresses.
  const defaults = PAYID_CONTRACTS[chainId];
  const override = overrides?.[chainId];

  const contracts: PayIDContracts = override
    ? { ...defaults, ...override } // merge: override wins per-key
    : (defaults ?? {
        // fallback to zeros, never throws
        ruleAuthority: '0x0000000000000000000000000000000000000000',
        ruleItemERC721: '0x0000000000000000000000000000000000000000',
        combinedRuleStorage: '0x0000000000000000000000000000000000000000',
        payIDVerifier: '0x0000000000000000000000000000000000000000',
        payWithPayID: '0x0000000000000000000000000000000000000000',
      });

  return <PayIDContext.Provider value={{ contracts, chainId }}>{children}</PayIDContext.Provider>;
}

// Hook

/**
 * Access the current chain's resolved contract addresses and chainId.
 * Must be called inside <PayIDProvider>.
 *
 * @example
 * const { contracts, chainId } = usePayIDContext()
 * contracts.ruleItemERC721   // → '0x2279...'
 * contracts.payWithPayID     // → '0x0165...'
 */
export function usePayIDContext(): PayIDContextValue {
  const ctx = useContext(PayIDContext);
  if (!ctx) {
    throw new Error(
      '[payid-react] usePayIDContext() must be called inside <PayIDProvider>.\n' +
        'Wrap your app: <WagmiProvider> → <PayIDProvider> → <App />',
    );
  }
  return ctx;
}
