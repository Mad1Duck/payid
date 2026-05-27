import type { Address, Hash } from 'viem';
import type {
  IReputationAdapter,
  ReputationResult,
  VranConfigResult,
  ReportResult,
  IEscrowAdapter,
  MilestoneDef,
  EscrowResult,
} from '../types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Fallback Chain Adapters
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Try primary adapter first. If it throws or returns null,
 *  automatically fall back to secondary adapter.
 *
 *  Use case: Progressive adoption — 10% of users have platform
 *  reputation, 90% fall back to VRAN contract.
 */

// ─── Reputation Fallback ─────────────────────────────────────────────────

export interface FallbackReputationOptions {
  primary: IReputationAdapter;
  fallback: IReputationAdapter;
  label?: string;
}

export class FallbackReputationAdapter implements IReputationAdapter {
  readonly name = 'fallback-reputation';
  readonly label: string;

  constructor(private options: FallbackReputationOptions) {
    this.label = options.label ?? `${options.primary.label} → ${options.fallback.label}`;
  }

  async getReputation(target: Address): Promise<ReputationResult> {
    try {
      return await this.options.primary.getReputation(target);
    } catch {
      return this.options.fallback.getReputation(target);
    }
  }

  async getConfig(): Promise<VranConfigResult> {
    try {
      return await this.options.primary.getConfig();
    } catch {
      return this.options.fallback.getConfig();
    }
  }

  async canReport(address: Address): Promise<boolean> {
    try {
      return await this.options.primary.canReport(address);
    } catch {
      return this.options.fallback.canReport(address);
    }
  }

  async submitReport?(target: Address, evidenceHash: string, stake: bigint): Promise<Hash | null> {
    const primary = this.options.primary.submitReport;
    if (primary) {
      try {
        return await primary.call(this.options.primary, target, evidenceHash, stake);
      } catch { /* fall through */ }
    }
    const fallback = this.options.fallback.submitReport;
    if (fallback) {
      return fallback.call(this.options.fallback, target, evidenceHash, stake);
    }
    return null;
  }

  async confirmReport?(reportId: bigint): Promise<Hash | null> {
    const primary = this.options.primary.confirmReport;
    if (primary) {
      try {
        return await primary.call(this.options.primary, reportId);
      } catch { /* fall through */ }
    }
    const fallback = this.options.fallback.confirmReport;
    if (fallback) {
      return fallback.call(this.options.fallback, reportId);
    }
    return null;
  }

  async getReport?(reportId: bigint): Promise<ReportResult | null> {
    const primary = this.options.primary.getReport;
    if (primary) {
      try {
        return await primary.call(this.options.primary, reportId);
      } catch { /* fall through */ }
    }
    const fallback = this.options.fallback.getReport;
    if (fallback) {
      return fallback.call(this.options.fallback, reportId);
    }
    return null;
  }

  async getSuccessfulReports?(address: Address): Promise<number> {
    const primary = this.options.primary.getSuccessfulReports;
    if (primary) {
      try {
        return await primary.call(this.options.primary, address);
      } catch { /* fall through */ }
    }
    const fallback = this.options.fallback.getSuccessfulReports;
    if (fallback) {
      return fallback.call(this.options.fallback, address);
    }
    return 0;
  }
}

// ─── Escrow Fallback ─────────────────────────────────────────────────────

export interface FallbackEscrowOptions {
  primary: IEscrowAdapter;
  fallback: IEscrowAdapter;
  label?: string;
}

export class FallbackEscrowAdapter implements IEscrowAdapter {
  readonly name = 'fallback-escrow';
  readonly label: string;

  constructor(private options: FallbackEscrowOptions) {
    this.label = options.label ?? `${options.primary.label} → ${options.fallback.label}`;
  }

  async createEscrow(
    freelancer: Address,
    asset: Address,
    milestones: MilestoneDef[],
    deadline: bigint,
    value?: bigint,
  ): Promise<bigint> {
    try {
      return await this.options.primary.createEscrow(freelancer, asset, milestones, deadline, value);
    } catch {
      return this.options.fallback.createEscrow(freelancer, asset, milestones, deadline, value);
    }
  }

  async submitMilestone(escrowId: bigint, index: number, evidenceHash: string): Promise<Hash | null> {
    try {
      return await this.options.primary.submitMilestone(escrowId, index, evidenceHash);
    } catch {
      return this.options.fallback.submitMilestone(escrowId, index, evidenceHash);
    }
  }

  async releaseMilestone(escrowId: bigint, index: number): Promise<Hash | null> {
    try {
      return await this.options.primary.releaseMilestone(escrowId, index);
    } catch {
      return this.options.fallback.releaseMilestone(escrowId, index);
    }
  }

  async dispute(escrowId: bigint): Promise<Hash | null> {
    try {
      return await this.options.primary.dispute(escrowId);
    } catch {
      return this.options.fallback.dispute(escrowId);
    }
  }

  async resolveRefund(escrowId: bigint): Promise<Hash | null> {
    try {
      return await this.options.primary.resolveRefund(escrowId);
    } catch {
      return this.options.fallback.resolveRefund(escrowId);
    }
  }

  async autoRefund(escrowId: bigint): Promise<Hash | null> {
    try {
      return await this.options.primary.autoRefund(escrowId);
    } catch {
      return this.options.fallback.autoRefund(escrowId);
    }
  }

  async getUserEscrows(user: Address): Promise<EscrowResult[]> {
    try {
      return await this.options.primary.getUserEscrows(user);
    } catch {
      return this.options.fallback.getUserEscrows(user);
    }
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createFallbackReputation(primary: IReputationAdapter, fallback: IReputationAdapter, label?: string) {
  return new FallbackReputationAdapter({ primary, fallback, label });
}

export function createFallbackEscrow(primary: IEscrowAdapter, fallback: IEscrowAdapter, label?: string) {
  return new FallbackEscrowAdapter({ primary, fallback, label });
}
