import type { Address, Hash } from 'viem';

// ═══════════════════════════════════════════════════════════════════════════
//  Reputation Adapter
// ═══════════════════════════════════════════════════════════════════════════

export interface ReputationResult {
  score: number;
  isBlacklisted: boolean;
  isTrusted: boolean;
}

export interface VranConfigResult {
  minStake: bigint;
  consensusThreshold: bigint;
  minReporterReputation: bigint;
  reportCount?: number;
  trustThreshold?: number;
}

export interface ReportResult {
  target: Address;
  reporter: Address;
  evidenceHash: string;
  stake: bigint;
  confirmations: number;
  resolved: boolean;
  valid: boolean;
}

export interface IReputationAdapter {
  readonly name: string;
  readonly label: string;
  getReputation(target: Address): Promise<ReputationResult>;
  getConfig(): Promise<VranConfigResult>;
  canReport(address: Address): Promise<boolean>;
  submitReport?(target: Address, evidenceHash: string, stake: bigint): Promise<Hash | null>;
  confirmReport?(reportId: bigint): Promise<Hash | null>;
  getReport?(reportId: bigint): Promise<ReportResult | null>;
  getSuccessfulReports?(address: Address): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Escrow Adapter
// ═══════════════════════════════════════════════════════════════════════════

export interface MilestoneDef {
  description: string;
  amount: bigint;
}

export interface EscrowResult {
  id: bigint;
  client: Address;
  freelancer: Address;
  asset: Address;
  total: bigint;
  released: bigint;
  status: 'pending' | 'active' | 'disputed' | 'completed' | 'refunded';
  milestones: MilestoneDef[];
  deadline: bigint;
}

export interface IEscrowAdapter {
  readonly name: string;
  readonly label: string;
  createEscrow(
    freelancer: Address,
    asset: Address,
    milestones: MilestoneDef[],
    deadline: bigint,
    value?: bigint
  ): Promise<bigint>;
  submitMilestone(escrowId: bigint, index: number, evidenceHash: string): Promise<Hash | null>;
  releaseMilestone(escrowId: bigint, index: number): Promise<Hash | null>;
  dispute(escrowId: bigint): Promise<Hash | null>;
  resolveRefund(escrowId: bigint): Promise<Hash | null>;
  autoRefund(escrowId: bigint): Promise<Hash | null>;
  getUserEscrows(user: Address): Promise<EscrowResult[]>;
}
