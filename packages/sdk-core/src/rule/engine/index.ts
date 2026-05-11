import type { RuleContext, RuleResult } from "../../types";
import { runWasmRule } from "./sandbox";
import { runWasmRule as runTsSandbox } from "./tsSandbox";
export * from "./wasm";
export * from "./sandbox";
export * from "./preprocess";

/**
 * Execute PAY.ID rule engine.
 * Tries WASM first; falls back to pure-TS sandbox if WASM is unavailable or throws.
 */
export async function executeRule(
  context: RuleContext,
  ruleConfig: unknown,
  wasmBinary?: Buffer | Uint8Array,
): Promise<RuleResult> {
  try {
    return await runWasmRule(context, ruleConfig, wasmBinary);
  } catch {
    return runTsSandbox(context, ruleConfig, wasmBinary);
  }
}
