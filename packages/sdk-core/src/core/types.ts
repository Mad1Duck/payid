import type {
  RuleContext,
  RuleResult,
  RuleConfig,
  RuleTraceEntry
} from "../types";
import type { RuleSource } from "../resolver/types";
import type { UserOperation } from "../erc4337/types";
import type { DecisionProof } from "../decision-proof/types";
import type { SessionPolicyV2 } from "../sessionPolicy/types";
import type { ethers } from "ethers";

// ─────────────────────────────────────────────
// CLIENT — safe untuk browser / mobile / edge
// Signer diinjeksikan per-call dari wallet user.
// ─────────────────────────────────────────────
export interface PayIDClient {
  /**
   * Pure rule evaluation — no signing, client-safe.
   */
  evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult>;

  /**
   * Evaluate rule + generate EIP-712 Decision Proof.
   * Signer (wallet) diinjeksikan per-call — cocok untuk browser.
   */
  evaluateAndProve(params: {
    context: RuleContext;

    /** Rule yang diambil dari chain (authority rule). */
    authorityRule: RuleConfig | RuleSource;

    /** Override rule yang dipakai untuk evaluasi (opsional). */
    evaluationRule?: RuleConfig;

    /** Session policy V2 (Channel A — receiver sign constraints). */
    sessionPolicyV2?: SessionPolicyV2;

    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;

    /** Wallet yang menandatangani proof. */
    signer: ethers.Signer;

    verifyingContract: string;
    ruleAuthority: string;

    /** Override ruleSetHash di proof (untuk combined rules). */
    ruleSetHashOverride?: string;

    ttlSeconds?: number;
    chainId: number;
    blockTimestamp: number;

    /** EAS attestation UIDs untuk attestation-gated payments. */
    attestationUIDs?: string[];
  }): Promise<{
    result: RuleResult;
    proof: DecisionProof | null;
  }>;
}

// ─────────────────────────────────────────────
// SERVER — signer di-inject saat konstruksi.
// Cocok untuk backend, bundler, relayer.
// Mendukung Context V2 dengan trusted issuers.
// ─────────────────────────────────────────────
export interface PayIDServer {
  /**
   * Evaluate rule + generate proof.
   * Signer sudah di-inject di constructor — tidak ada signer per-call.
   */
  evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig | RuleSource;
    evaluationRule?: RuleConfig;

    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;

    verifyingContract: string;
    ruleAuthority: string;
    ttlSeconds?: number;
    chainId: number;
    blockTimestamp: number;
    attestationUIDs?: string[];
  }): Promise<{
    result: RuleResult;
    proof: DecisionProof | null;
  }>;

  /**
   * Build ERC-4337 UserOperation dari Decision Proof.
   * Dipakai oleh bundler/relayer untuk kirim transaksi.
   */
  buildUserOperation(params: {
    proof: DecisionProof;
    smartAccount: string;
    nonce: string;
    gas: {
      callGasLimit: string;
      verificationGasLimit: string;
      preVerificationGas: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    };
    targetContract: string;
    paymasterAndData?: string;
    attestationUIDs?: string[];
    paymentType?: "eth" | "erc20";
  }): UserOperation;
}

export interface RuleResultDebug extends RuleResult {
  debug: {
    trace: RuleTraceEntry[];
  };
}

export interface ClientIntentProof {
  type: "CLIENT_INTENT_PROOF";
  contextHash: string;
  ruleHash: string;
  signer: string;
  signature: string;
}