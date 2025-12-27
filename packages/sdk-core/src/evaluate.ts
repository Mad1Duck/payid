import type { RuleContext, RuleResult, RuleConfig } from "payid-types";
import { executeRule, preprocessContextV2 } from "payid-rule-engine";
import { normalizeContext } from "./normalize";

/**
 * Evaluate rule using WASM engine.
 *
 * Public-safe:
 * - Accepts Uint8Array (browser / node / edge)
 * - Internally adapts to Buffer only if needed
 */
export async function evaluate(
  wasmBinary: Uint8Array,
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
    // ---- preprocess v2 context (optional) ----
    const preparedContext =
      options?.trustedIssuers
        ? preprocessContextV2(
          context,
          ruleConfig,
          options.trustedIssuers
        )
        : context;

    // ---- normalize context ----
    const normalized = normalizeContext(preparedContext);

    // ---- WASM binary adapter ----
    // payid-rule-engine still expects Buffer
    const wasmForEngine =
      typeof Buffer !== "undefined" && !(wasmBinary instanceof Buffer)
        ? Buffer.from(wasmBinary)
        : wasmBinary;

    // ---- execute rule engine ----
    result = await executeRule(
      wasmForEngine as any,
      normalized,
      ruleConfig
    );
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
