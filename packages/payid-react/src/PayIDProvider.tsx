import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useChainId } from 'wagmi';
import type { PayIDContracts } from './types';
import { PAYID_CONTRACTS } from './contracts/addresses';
import type { IReputationAdapter, IEscrowAdapter } from './adapters/types';
import { NoopReputationAdapter, NoopEscrowAdapter } from './adapters/noop';

//  Constants
export const DEFAULT_IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
export const DEFAULT_ZG_GATEWAY = 'https://indexer-storage-testnet-turbo.0g.ai';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

/** ═══════════════════════════════════════════════════════════════════════
 *  Adapter Resolution Flow
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  For each module (reputation / escrow), the resolver checks in order:
 *
 *  1. INJECTED adapter  →  user passed a custom adapter (e.g. any platform)
 *     • If adapter.name === 'noop' → feature DISABLED
 *     • Else → feature ACTIVE, label = adapter.label
 *
 *  2. CONTRACT deployed  →  PAY.ID contract address is non-zero
 *     • vindexRegistry for reputation  →  label = "VRAN"
 *     • escrowMilestone for escrow     →  label = "Escrow"
 *
 *  3. FALLBACK  →  Noop adapter
 *     • Feature DISABLED, label = "Disabled"
 *
 *  Hooks read this metadata and route to either:
 *    • adapter.getReputation()  (injected path)
 *    • useReadContract({ address: contracts.vindexRegistry })  (default path)
 */

export interface ModuleInfo {
  label: string;
  source: 'injected' | 'contract' | 'noop';
  active: boolean;
}

export interface ReputationModule {
  adapter: IReputationAdapter;
  info: ModuleInfo;
}

export interface EscrowModule {
  adapter: IEscrowAdapter;
  info: ModuleInfo;
}

export interface PayIDContextValue {
  contracts: PayIDContracts;
  chainId: number;
  ipfsGateway: string;
  zgGateway: string;
  reputation: ReputationModule;
  escrow: EscrowModule;
  features: {
    reputation: boolean;
    escrow: boolean;
  };
}

const PayIDContext = createContext<PayIDContextValue | null>(null);

//  Provider
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
  /**
   * IPFS gateway URL untuk fetch metadata rule.
   * Kalau kosong, fallback ke Pinata public gateway.
   *
   * @example
   * <PayIDProvider ipfsGateway="https://ipfs.io/ipfs/">
   * <PayIDProvider ipfsGateway="https://cloudflare-ipfs.com/ipfs/">
   * <PayIDProvider> // → pakai https://gateway.pinata.cloud/ipfs/
   */
  ipfsGateway?: string;
  /**
   * 0G Storage gateway URL untuk fetch metadata rule yang disimpan di 0G.
   * Digunakan otomatis ketika tokenURI rule adalah `0g://<rootHash>`.
   *
   * @example
   * <PayIDProvider zgGateway="https://indexer-storage-testnet-turbo.0g.ai">
   */
  zgGateway?: string;
  /**
   * Custom reputation adapter. Injected when the integrating platform
   * has its own reputation system (e.g. any platform, custom DAO).
   *
   * Pass `NoopReputationAdapter` to completely disable reputation features.
   * Leave undefined to use PAY.ID's built-in VindexRegistry.
   *
   * @example
   * import { NoopReputationAdapter } from 'payid-react';
   * <PayIDProvider reputationAdapter={NoopReputationAdapter}>
   */
  reputationAdapter?: IReputationAdapter;
  /**
   * Custom escrow adapter. Injected when the integrating platform
   * has its own escrow system (e.g. any platform's escrow).
   *
   * Pass `NoopEscrowAdapter` to completely disable escrow features.
   * Leave undefined to use PAY.ID's built-in EscrowMilestone.
   *
   * @example
   * import { NoopEscrowAdapter } from 'payid-react';
   * <PayIDProvider escrowAdapter={NoopEscrowAdapter}>
   */
  escrowAdapter?: IEscrowAdapter;
}

