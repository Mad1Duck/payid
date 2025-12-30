import type {
  RuleContext,
  RuleResult,
  RuleConfig,
  RuleTraceEntry
} from "payid-types";
import type { RuleSource } from "../resolver/types";
import type { UserOperation } from "../erc4337/types";
import type { ethers } from "ethers";

export interface PayIDClient {
  evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult>;
}

export interface PayIDServer {
  evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig,       // rule berdaulat (on-chain)
    evaluationRule?: RuleConfig,        // rule evaluasi (off-chain)

    payId: string;
    payer: string;
    receiver: string;

    asset: string;
    amount: bigint;

    signer: ethers.Signer;
    verifyingContract: string;
    ruleRegistryContract: string;
    ttlSeconds?: number;
  }): Promise<{
    result: RuleResult;
    proof: any | null;
  }>;

  buildUserOperation(params: {
    proof: any;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
  }): UserOperation;
}
export interface RuleResultDebug extends RuleResult {
  debug: {
    trace: RuleTraceEntry[];
  };
}
