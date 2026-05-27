import type { Address, Hash } from 'viem';

export interface PayIDContracts {
  ruleAuthority: Address;
  ruleItemERC721: Address;
  combinedRuleStorage: Address;
  payIDVerifier: Address;
  payWithPayID: Address;
  vindexRegistry?: Address;
  attestationVerifier?: Address;
  aiAgentRegistry?: Address;
  aiAgentRuleManager?: Address;
  escrowMilestone?: Address;
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

export interface AdminAgent {
  agentWallet: Address;
  owner: Address;
  displayName: string;
  metadataHash: Hash;
  encryptedURI: string;
  publicEndpoint: string;
  registeredAt: bigint;
  active: boolean;
}

export interface AIAgent {
  owner: Address;
  handle: string;
  name: string;
  metadataURI: string;
  modelType: string;
  computeProvider: string;
  computeEndpoint: string;
  registeredAt: bigint;
  active: boolean;
  verified: boolean;
  reputationScore: bigint;
  totalInferences: bigint;
  lastActiveAt: bigint;
}

export interface AgentRuleInfo {
  ruleSetHash: Hash;
  setAt: bigint;
  active: boolean;
}

export interface AgentSubscription {
  expiry: bigint;
  active: boolean;
}

export interface AgentWithRule {
  agent: Address;
  ruleSetHash: Hash;
}

export interface TxHookResult {
  hash: Hash | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}