export function PayIDProvider({
  children,
  contracts: overrides,
  ipfsGateway,
  zgGateway,
  reputationAdapter,
  escrowAdapter,
}: PayIDProviderProps) {
  const chainId = useChainId();

  const defaults = PAYID_CONTRACTS[chainId];
  const override = overrides?.[chainId];

  const contracts: PayIDContracts = override
    ? { ...defaults, ...override }
    : (defaults ?? {
        ruleAuthority: '0x0000000000000000000000000000000000000000',
        ruleItemERC721: '0x0000000000000000000000000000000000000000',
        combinedRuleStorage: '0x0000000000000000000000000000000000000000',
        payIDVerifier: '0x0000000000000000000000000000000000000000',
        payWithPayID: '0x0000000000000000000000000000000000000000',
        vindexRegistry: '0x0000000000000000000000000000000000000000',
        attestationVerifier: '0x0000000000000000000000000000000000000000',
        aiAgentRegistry: '0x0000000000000000000000000000000000000000',
        aiAgentRuleManager: '0x0000000000000000000000000000000000000000',
      });

  const resolvedGateway =
    ipfsGateway && ipfsGateway.trim().length > 0 ? ipfsGateway : DEFAULT_IPFS_GATEWAY;
  const resolvedZgGateway =
    zgGateway && zgGateway.trim().length > 0 ? zgGateway.replace(/\/$/, '') : DEFAULT_ZG_GATEWAY;

  // ═══ Resolver: injected → contract → noop ═══════════════════════════
  const { reputation, escrow, features } = useMemo(() => {
    const hasVindex = !!contracts.vindexRegistry && contracts.vindexRegistry !== ZERO_ADDR;
    const hasEscrow = !!contracts.escrowMilestone && contracts.escrowMilestone !== ZERO_ADDR;

    // ─── Reputation resolver ─────────────────────────────────────────
    let rep: ReputationModule;
    if (reputationAdapter) {
      const isNoop = reputationAdapter.name === 'noop';
      rep = {
        adapter: reputationAdapter,
        info: {
          label: reputationAdapter.label,
          source: 'injected',
          active: !isNoop,
        },
      };
    } else if (hasVindex) {
      rep = {
        adapter: NoopReputationAdapter,
        info: { label: 'VRAN', source: 'contract', active: true },
      };
    } else {
      rep = {
        adapter: NoopReputationAdapter,
        info: { label: 'Disabled', source: 'noop', active: false },
      };
    }

    // ─── Escrow resolver ──────────────────────────────────────────────
    let esc: EscrowModule;
    if (escrowAdapter) {
      const isNoop = escrowAdapter.name === 'noop';
      esc = {
        adapter: escrowAdapter,
        info: {
          label: escrowAdapter.label,
          source: 'injected',
          active: !isNoop,
        },
      };
    } else if (hasEscrow) {
      esc = {
        adapter: NoopEscrowAdapter,
        info: { label: 'Escrow', source: 'contract', active: true },
      };
    } else {
      esc = {
        adapter: NoopEscrowAdapter,
        info: { label: 'Disabled', source: 'noop', active: false },
      };
    }

    return {
      reputation: rep,
      escrow: esc,
      features: { reputation: rep.info.active, escrow: esc.info.active },
    };
  }, [contracts, reputationAdapter, escrowAdapter]);

  return (
    <PayIDContext.Provider value={{ contracts, chainId, ipfsGateway: resolvedGateway, zgGateway: resolvedZgGateway, reputation, escrow, features }}>
      {children}
    </PayIDContext.Provider>
  );
}

// Hook
/**
 * Access the current chain's resolved contract addresses, chainId, and ipfsGateway.
 * Must be called inside <PayIDProvider>.
 *
 * @example
 * const { contracts, chainId, ipfsGateway } = usePayIDContext()
 * contracts.ruleItemERC721  // → '0x2279...'
 * ipfsGateway               // → 'https://gateway.pinata.cloud/ipfs/'
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
