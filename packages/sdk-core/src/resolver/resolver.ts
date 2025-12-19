import type { RuleSource, ResolvedRule } from "./types";
import { resolveHttpRule } from "./http";
import { resolveIpfsRule } from "./ipfs";

export async function resolveRule(
  source: RuleSource
): Promise<ResolvedRule> {
  const { uri, hash } = source;

  let config: any;

  if (uri.startsWith("ipfs://")) {
    config = await resolveIpfsRule(uri, hash);
  } else if (uri.startsWith("http://") || uri.startsWith("https://")) {
    config = await resolveHttpRule(uri, hash);
  } else {
    throw new Error("UNSUPPORTED_RULE_URI");
  }

  return {
    config,
    source
  };
}
