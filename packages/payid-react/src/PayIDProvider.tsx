import { createContext, useContext, type ReactNode } from 'react';
import { useChainId } from 'wagmi';
import type { PayIDContracts } from './types';
import { getContracts } from './contracts/addresses';

// Context

interface PayIDContextValue {
  contracts: PayIDContracts;
  chainId: number;
}

const PayIDContext = createContext<PayIDContextValue | null>(null);

// Provider

interface PayIDProviderProps {
  children: ReactNode;
  /** Override contract addresses — berguna kalau punya deployment sendiri */
  contracts?: Partial<Record<number, PayIDContracts>>;
}

/**
 * Wrap aplikasi dengan PayIDProvider setelah WagmiProvider:
 *
 * ```tsx
 * <WagmiProvider config={wagmiConfig}>
 *   <PayIDProvider>
 *     <App />
 *   </PayIDProvider>
 * </WagmiProvider>
 * ```
 *
 * Atau dengan custom addresses:
 * ```tsx
 * <PayIDProvider contracts={{ 4202: { ruleAuthority: '0x...', ... } }}>
 */
export function PayIDProvider({ children, contracts: overrides }: PayIDProviderProps) {
  const chainId = useChainId();

  let contracts: PayIDContracts;
  try {
    const defaults = getContracts(chainId);
    contracts = { ...defaults, ...overrides?.[chainId] };
  } catch {
    contracts = {
      ruleAuthority: '0x0000000000000000000000000000000000000000',
      ruleItemERC721: '0x0000000000000000000000000000000000000000',
      combinedRuleStorage: '0x0000000000000000000000000000000000000000',
      payIDVerifier: '0x0000000000000000000000000000000000000000',
      payWithPayID: '0x0000000000000000000000000000000000000000',
    };
  }

  return <PayIDContext.Provider value={{ contracts, chainId }}>{children}</PayIDContext.Provider>;
}

// Internal hook

export function usePayIDContext(): PayIDContextValue {
  const ctx = useContext(PayIDContext);
  if (!ctx) throw new Error('[payid-react] usePayID* hooks must be used inside <PayIDProvider>');
  return ctx;
}
