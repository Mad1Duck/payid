import type { RuleConfig } from "../types";

export interface RuleSource {
  uri: string;
  hash?: string; // hex or base64
}

export interface ResolvedRule {
  config: RuleConfig;
  source: RuleSource;
}

export interface ResolverOptions {
  zgIndexerUrl?: string;
}
