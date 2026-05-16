import type { Address, Hash } from 'viem';

export interface PayIDContracts {
  ruleAuthority: Address;
  ruleItemERC721: Address;
  combinedRuleStorage: Address;
  payIDVerifier: Address;
  payWithPayID: Address;
  /** VindexRegistry address for VRAN reputation checks */
  vindexRegistry?: Address;
  /** AttestationVerifier address for EAS attestation checks */
  attestationVerifier?: Address;
  /** AIAgentRegistry address for AI agent marketplace */
  aiAgentRegistry?: Address;
  /** AIAgentRuleManager address for AI agent rule subscriptions */
  aiAgentRuleManager?: Address;
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

/* ── AI Agent Types ────────────────────────────────────────────── */

/** Admin Agent: minimal on-chain, encrypted metadata, admin-only register */
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

/** User Agent: rich metadata on-chain, self-registered */
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

