// payid/client.ts
import type { RuleConfig, RuleContext, RuleResult, RuleResultDebug } from "payid-types";
import { evaluate } from "../../evaluate";
import { combineRules } from "../../rule/combine";
import { decodeSessionPolicy } from "../../sessionPolicy/decode";
import { ethers } from "ethers";
import { generateDecisionProof } from "../../decision-proof/generate";
import type { DecisionProof } from "../../decision-proof/types";
import type { PayIDSessionPolicyPayloadV1 } from "../../sessionPolicy";
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

export class PayIDClient {
  constructor(
    private readonly wasm: Uint8Array,
    private readonly debugTrace?: boolean,
  ) { }

  async evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig;
    evaluationRule?: RuleConfig;
    sessionPolicy?: PayIDSessionPolicyPayloadV1;

    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;

    signer: ethers.Signer;
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

    const evalConfig =
      params.evaluationRule ??
      (params.sessionPolicy
        ? combineRules(
          params.authorityRule,
          decodeSessionPolicy(
            params.sessionPolicy,
            Math.floor(Date.now() / 1000)
          ).rules
        )
        : params.authorityRule);

    const result = await evaluate(
      this.wasm,
      params.context,
      evalConfig,
      { debug: this.debugTrace }
    ) as RuleResultDebug;

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
      ruleRegistryContract: params.ruleRegistryContract,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }
}
