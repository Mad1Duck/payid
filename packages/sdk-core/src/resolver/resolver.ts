import type { RuleSource, ResolvedRule } from "./types";
import { fetchJsonWithHashCheck } from "../utils/fetchJson";

export async function resolveRule(
  source: RuleSource
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

  throw new Error("UNSUPPORTED_RULE_URI");
}
