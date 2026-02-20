import type {
  RuleContext,
  RuleResult,
  RuleConfig
} from "payid-types";

import { evaluate as evaluatePolicy } from "../evaluate";
import { resolveRule } from "../resolver/resolver";
import { generateDecisionProof } from "../decision-proof/generate";
import { buildPayETHCallData, buildPayERC20CallData } from "../erc4337/build";
import { buildUserOperation } from "../erc4337/userop";

import type { RuleSource } from "../resolver/types";
import type { PayIDClient, PayIDServer } from "./types";
import type { ethers } from "ethers";

function isRuleSource(
  rule: RuleConfig | RuleSource
): rule is RuleSource {
  return (
    typeof rule === "object" &&
    rule !== null &&
    "uri" in rule
  );
}

/**
 * @class PayID
 * @description Unified PayID engine — implements both PayIDClient and PayIDServer.
 *
 * Gunakan ini kalau mau satu instance yang bisa semua.
 * Untuk separation yang lebih bersih, gunakan PayIDClient atau PayIDServer langsung.
 */
export class PayID implements PayIDClient, PayIDServer {
  constructor(
    private readonly wasm: Uint8Array,
    private readonly debugTrace?: boolean,
    private readonly trustedIssuers?: Set<string>,
  ) { }

  /**
   * Pure evaluation — client-safe
   */
  async evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult> {
    const config = isRuleSource(rule)
      ? (await resolveRule(rule)).config
      : rule;

    return evaluatePolicy(this.wasm, context, config, {
      debug: this.debugTrace,
      trustedIssuers: this.trustedIssuers
    });
  }

  /**
   * Evaluate + generate Decision Proof
   * FIX: parameter rename ruleRegistryContract → ruleAuthority
   */
  async evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig | RuleSource;
    evaluationRule?: RuleConfig;

    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;

    signer: ethers.Signer;
    ttlSeconds?: number;
    verifyingContract: string;
    ruleAuthority: string;    // FIX: was "ruleRegistryContract"
  }): Promise<{ result: RuleResult; proof: any | null; }> {
    const authorityConfig = isRuleSource(params.authorityRule)
      ? (await resolveRule(params.authorityRule)).config
      : params.authorityRule;

    const evalConfig = params.evaluationRule ?? authorityConfig;

    const result = await evaluatePolicy(
      this.wasm,
      params.context,
      evalConfig,
      {
        debug: this.debugTrace,
        trustedIssuers: this.trustedIssuers
      }
    );

    if (result.decision !== "ALLOW") {
      return { result, proof: null };
    }

    const proof = await generateDecisionProof({
      payId: params.payId,
      payer: params.payer,
      receiver: params.receiver,
      asset: params.asset,
      amount: params.amount,
      context: params.context,
      ruleConfig: authorityConfig,
      signer: params.signer,
      verifyingContract: params.verifyingContract,
      ruleAuthority: params.ruleAuthority,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }

  /**
   * Build ERC-4337 UserOperation
   */
  buildUserOperation(params: {
    proof: any;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
    attestationUIDs?: string[];
    paymentType?: "eth" | "erc20";
  }) {
    const attestationUIDs = params.attestationUIDs ?? [];
    const isETH = params.paymentType === "eth";

    const callData = isETH
      ? buildPayETHCallData(params.targetContract, params.proof, attestationUIDs)
      : buildPayERC20CallData(params.targetContract, params.proof, attestationUIDs);

    return buildUserOperation({
      sender: params.smartAccount,
      nonce: params.nonce,
      callData,
      gas: params.gas,
      paymasterAndData: params.paymasterAndData
    });
  }
}