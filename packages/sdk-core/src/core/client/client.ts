import type { RuleConfig, RuleContext, RuleResult, RuleResultDebug } from "payid-types";
import { evaluate } from "../../evaluate";
import { loadWasm } from "payid-rule-engine";
import { combineRules } from "../../rule/combine";
import { decodeSessionPolicy } from "../../sessionPolicy/decode";
import { ethers } from "ethers";
import { generateDecisionProof } from "../../decision-proof/generate";
import type { DecisionProof } from "../../decision-proof/types";
import type { PayIDSessionPolicyPayloadV1 } from "../../sessionPolicy";
import type { RuleSource } from "../../resolver/types";
import { resolveRule } from "../../resolver/resolver";

function isRuleSource(rule: RuleConfig | RuleSource): rule is RuleSource {
  return typeof rule === "object" && rule !== null && "uri" in rule;
}

export class PayIDClient {
  // Preload promise — WASM mulai di-fetch saat createPayID() dipanggil,
  // bukan saat evaluate() pertama. Hasilnya di-cache di wasm.ts.
  private readonly _ready: Promise<void>;

  constructor(
    private readonly debugTrace?: boolean,
    private readonly wasm?: Uint8Array,
  ) {
    // Kick off WASM load immediately — tidak block constructor
    this._ready = loadWasm(this.wasm).then(() => { }).catch(() => { });
  }

  /**
   * Tunggu sampai WASM siap. Opsional — evaluate() akan menunggu sendiri,
   * tapi bisa di-await eksplisit untuk warmup:
   *
   *   const client = createPayID();
   *   await client.ready(); // WASM pasti sudah loaded setelah ini
   */
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
    sessionPolicy?: PayIDSessionPolicyPayloadV1;
    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;
    signer: ethers.Signer;
    verifyingContract: string;
    ruleAuthority: string;
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

    const evalConfig =
      params.evaluationRule ??
      (params.sessionPolicy
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