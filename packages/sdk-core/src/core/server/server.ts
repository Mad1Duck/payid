import type { ethers } from "ethers";
import type { RuleConfig, RuleContext, RuleResult } from "payid-types";
import type { DecisionProof } from "../../decision-proof/types";
import { evaluate } from "../../evaluate";
import { generateDecisionProof } from "../../decision-proof/generate";
import type { RuleSource } from "../../resolver/types";
import { resolveRule } from "../../resolver/resolver";

function isRuleSource(
  rule: RuleConfig | RuleSource
): rule is RuleSource {
  return (
    typeof rule === "object" &&
    rule !== null &&
    "uri" in rule
  );
}

// payid/server.ts
export class PayIDServer {
  constructor(
    private readonly wasm: Uint8Array,
    private readonly signer: ethers.Signer,
    private readonly trustedIssuers?: Set<string>,
    private readonly debugTrace?: boolean,
  ) { }

  async evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig;
    evaluationRule?: RuleConfig;

    payId: string;
    payer: string;
    receiver: string;

    asset: string;
    amount: bigint;

    ruleRegistryContract: string;
    verifyingContract: string;
    ttlSeconds?: number;
  }): Promise<{
    result: RuleResult;
    proof: DecisionProof | null;
  }> {

    const authorityConfig = isRuleSource(params.authorityRule)
      ? (await resolveRule(params.authorityRule)).config
      : params.authorityRule;

    const evalConfig = params.evaluationRule ?? authorityConfig;

    const result = await evaluate(
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
      ruleConfig: params.authorityRule,
      signer: this.signer,
      verifyingContract: params.verifyingContract,
      ruleRegistryContract: params.ruleRegistryContract,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }
}
