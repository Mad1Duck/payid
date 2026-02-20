import type {
  RuleContext,
  RuleResult,
  RuleConfig,
  RuleTraceEntry
} from "payid-types";
import type { RuleSource } from "../resolver/types";
import type { UserOperation } from "../erc4337/types";
import type { ethers } from "ethers";

// ─────────────────────────────────────────────
// CLIENT — safe untuk browser / mobile / edge
// Tidak butuh server, tidak butuh issuer wallet
// ─────────────────────────────────────────────
export interface PayIDClient {
  /**
   * Pure rule evaluation — client-safe, no signing
   */
  evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult>;

  /**
   * Evaluate + generate EIP-712 Decision Proof
   * Client sign sendiri pakai wallet mereka
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

    signer: ethers.Signer;
    verifyingContract: string;
    ruleAuthority: string;
    ttlSeconds?: number;
  }): Promise<{
    result: RuleResult;
    proof: any | null;
  }>;
}

// ─────────────────────────────────────────────
// SERVER — butuh issuer wallet di constructor
// Untuk Context V2 (env, state, oracle, risk)
// ─────────────────────────────────────────────
export interface PayIDServer {
  /**
   * Evaluate + generate proof dengan trusted issuers
   * Signer sudah di-inject saat construct PayIDServer
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
  }): Promise<{
    result: RuleResult;
    proof: any | null;
  }>;

  /**
   * Build ERC-4337 UserOperation dari Decision Proof
   * Server/bundler only
   */
  buildUserOperation(params: {
    proof: any;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
    attestationUIDs?: string[];
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