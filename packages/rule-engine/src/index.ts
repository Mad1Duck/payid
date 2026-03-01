import type { RuleContext, RuleResult } from "payid-types";
import { runWasmRule } from "./sandbox";
export * from "./wasm";
export * from "./sandbox";
export * from "./preprocess";

/**
 * Execute PAY.ID WASM rule engine.
 *
 * @param wasmBinary Compiled WASM binary
 * @param context    Rule execution context
 * @param ruleConfig Rule configuration JSON
 *
 * @returns RuleResult (ALLOW / REJECT)
 */
export async function executeRule(
  context: RuleContext,
  ruleConfig: unknown,
  wasmBinary: Buffer,
): Promise<RuleResult> {
  return runWasmRule(context, ruleConfig, wasmBinary,);
}
