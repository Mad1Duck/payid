import type { Address, Hash, Abi } from 'viem';
import { decodeEventLog } from 'viem';
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
 *  PAY.ID Default Adapters
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * These adapters wrap the native PAY.ID contracts:
 *   • VindexRegistry.sol  → DefaultReputationAdapter
 *   • EscrowMilestone.sol → DefaultEscrowAdapter
 *
 * They are used automatically when no custom adapter is injected.
 */

// ─── Minimal ABIs ────────────────────────────────────────────────────────

const VindexRegistryAbi = [
  { type: 'function', name: 'getReputation', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint16' }], stateMutability: 'view' },
  { type: 'function', name: 'isBlacklisted', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'isTrusted', inputs: [{ type: 'address' }, { type: 'uint16' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'minStake', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'consensusThreshold', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'minReporterReputation', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'canReport', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'submitReport', inputs: [{ name: 'target', type: 'address' }, { name: 'evidenceHash', type: 'string' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'confirmReport', inputs: [{ name: 'reportId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'reports', inputs: [{ type: 'uint256' }], outputs: [{ name: 'target', type: 'address' }, { name: 'reporter', type: 'address' }, { name: 'evidenceHash', type: 'string' }, { name: 'stake', type: 'uint256' }, { name: 'confirmations', type: 'uint16' }, { name: 'resolved', type: 'bool' }, { name: 'valid', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'successfulReports', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'reportCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

const EscrowMilestoneAbi = [
  { type: 'function', name: 'createEscrow', inputs: [{ name: 'freelancer', type: 'address' }, { name: 'asset', type: 'address' }, { name: 'amounts', type: 'uint256[]' }, { name: 'descriptions', type: 'string[]' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'escrowId', type: 'uint256' }], stateMutability: 'payable' },
  { type: 'function', name: 'submitMilestone', inputs: [{ name: 'escrowId', type: 'uint256' }, { name: 'index', type: 'uint256' }, { name: 'evidenceHash', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'releaseMilestone', inputs: [{ name: 'escrowId', type: 'uint256' }, { name: 'index', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'dispute', inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'resolveRefund', inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'autoRefund', inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'escrows', inputs: [{ type: 'uint256' }], outputs: [{ name: 'client', type: 'address' }, { name: 'freelancer', type: 'address' }, { name: 'asset', type: 'address' }, { name: 'total', type: 'uint256' }, { name: 'released', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'deadline', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'nextEscrowId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'EscrowCreated', inputs: [{ name: 'escrowId', type: 'uint256', indexed: true }, { name: 'client', type: 'address', indexed: true }, { name: 'freelancer', type: 'address', indexed: true }, { name: 'total', type: 'uint256', indexed: false }], anonymous: false },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
//  Default Reputation Adapter (VindexRegistry)
// ═══════════════════════════════════════════════════════════════════════════

export class DefaultReputationAdapter implements IReputationAdapter {
  readonly name = 'vindex';
  readonly label = 'VRAN';

  constructor(
    private publicClient: any,     // viem PublicClient
    private walletClient: any,     // viem WalletClient
    private registryAddress: Address,
    readonly trustThreshold = 700,
  ) { }

  async getReputation(target: Address): Promise<ReputationResult> {
    const [score, isBlacklisted] = await Promise.all([
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: VindexRegistryAbi,
        functionName: 'getReputation',
        args: [target],
      }) as Promise<number>,
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: VindexRegistryAbi,
        functionName: 'isBlacklisted',
        args: [target],
      }) as Promise<boolean>,
    ]);

    const isTrusted = score >= this.trustThreshold && !isBlacklisted;
    return { score, isBlacklisted, isTrusted };
  }

  async getConfig(): Promise<VranConfigResult> {
    const [minStake, consensusThreshold, minReporterReputation, reportCount] = await Promise.all([
      this.publicClient.readContract({ address: this.registryAddress, abi: VindexRegistryAbi, functionName: 'minStake' }) as Promise<bigint>,
      this.publicClient.readContract({ address: this.registryAddress, abi: VindexRegistryAbi, functionName: 'consensusThreshold' }) as Promise<bigint>,
      this.publicClient.readContract({ address: this.registryAddress, abi: VindexRegistryAbi, functionName: 'minReporterReputation' }) as Promise<bigint>,
      this.publicClient.readContract({ address: this.registryAddress, abi: VindexRegistryAbi, functionName: 'reportCount' }) as Promise<bigint>,
    ]);
    return { minStake, consensusThreshold, minReporterReputation, reportCount: Number(reportCount), trustThreshold: this.trustThreshold };
  }

  async canReport(address: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.registryAddress,
      abi: VindexRegistryAbi,
      functionName: 'canReport',
      args: [address],
    }) as Promise<boolean>;
  }

  async submitReport(target: Address, evidenceHash: string, stake: bigint): Promise<Hash> {
    const hash = await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: VindexRegistryAbi,
      functionName: 'submitReport',
      args: [target, evidenceHash],
      value: stake,
    });
    return hash;
  }

  async confirmReport(reportId: bigint): Promise<Hash> {
    return this.walletClient.writeContract({
      address: this.registryAddress,
      abi: VindexRegistryAbi,
      functionName: 'confirmReport',
      args: [reportId],
    });
  }

  async getReport(reportId: bigint): Promise<ReportResult | null> {
    try {
      const r = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: VindexRegistryAbi,
        functionName: 'reports',
        args: [reportId],
      }) as [Address, Address, string, bigint, number, boolean, boolean];
      return {
        target: r[0],
        reporter: r[1],
        evidenceHash: r[2],
        stake: r[3],
        confirmations: r[4],
        resolved: r[5],
        valid: r[6],
      };
    } catch {
      return null;
    }
  }

  async getSuccessfulReports(address: Address): Promise<number> {
    const count = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: VindexRegistryAbi,
      functionName: 'successfulReports',
      args: [address],
    }) as bigint;
    return Number(count);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Default Escrow Adapter (EscrowMilestone)
// ═══════════════════════════════════════════════════════════════════════════

export class DefaultEscrowAdapter implements IEscrowAdapter {
  readonly name = 'escrow';
  readonly label = 'Escrow';

  constructor(
    private publicClient: any,
    private walletClient: any,
    private escrowAddress: Address,
  ) { }

  async createEscrow(
    freelancer: Address,
    asset: Address,
    milestones: MilestoneDef[],
    deadline: bigint,
    value?: bigint,
  ): Promise<bigint> {
    const amounts = milestones.map(m => m.amount);
    const descriptions = milestones.map(m => m.description);

    const hash = await this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'createEscrow',
      args: [freelancer, asset, amounts, descriptions, deadline],
      value,
    });
    // Wait for receipt and extract escrowId from EscrowCreated event
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: EscrowMilestoneAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'EscrowCreated') {
          return (decoded.args as any).escrowId as bigint;
        }
      } catch {
        continue;
      }
    }
    throw new Error('[DefaultEscrowAdapter] EscrowCreated event not found in transaction receipt');
  }

  async submitMilestone(escrowId: bigint, index: number, evidenceHash: string): Promise<Hash | null> {
    return this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'submitMilestone',
      args: [escrowId, BigInt(index), evidenceHash as Hash],
    });
  }

  async releaseMilestone(escrowId: bigint, index: number): Promise<Hash | null> {
    return this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'releaseMilestone',
      args: [escrowId, BigInt(index)],
    });
  }

  async dispute(escrowId: bigint): Promise<Hash | null> {
    return this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'dispute',
      args: [escrowId],
    });
  }

  async resolveRefund(escrowId: bigint): Promise<Hash | null> {
    return this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'resolveRefund',
      args: [escrowId],
    });
  }

  async autoRefund(escrowId: bigint): Promise<Hash | null> {
    return this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'autoRefund',
      args: [escrowId],
    });
  }

  async getUserEscrows(user: Address): Promise<EscrowResult[]> {
    const nextId = await this.publicClient.readContract({
      address: this.escrowAddress,
      abi: EscrowMilestoneAbi,
      functionName: 'nextEscrowId',
    }) as bigint;

    const results: EscrowResult[] = [];
    const statusMap = ['pending', 'active', 'disputed', 'completed', 'refunded'] as const;

    // Batch all escrows() calls into a single multicall RPC request
    const multicallResults = await this.publicClient.multicall({
      contracts: Array.from({ length: Number(nextId) }, (_, i) => ({
        address: this.escrowAddress,
        abi: EscrowMilestoneAbi,
        functionName: 'escrows',
        args: [BigInt(i)],
      })),
    });

    for (let i = 0; i < multicallResults.length; i++) {
      const call = multicallResults[i];
      if (call.status !== 'success') continue;
      const e = call.result as unknown as readonly [Address, Address, Address, bigint, bigint, number, bigint, bigint];

      const client = e[0];
      const freelancer = e[1];
      if (client.toLowerCase() !== user.toLowerCase() && freelancer.toLowerCase() !== user.toLowerCase()) continue;

      results.push({
        id: BigInt(i),
        client,
        freelancer,
        asset: e[2],
        total: e[3],
        released: e[4],
        status: statusMap[e[5]] ?? 'pending',
        milestones: [], // Would need additional calls
        deadline: e[7],
      });
    }
    return results;
  }
}
