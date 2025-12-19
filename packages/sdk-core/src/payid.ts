import type { RuleContext, RuleResult, RuleConfig } from "@payid/types";
import { evaluate as evaluatePolicy } from "./evaluate";
import { generateDecisionProof } from "./decision-proof/generate";
import { ethers } from "ethers";
import fs from "fs";

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
}
