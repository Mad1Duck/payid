import type { RuleContext, RuleResult, RuleConfig } from "@payid/types";
import { evaluate as evaluatePolicy } from "./evaluate";
import { generateDecisionProof } from "./decision-proof/generate";
import { resolveRule } from "./resolver/resolver";
import type { RuleSource } from "./resolver/types";
import { ethers } from "ethers";
import fs from "fs";
import type { UserOperation } from "./erc4337/types";
import { buildPayCallData } from "./erc4337/build";
import { buildUserOperation } from "./erc4337/userop";

export class PayID {
  private wasm: Buffer;

  constructor(wasmPath: string) {
    this.wasm = fs.readFileSync(wasmPath);
  }

  async evaluate(
    context: RuleContext,
    ruleConfig: RuleConfig
  ): Promise<RuleResult> {
    return evaluatePolicy(this.wasm, context, ruleConfig);
  }


  async evaluateAndProve(params: {
    context: RuleContext;
    ruleConfig: RuleConfig;
    payId: string;
    owner: string;
    signer: ethers.Signer;
    chainId: number;
    verifyingContract: string;
    ttlSeconds?: number;
  }) {
    const result = await this.evaluate(params.context, params.ruleConfig);

    const proof = await generateDecisionProof({
      payId: params.payId,
      owner: params.owner,
      decision: result.decision,
      context: params.context,
      ruleConfig: params.ruleConfig,
      signer: params.signer,
      chainId: params.chainId,
      verifyingContract: params.verifyingContract,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }

  async evaluateWithRuleSource(
    context: RuleContext,
    ruleSource: RuleSource
  ): Promise<RuleResult> {
    try {
      const { config } = await resolveRule(ruleSource);
      return await this.evaluate(context, config);
    } catch (err: any) {
      return {
        decision: "REJECT",
        code: "RULE_RESOLVE_ERROR",
        reason: err?.message ?? "failed to resolve rule"
      };
    }
  }

  async evaluateAndProveFromSource(params: {
    context: RuleContext;
    ruleSource: RuleSource;
    payId: string;
    owner: string;
    signer: ethers.Signer;
    chainId: number;
    verifyingContract: string;
    ttlSeconds?: number;
  }) {
    try {
      const { config } = await resolveRule(params.ruleSource);

      const result = await this.evaluate(params.context, config);

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
    } catch (err: any) {
      return {
        result: {
          decision: "REJECT",
          code: "RULE_RESOLVE_ERROR",
          reason: err?.message ?? "rule resolve failed"
        },
        proof: null
      };
    }
  }

  async evaluateProveAndBuildUserOp(params: {
    context: RuleContext;
    ruleSource: { uri: string; hash?: string; };
    payId: string;
    owner: string;
    signer: ethers.Signer;

    // ERC-4337 specific
    smartAccount: string;
    targetContract: string;
    nonce: string;
    gas: {
      callGasLimit: string;
      verificationGasLimit: string;
      preVerificationGas: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    };
    paymasterAndData?: string;

    chainId: number;
    verifyingContract: string;
  }): Promise<{
    result: RuleResult;
    userOp: UserOperation | null;
    proof: any;
  }> {
    const { result, proof } =
      await this.evaluateAndProveFromSource({
        context: params.context,
        ruleSource: params.ruleSource,
        payId: params.payId,
        owner: params.owner,
        signer: params.signer,
        chainId: params.chainId,
        verifyingContract: params.verifyingContract
      });

    if (result.decision !== "ALLOW" || !proof) {
      return { result: (result as any), userOp: null, proof };
    }

    const callData = buildPayCallData(
      params.targetContract,
      proof
    );

    const userOp = buildUserOperation({
      sender: params.smartAccount,
      nonce: params.nonce,
      callData,
      gas: params.gas,
      paymasterAndData: params.paymasterAndData
    });

    return { result, userOp, proof };
  }
}
