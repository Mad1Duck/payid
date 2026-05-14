import type { RuleSource, ResolvedRule, ResolverOptions } from "./types";
import { fetchJsonWithHashCheck } from "../utils/fetchJson";

const DEFAULT_ZG_INDEXER = "https://indexer-testnet.0g.ai";

export async function resolveRule(
  source: RuleSource,
  options?: ResolverOptions
): Promise<ResolvedRule> {
  const { uri, hash } = source;

  if (uri.startsWith("inline://")) {
    const encoded = uri.replace("inline://", "");
    const json = JSON.parse(atob(encoded));
    return { config: json, source };
  }

  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    const url = `https://ipfs.io/ipfs/${cid}`;
    const config = await fetchJsonWithHashCheck(url, hash);
    return { config, source };
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const config = await fetchJsonWithHashCheck(uri, hash);
    return { config, source };
  }

  if (uri.startsWith("0g://")) {
    const rootHash = uri.replace("0g://", "");
    const indexerUrl = options?.zgIndexerUrl ?? (globalThis as any).PAYID_ZGS_INDEXER_URL ?? DEFAULT_ZG_INDEXER;
    const url = `${indexerUrl}/blob/${rootHash}`;
    const config = await fetchJsonWithHashCheck(url, hash);
    return { config, source };
  }

  throw new Error("UNSUPPORTED_RULE_URI");
}
