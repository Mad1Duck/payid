import type { RuleConfig } from "payid-types";

export interface RuleSource {
  uri: string;
  hash?: string; // hex or base64
}

export interface ResolvedRule {
  config: RuleConfig;
  source: RuleSource;
}
