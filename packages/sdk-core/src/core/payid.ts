import type {
  RuleContext,
  RuleResult,
  RuleConfig
} from "payid-types";

import { evaluate as evaluatePolicy } from "../evaluate";
import { resolveRule } from "../resolver/resolver";
import { generateDecisionProof } from "../decision-proof/generate";
import { buildPayCallData } from "../erc4337/build";
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

export class PayID implements PayIDClient, PayIDServer {
  constructor(private readonly wasm: Uint8Array) { }

  // ========= CLIENT =========
  async evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult> {
    const config = isRuleSource(rule)
      ? (await resolveRule(rule)).config
      : rule;

    return evaluatePolicy(this.wasm, context, config);
  }

  // ========= SERVER =========
  async evaluateAndProve(params: {
    context: RuleContext;
    rule: RuleConfig | RuleSource;
    payId: string;
    owner: string;
    signer: ethers.Signer;
    chainId: number;
    verifyingContract: string;
    ttlSeconds?: number;
  }): Promise<{ result: RuleResult; proof: any | null; }> {
    const config = isRuleSource(params.rule)
      ? (await resolveRule(params.rule)).config
      : params.rule;

    const result = await evaluatePolicy(
      this.wasm,
      params.context,
      config
    );

    if (result.decision !== "ALLOW") {
      return { result, proof: null };
    }

    const proof = await generateDecisionProof({
      payId: params.payId,
      owner: params.owner,
      decision: result.decision,
      context: params.context,
      ruleConfig: config,
      signer: params.signer,
      chainId: params.chainId,
      verifyingContract: params.verifyingContract,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }

  buildUserOperation(params: {
    proof: any;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
  }) {
    // browser guard TANPA window
    if (
      typeof globalThis !== "undefined" &&
      "document" in globalThis
    ) {
      throw new Error(
        "buildUserOperation must not be called in browser"
      );
    }

    const callData = buildPayCallData(
      params.targetContract,
      params.proof
    );

    return buildUserOperation({
      sender: params.smartAccount,
      nonce: params.nonce,
      callData,
      gas: params.gas,
      paymasterAndData: params.paymasterAndData
    });
  }
}
