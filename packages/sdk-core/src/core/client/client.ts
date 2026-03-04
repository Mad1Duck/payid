// src/core/client/client.ts
import type { RuleConfig, RuleContext, RuleResult, RuleResultDebug } from "payid-types";
import { evaluate } from "../../evaluate";
import { loadWasm } from "payid-rule-engine";
import { combineRules } from "../../rule/combine";
import { decodeSessionPolicy, decodeSessionPolicyV2 } from "../../sessionPolicy/decode";
import { ethers } from "ethers";
import { generateDecisionProof } from "../../decision-proof/generate";
import type { DecisionProof } from "../../decision-proof/types";
import type { PayIDSessionPolicyPayloadV1 } from "../../sessionPolicy";
import type { SessionPolicyV2 } from "../../sessionPolicy/types";
import type { RuleSource } from "../../resolver/types";
import { resolveRule } from "../../resolver/resolver";

function isRuleSource(rule: RuleConfig | RuleSource): rule is RuleSource {
  return typeof rule === "object" && rule !== null && "uri" in rule;
}

export class PayIDClient {
  private readonly _ready: Promise<void>;

  constructor(
    private readonly debugTrace?: boolean,
    private readonly wasm?: Uint8Array,
  ) {
    this._ready = loadWasm(this.wasm).then(() => { }).catch(() => { });
  }

  async ready(): Promise<void> {
    return this._ready;
  }

  async evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult> {
    const config = isRuleSource(rule)
      ? (await resolveRule(rule)).config
      : rule;
    return evaluate(context, config, { debug: this.debugTrace }, this.wasm);
  }

  async evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig | RuleSource;
    evaluationRule?: RuleConfig;

    // V1 legacy session policy
    sessionPolicy?: PayIDSessionPolicyPayloadV1;
    // V2 Channel A session policy
    sessionPolicyV2?: SessionPolicyV2;

    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;
    signer: ethers.Signer;
    verifyingContract: string;
    ruleAuthority: string;
    ruleSetHashOverride?: string;
    ttlSeconds?: number;
    chainId: number;
    blockTimestamp: number;
  }): Promise<{
    result: RuleResult;
    proof: DecisionProof | null;
  }> {
    const authorityConfig = isRuleSource(params.authorityRule)
      ? (await resolveRule(params.authorityRule)).config
      : params.authorityRule;

    // Determine rule config to evaluate against:
    //   evaluationRule     → explicit override, use as-is
    //   sessionPolicyV2    → verify EIP-712 signature, then use chain rule (no injection)
    //   sessionPolicy (V1) → legacy, combine chain rule + policy inline rule
    //   (none)             → use authority rule directly
    const evalConfig =
      params.evaluationRule ??
      (params.sessionPolicyV2
        ? (() => {
          // Throws if expired or signature invalid
          decodeSessionPolicyV2(params.sessionPolicyV2!, params.blockTimestamp);
          // V2 does NOT inject new rules — rule is already committed on-chain via ruleSetHash
          return authorityConfig;
        })()
        : params.sessionPolicy
          ? combineRules(
            authorityConfig,
            decodeSessionPolicy(
              params.sessionPolicy,
              Math.floor(Date.now() / 1000)
            ).rules
          )
          : authorityConfig);

    const result = await evaluate(
      params.context,
      evalConfig,
      { debug: this.debugTrace },
      this.wasm,
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
      ruleSetHashOverride: params.ruleSetHashOverride,
      signer: params.signer,
      verifyingContract: params.verifyingContract,
      ruleAuthority: params.ruleAuthority,
      chainId: params.chainId ?? (params.context as any)?.tx?.chainId,
      ttlSeconds: params.ttlSeconds,
      blockTimestamp: params.blockTimestamp,
    });

    return { result, proof };
  }
}
