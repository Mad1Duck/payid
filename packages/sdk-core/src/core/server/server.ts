import type { ethers } from "ethers";
import type { RuleConfig, RuleContext, RuleResult } from "payid-types";
import type { DecisionProof } from "../../decision-proof/types";
import type { UserOperation } from "../../erc4337/types";
import { evaluate } from "../../evaluate";
import { generateDecisionProof } from "../../decision-proof/generate";
import { buildPayERC20CallData } from "../../erc4337/build";
import { buildUserOperation } from "../../erc4337/userop";
import type { RuleSource } from "../../resolver/types";
import { resolveRule } from "../../resolver/resolver";

function isRuleSource(rule: RuleConfig | RuleSource): rule is RuleSource {
  return typeof rule === "object" && rule !== null && "uri" in rule;
}

/**
 * @class PayIDServer
 * @description Server-side PayID engine.
 *
 * Digunakan ketika butuh:
 * - Context V2 (env, state, oracle, risk) dengan trusted issuers
 * - Build ERC-4337 UserOperation untuk bundler
 *
 * Signer di-inject saat construct — jangan pakai ini di browser.
 *
 * @example
 * ```ts
 * // Server/bundler side
 * const server = new PayIDServer(wasmBinary, serverSigner, trustedIssuers)
 *
 * const { result, proof } = await server.evaluateAndProve({
 *   context: contextV2,    // ← Context V2 dengan attestations
 *   authorityRule,
 *   payId: "pay.id/merchant",
 *   payer: "0xPAYER",
 *   receiver: "0xRECEIVER",
 *   asset: USDT_ADDRESS,
 *   amount: parseUnits("100", 6),
 *   verifyingContract: PAYID_VERIFIER_ADDRESS,
 *   ruleAuthority: RULE_AUTHORITY_ADDRESS,
 * })
 * ```
 */
export class PayIDServer {
  constructor(
    private readonly wasm: Uint8Array,
    private readonly signer: ethers.Signer,
    private readonly trustedIssuers?: Set<string>,
    private readonly debugTrace?: boolean,
  ) { }

  /**
   * Evaluate + generate proof dengan signer dari constructor
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
      ruleConfig: authorityConfig,
      signer: this.signer,
      verifyingContract: params.verifyingContract,
      ruleAuthority: params.ruleAuthority,
      chainId: (params.context as any)?.tx?.chainId,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }

  /**
   * Build ERC-4337 UserOperation dari Decision Proof
   * Untuk bundler/relayer — server only
   */
  buildUserOperation(params: {
    proof: DecisionProof;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
    attestationUIDs?: string[];
  }): UserOperation {
    const callData = buildPayERC20CallData(
      params.targetContract,
      params.proof,
      params.attestationUIDs ?? []
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