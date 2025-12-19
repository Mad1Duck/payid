import type { RuleContext, RuleResult } from "@payid/types";
import { runWasmRule } from "./sandbox";
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
  wasmBinary: Buffer,
  context: RuleContext,
  ruleConfig: unknown
): Promise<RuleResult> {
  return runWasmRule(wasmBinary, context, ruleConfig);
}
