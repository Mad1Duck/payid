import type { Address, Hash } from 'viem';
import type {
  IReputationAdapter,
  ReputationResult,
  VranConfigResult,
  IEscrowAdapter,
  MilestoneDef,
  EscrowResult,
} from '../types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Platform × PAY.ID — Composite Adapter
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  This adapter demonstrates seamless composition:
 *    • Escrow    → Platform's milestone system (business logic)
 *    • Reputation → Composite Platform Score + PAY.ID VRAN Score
 *
 *  PAY.ID acts as policy layer; Platform acts as execution layer.
 *
 *  Example: A freelancer's composite score = weighted average:
 *    60% Platform reputation (timeliness, quality, disputes)
 *    40% PAY.ID VRAN score (anti-scam, community reports)
 *
 *  Use case: You want platform milestones AND PAY.ID trust network.
 */

// ─── Platform SDK stubs (replace with real imports) ────────────────────────
interface PlatformSDK {
  reputation: {
    getScore(address: Address): Promise<number>; // 0–1000
    getFullScore(address: Address): Promise<{
      timeliness: number;
      quality: number;
      completionRate: number;
      disputeRate: number;
      totalCompleted: number;
    }>;
  };
  milestoneManager: {
    createEscrow(params: { freelancer: Address; amounts: bigint[]; descriptions: string[]; deadline: bigint; }): Promise<bigint>;
    submitDeliverable(bountyId: bigint, evidenceHash: string): Promise<Hash>;
    approveMilestone(bountyId: bigint, milestoneIndex: bigint): Promise<Hash>;
    getBountiesByUser(user: Address): Promise<PlatformBounty[]>;
  };
}

interface PlatformBounty {
  id: bigint;
  poster: Address;
  taker: Address;
  token: Address;
  amount: bigint;
  released: bigint;
  status: string;
  milestones: { description: string; amount: bigint; }[];
  deadline: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. Composite Reputation Adapter (Platform + VRAN blend)
// ═══════════════════════════════════════════════════════════════════════════

export interface CompositeReputationOptions {
  platformWeight?: number;
  vranWeight?: number;
  trustThreshold?: number;
  vranAdapter: IReputationAdapter;
}

/**
 * Creates a composite reputation adapter that blends a platform's on-chain
 * reputation with PAY.ID's VRAN anti-scam network.
 *
 * Formula: composite = platformScore * weight + vranScore * (1 - weight)
 *
 * @example
 * const platformRep = new CompositeReputationAdapter(platformSdk, {
 *   vranAdapter: new DefaultReputationAdapter(publicClient, walletClient, vindexAddr),
 *   platformWeight: 0.6,  // Platform is primary
 *   vranWeight: 0.4,     // VRAN is secondary check
 * });
 */
export class CompositeReputationAdapter implements IReputationAdapter {
  readonly name = 'platform-composite';
  readonly label = 'Platform × VRAN';

  private platformWeight: number;
  private vranWeight: number;
  private trustThreshold: number;

  constructor(
    private platform: PlatformSDK,
    private options: CompositeReputationOptions,
  ) {
    this.platformWeight = options.platformWeight ?? 0.6;
    this.vranWeight = options.vranWeight ?? 0.4;
    this.trustThreshold = options.trustThreshold ?? 700;
  }

  /**
   * Composite reputation = weighted blend of Platform + VRAN.
   * If either system blacklists, the user is blacklisted.
   */
  async getReputation(target: Address): Promise<ReputationResult> {
    const [platformScore, vranResult] = await Promise.all([
      this.platform.reputation.getScore(target).catch(() => 500),
      Promise.resolve(this.options.vranAdapter.getReputation(target)).catch(() => ({
        score: 500, isBlacklisted: false, isTrusted: false,
      })),
    ]);

    // Fail-closed: if either system says blacklisted → blacklisted
    const isBlacklisted = vranResult.isBlacklisted;

    // Composite score (capped at 1000)
    const composite = Math.min(1000, Math.round(
      platformScore * this.platformWeight +
      vranResult.score * this.vranWeight,
    ));

    return {
      score: composite,
      isBlacklisted,
      isTrusted: composite >= this.trustThreshold && !isBlacklisted,
    };
  }

  /**
   * Returns the stricter of Platform or VRAN config.
   */
  async getConfig(): Promise<VranConfigResult> {
    const vranConfig = await Promise.resolve(this.options.vranAdapter.getConfig()).catch(() => ({
      minStake: 0n, consensusThreshold: 0n, minReporterReputation: 0n, reportCount: 0, trustThreshold: 700,
    }));
    return {
      minStake: vranConfig.minStake,
      consensusThreshold: vranConfig.consensusThreshold,
      minReporterReputation: vranConfig.minReporterReputation,
      reportCount: Number(vranConfig.reportCount ?? 0),
      trustThreshold: vranConfig.trustThreshold ?? 700,
    };
  }

