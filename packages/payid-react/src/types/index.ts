import type { Address, Hash } from 'viem';

export interface PayIDContracts {
  ruleAuthority: Address;
  ruleItemERC721: Address;
  combinedRuleStorage: Address;
  payIDVerifier: Address;
  payWithPayID: Address;
}

export interface RuleRef {
  ruleNFT: Address;
  tokenId: bigint;
}

export interface RuleSet {
  hash: Hash;
  owner: Address;
  version: bigint;
  active: boolean;
  registeredAt: bigint;
  refCount: bigint;
  ruleRefs: RuleRef[];
}

export interface RuleDefinition {
  ruleId: bigint;
  ruleHash: Hash;
  uri: string;
  creator: Address;
  rootRuleId: bigint;
  version: number;
  deprecated: boolean;
  active: boolean;
  tokenId: bigint;        // 0 kalau belum diactivate
  expiry: bigint;         // unix timestamp, 0 = no expiry
}

export interface SubscriptionInfo {
  expiry: bigint;
  isActive: boolean;
  logicalRuleCount: number;
  maxSlots: number;       // 1 tanpa sub, 3 dengan sub
}

export enum RuleDirection {
  INBOUND = 0,
  OUTBOUND = 1,
}

export interface CombinedRule {
  hash: Hash;
  owner: Address;
  version: bigint;
  active: boolean;
  ruleRefs: RuleRef[];
  direction?: RuleDirection;
}

export interface PayIDContext {
  provider: object;  // injected wagmi/viem provider
  contracts: PayIDContracts;
}
