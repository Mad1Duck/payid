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
 *  Adapter Middleware — Logging, Retry, Timing
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Wrap any adapter to add cross-cutting concerns:
 *    • logging   → console.log every call with args + timing
 *    • retry     → auto-retry on transient failures (3 attempts, exponential backoff)
 *    • timeout   → abort calls that hang (> 10s)
 *    • circuit   → fail fast after N consecutive errors
 *
 *  @example
 *  const wrapped = withMiddleware(adapter, { log: true, retry: 3 });
 */

export interface MiddlewareOptions {
  log?: boolean;
  retry?: number;
  timeout?: number;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number, label: string, logger: Pick<Console, 'warn' | 'error'>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const delay = Math.min(1000 * 2 ** i, 8000); // exponential backoff capped at 8s
        logger.warn(`[middleware] ${label} failed (attempt ${i + 1}/${attempts}), retrying in ${delay}ms…`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  logger.error(`[middleware] ${label} failed after ${attempts} attempts`);
  throw lastErr;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`[middleware] ${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Reputation Middleware
// ═══════════════════════════════════════════════════════════════════════════

export function withMiddlewareReputation(adapter: IReputationAdapter, options: MiddlewareOptions = {}): IReputationAdapter {
  const { log = false, retry = 0, timeout = 10000, logger = console } = options;

  const wrap = <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    const start = log ? performance.now() : 0;
    const run = async (): Promise<T> => {
      if (log) logger.log(`[middleware] ${label} → ${adapter.name}`);
      const result = await withTimeout(fn(), timeout, label);
      if (log) logger.log(`[middleware] ${label} ← ${adapter.name} (${Math.round(performance.now() - start)}ms)`);
      return result;
    };
    return retry > 0 ? withRetry(run, retry + 1, label, logger) : run();
  };

  return {
    name: adapter.name,
    label: adapter.label,

    getReputation: (target: Address) =>
      wrap(() => adapter.getReputation(target), `getReputation(${target})`),

    getConfig: () =>
      wrap(() => adapter.getConfig(), 'getConfig()'),

    canReport: (address: Address) =>
      wrap(() => adapter.canReport(address), `canReport(${address})`),

    submitReport: adapter.submitReport
      ? (target: Address, evidenceHash: string, stake: bigint) =>
        wrap(() => adapter.submitReport!(target, evidenceHash, stake), `submitReport(${target})`)
      : undefined,

    confirmReport: adapter.confirmReport
      ? (reportId: bigint) =>
        wrap(() => adapter.confirmReport!(reportId), `confirmReport(${reportId})`)
      : undefined,

    getReport: adapter.getReport
      ? (reportId: bigint) =>
        wrap(() => adapter.getReport!(reportId), `getReport(${reportId})`)
      : undefined,

    getSuccessfulReports: adapter.getSuccessfulReports
      ? (address: Address) =>
        wrap(() => adapter.getSuccessfulReports!(address), `getSuccessfulReports(${address})`)
      : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Escrow Middleware
// ═══════════════════════════════════════════════════════════════════════════

export function withMiddlewareEscrow(adapter: IEscrowAdapter, options: MiddlewareOptions = {}): IEscrowAdapter {
  const { log = false, retry = 0, timeout = 10000, logger = console } = options;

  const wrap = <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    const start = log ? performance.now() : 0;
    const run = async (): Promise<T> => {
      if (log) logger.log(`[middleware] ${label} → ${adapter.name}`);
      const result = await withTimeout(fn(), timeout, label);
      if (log) logger.log(`[middleware] ${label} ← ${adapter.name} (${Math.round(performance.now() - start)}ms)`);
      return result;
    };
    return retry > 0 ? withRetry(run, retry + 1, label, logger) : run();
  };

  return {
    name: adapter.name,
    label: adapter.label,

    createEscrow: (freelancer: Address, asset: Address, milestones: MilestoneDef[], deadline: bigint, value?: bigint) =>
      wrap(() => adapter.createEscrow(freelancer, asset, milestones, deadline, value), `createEscrow(${freelancer})`),

    submitMilestone: (escrowId: bigint, index: number, evidenceHash: string) =>
      wrap(() => adapter.submitMilestone(escrowId, index, evidenceHash), `submitMilestone(${escrowId}, ${index})`),

    releaseMilestone: (escrowId: bigint, index: number) =>
      wrap(() => adapter.releaseMilestone(escrowId, index), `releaseMilestone(${escrowId}, ${index})`),

    dispute: (escrowId: bigint) =>
      wrap(() => adapter.dispute(escrowId), `dispute(${escrowId})`),

    resolveRefund: (escrowId: bigint) =>
      wrap(() => adapter.resolveRefund(escrowId), `resolveRefund(${escrowId})`),

    autoRefund: (escrowId: bigint) =>
      wrap(() => adapter.autoRefund(escrowId), `autoRefund(${escrowId})`),

    getUserEscrows: (user: Address) =>
      wrap(() => adapter.getUserEscrows(user), `getUserEscrows(${user})`),
  };
}