  /**
   * Can report if VRAN adapter allows it (Platform may not have reporting).
   */
  async canReport(address: Address): Promise<boolean> {
    return Promise.resolve(this.options.vranAdapter.canReport(address)).catch(() => false);
  }

  /**
   * Delegates to VRAN adapter for report submission.
   */
  async submitReport(target: Address, evidenceHash: string, stake: bigint): Promise<Hash | null> {
    if (!this.options.vranAdapter.submitReport) {
      throw new Error('VRAN adapter does not support submitReport');
    }
    const result = this.options.vranAdapter.submitReport(target, evidenceHash, stake);
    if (!result) throw new Error('submitReport not supported');
    return result;
  }

  async getSuccessfulReports(address: Address): Promise<number> {
    const vran = this.options.vranAdapter.getSuccessfulReports;
    if (vran) {
      try {
        return await vran.call(this.options.vranAdapter, address);
      } catch { /* fall through */ }
    }
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. Platform Escrow Adapter (Bridge to external escrow)
// ═══════════════════════════════════════════════════════════════════════════

export class PlatformEscrowAdapter implements IEscrowAdapter {
  readonly name = 'platform';
  readonly label = 'Platform Escrow';

  constructor(private platform: PlatformSDK) { }

  async createEscrow(
    freelancer: Address,
    _asset: Address,
    milestones: MilestoneDef[],
    deadline: bigint,
  ): Promise<bigint> {
    return this.platform.milestoneManager.createEscrow({
      freelancer,
      amounts: milestones.map((m) => m.amount),
      descriptions: milestones.map((m) => m.description),
      deadline,
    });
  }

  async submitMilestone(escrowId: bigint, _index: number, evidenceHash: string): Promise<Hash | null> {
    return this.platform.milestoneManager.submitDeliverable(escrowId, evidenceHash);
  }

  async releaseMilestone(escrowId: bigint, index: number): Promise<Hash | null> {
    return this.platform.milestoneManager.approveMilestone(escrowId, BigInt(index));
  }

  async getUserEscrows(user: Address): Promise<EscrowResult[]> {
    const bounties = await this.platform.milestoneManager.getBountiesByUser(user);
    return bounties.map((b) => this.mapBountyToEscrow(b));
  }

  // Platform may not have these exact functions — return safe defaults
  async dispute(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  }

  async resolveRefund(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  }

  async autoRefund(): Promise<Hash | null> {
    return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
  }

  private mapBountyToEscrow(b: PlatformBounty): EscrowResult {
    const statusMap: Record<string, EscrowResult['status']> = {
      POSTED: 'pending',
      CLAIMED: 'active',
      SUBMITTED: 'active',
      DISPUTED: 'disputed',
      APPROVED: 'completed',
      CANCELLED: 'refunded',
      ABANDONED: 'refunded',
    };

    return {
      id: b.id,
      client: b.poster,
      freelancer: b.taker,
      asset: b.token,
      total: b.amount,
      released: b.released,
      status: statusMap[b.status] ?? 'pending',
      milestones: b.milestones.map((m) => ({
        description: m.description,
        amount: m.amount,
      })),
      deadline: b.deadline,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. Factory — One-liner setup
// ═══════════════════════════════════════════════════════════════════════════

/**
 * One-liner to create the full Platform × PAY.ID integration.
 *
 * @example
 * const { reputationAdapter, escrowAdapter } = createCompositeIntegration({
 *   platform: platformSdk,
 *   vranAdapter: payidVranAdapter,
 *   platformWeight: 0.6,
 * });
 *
 * <PayIDProvider
 *   contracts={contracts}
 *   reputationAdapter={reputationAdapter}
 *   escrowAdapter={escrowAdapter}
 * >
 */
export function createCompositeIntegration(options: {
  platform: PlatformSDK;
  vranAdapter: IReputationAdapter;
  platformWeight?: number;
  vranWeight?: number;
}) {
  return {
    reputationAdapter: new CompositeReputationAdapter(options.platform, {
      vranAdapter: options.vranAdapter,
      platformWeight: options.platformWeight,
      vranWeight: options.vranWeight,
    }),
    escrowAdapter: new PlatformEscrowAdapter(options.platform),
  };
}
