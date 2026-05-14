import type { ResolverOptions } from "./types";

const DEFAULT_ZG_INDEXER = "https://indexer-testnet.0g.ai";

export interface ReverseResolutionResult {
  payId: string;
  owner: string;
  activeRuleHash?: string;
  metadata?: Record<string, unknown>;
}

export interface ReverseResolutionOptions extends ResolverOptions {
  registryUrl?: string;
  timeoutMs?: number;
}

/**
 * Reverse resolve a wallet address to its registered PayID.
 *
 * Queries the 0G Storage reverse index or a fallback registry HTTP endpoint.
 *
 * @example
 * ```ts
 * const { payId } = await reverseResolvePayID(
 *   "0x1234...",
 *   { registryUrl: "https://registry.pay.id/v1" }
 * );
 * console.log(payId); // "alice.pay.id"
 * ```
 */
export async function reverseResolvePayID(
  address: string,
  options?: ReverseResolutionOptions
): Promise<ReverseResolutionResult | null> {
  const normalized = address.toLowerCase();

  // 1. Try 0G Storage reverse blob first
  try {
    const indexerUrl =
      options?.zgIndexerUrl ??
      (globalThis as any).PAYID_ZGS_INDEXER_URL ??
      DEFAULT_ZG_INDEXER;

    const blobUrl = `${indexerUrl}/reverse/${normalized}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), options?.timeoutMs ?? 5000);

    const res = await fetch(blobUrl, { signal: ctrl.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.payId && data.owner?.toLowerCase() === normalized) {
        return {
          payId: data.payId,
          owner: data.owner,
          activeRuleHash: data.activeRuleHash,
          metadata: data.metadata,
        };
      }
    }
  } catch {
    // Fallback to registry HTTP endpoint
  }

  // 2. Fallback to registry HTTP endpoint
  if (options?.registryUrl) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), options?.timeoutMs ?? 5000);

      const res = await fetch(`${options.registryUrl}/reverse/${normalized}`, {
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.payId && data.owner?.toLowerCase() === normalized) {
          return {
            payId: data.payId,
            owner: data.owner,
            activeRuleHash: data.activeRuleHash,
            metadata: data.metadata,
          };
        }
      }
    } catch {
      // Silent fail → return null
    }
  }

  return null;
}

/**
 * Batch reverse resolve multiple addresses at once.
 * Useful for enriching contact lists or transaction history.
 */
export async function batchReverseResolve(
  addresses: string[],
  options?: ReverseResolutionOptions
): Promise<Map<string, ReverseResolutionResult | null>> {
  const results = new Map<string, ReverseResolutionResult | null>();

  await Promise.all(
    addresses.map(async (addr) => {
      const result = await reverseResolvePayID(addr, options);
      results.set(addr.toLowerCase(), result);
    })
  );

  return results;
}
