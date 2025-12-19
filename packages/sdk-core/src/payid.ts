import type { RuleContext, RuleResult, RuleConfig } from "@payid/types";
import { evaluate as evaluatePolicy } from "./evaluate";
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
}
