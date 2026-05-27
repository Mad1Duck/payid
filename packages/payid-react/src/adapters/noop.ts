import type { Address, Hash } from 'viem';
import type {
  IReputationAdapter,
  ReputationResult,
  VranConfigResult,
  ReportResult,
  IEscrowAdapter,
  MilestoneDef,
  EscrowResult,
} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  No-Op Adapters (Disable Features)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Use these when you want to completely disable a feature.
 * e.g. a platform has its own reputation + escrow, so PAY.ID's
 *      reputation and escrow UI should not appear.
 */

// ─── No-Op Reputation ───────────────────────────────────────────────────

export const NoopReputationAdapter: IReputationAdapter = {
  name: 'noop',
  label: 'Disabled',

  getReputation(): Promise<ReputationResult> {
    return Promise.resolve({ score: 500, isBlacklisted: false, isTrusted: false });
  },

  getConfig(): Promise<VranConfigResult> {
    return Promise.resolve({ minStake: 0n, consensusThreshold: 0n, minReporterReputation: 0n, reportCount: 0, trustThreshold: 0 });
  },

  canReport(): Promise<boolean> {
    return Promise.resolve(false);
  },

  submitReport: undefined,
  confirmReport: undefined,
  getReport: undefined,
  getSuccessfulReports: undefined,
};

// ─── No-Op Escrow ────────────────────────────────────────────────────────

export const NoopEscrowAdapter: IEscrowAdapter = {
  name: 'noop',
  label: 'Disabled',

  createEscrow(): Promise<bigint> {
    return Promise.resolve(0n); // safe default — UI should check features.escrow before calling
  },

  submitMilestone(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  },

  releaseMilestone(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  },

  dispute(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  },

  resolveRefund(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  },

  autoRefund(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  },

  getUserEscrows(): Promise<EscrowResult[]> {
    return Promise.resolve([]);
  },
};
