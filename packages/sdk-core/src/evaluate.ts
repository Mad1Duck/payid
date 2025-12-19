import type { RuleContext, RuleResult, RuleConfig } from "@payid/types";
import { executeRule } from "@payid/rule-engine";
import { normalizeContext } from "./normalize";

export async function evaluate(
  wasmBinary: Buffer,
  context: RuleContext,
  ruleConfig: RuleConfig
): Promise<RuleResult> {
  if (!context || typeof context !== "object") {
    throw new Error("evaluate(): context is required");
  }

  if (!context.tx) {
    throw new Error("evaluate(): context.tx is required");
  }

  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error("evaluate(): ruleConfig is required");
  }

  let result: RuleResult;
  try {
    const normalized = normalizeContext(context);
    result = await executeRule(wasmBinary, normalized, ruleConfig);
  } catch (err: any) {
    return {
      decision: "REJECT",
      code: "ENGINE_ERROR",
      reason: err?.message ?? "rule engine failure"
    };
  }

  if (result.decision !== "ALLOW" && result.decision !== "REJECT") {
    return {
      decision: "REJECT",
      code: "INVALID_ENGINE_OUTPUT",
      reason: "invalid decision value"
    };
  }

  return {
    decision: result.decision,
    code: result.code || "UNKNOWN",
    reason: result.reason
  };
}
