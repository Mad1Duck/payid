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

function isRuleSource(rule: RuleConfig | RuleSource): rule is RuleSource {
  return typeof rule === "object" && rule !== null && "uri" in rule;
}

/**
 * @class PayIDClient
 * @description Client-side PayID engine.
 *
 * Fully serverless — aman dipakai di browser, mobile, edge.
 * Tidak butuh issuer wallet, tidak butuh server.
 *
 * Untuk attestation, gunakan EAS UIDs yang di-fetch via `eas.EASClient`.
 *
 * @example
 * ```ts
 * const client = new PayIDClient(wasmBinary)
 *
 * // 1. Evaluate rule
 * const result = await client.evaluate(context, ruleConfig)
 *
 * // 2. Evaluate + generate proof (payer sign sendiri)
 * const { result, proof } = await client.evaluateAndProve({
 *   context,
 *   authorityRule: ruleConfig,
 *   payId: "pay.id/merchant",
 *   payer: await signer.getAddress(),
 *   receiver: "0xRECEIVER",
 *   asset: USDT_ADDRESS,
 *   amount: parseUnits("100", 6),
 *   signer,
 *   verifyingContract: PAYID_VERIFIER_ADDRESS,
 *   ruleAuthority: RULE_AUTHORITY_ADDRESS,
 * })
 * ```
 */
export class PayIDClient {
  constructor(
    private readonly wasm: Uint8Array,
    private readonly debugTrace?: boolean,
  ) { }

  /**
   * Pure rule evaluation — client-safe, no signing, no server
   */
  async evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult> {
    const config = isRuleSource(rule)
      ? (await resolveRule(rule)).config
      : rule;

    return evaluate(this.wasm, context, config, { debug: this.debugTrace });
  }

  /**
   * Evaluate + generate EIP-712 Decision Proof.
   * Payer sign sendiri menggunakan wallet mereka — tidak butuh server.
   */
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
  }): Promise<{
    result: RuleResult;
    proof: DecisionProof | null;
  }> {
    const authorityConfig = isRuleSource(params.authorityRule)
      ? (await resolveRule(params.authorityRule)).config
      : params.authorityRule;

    // Menentukan rule untuk evaluasi:
    // 1. evaluationRule jika ada (explicit override)
    // 2. sessionPolicy jika ada (QR / ephemeral)
    // 3. authorityRule (default)
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
      ruleAuthority: params.ruleAuthority,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }
}