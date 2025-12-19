import type { RuleContext, RuleResult, RuleConfig } from "@payid/types";
import { executeRule } from "@payid/rule-engine";
import { normalizeContext } from "./normalize";
import { preprocessContextV2 } from "@payid/rule-engine";

export async function evaluate(
  wasmBinary: Buffer,
  context: RuleContext,
  ruleConfig: RuleConfig,
  options?: {
    trustedIssuers?: Set<string>;
  }
): Promise<RuleResult> {
  // ---- basic validation (v1 behavior) ----
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
    // ---- NEW: preprocess v2 context if enabled ----
    const preparedContext =
      options?.trustedIssuers
        ? preprocessContextV2(context, ruleConfig, options.trustedIssuers)
        : context;

    // ---- existing normalization ----
    const normalized = normalizeContext(preparedContext);

    // ---- execute WASM rule engine ----
    result = await executeRule(wasmBinary, normalized, ruleConfig);
  } catch (err: any) {
    return {
      decision: "REJECT",
      code: "CONTEXT_OR_ENGINE_ERROR",
      reason: err?.message ?? "rule evaluation failed"
    };
  }

  // ---- output validation ----
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
