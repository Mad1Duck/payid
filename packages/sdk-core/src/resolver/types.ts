export interface RuleSource {
  uri: string;          // ipfs://... | https://...
  hash?: string;        // optional keccak256 hash
}

export interface ResolvedRule {
  config: any;
  source: RuleSource;
}
