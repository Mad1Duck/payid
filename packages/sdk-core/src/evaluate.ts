import type { RuleContext, RuleResult, RuleConfig, RuleResultDebug } from "payid-types";
import { executeRule, preprocessContextV2 } from "payid-rule-engine";
import { normalizeContext } from "./normalize";
import { buildDecisionTrace } from "./core/dicisionTrace";

/**
 * Evaluate rule using WASM engine.
 *
 * Public-safe:
 * - Accepts Uint8Array (browser / node / edge)
 */
export async function evaluate(
  wasmBinary: Uint8Array,
  context: RuleContext,
  ruleConfig: RuleConfig,
  options?: {
    trustedIssuers?: Set<string>;
    debug?: boolean;
  }
): Promise<RuleResult | RuleResultDebug> {
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
    const preparedContext =
      options?.trustedIssuers
        ? preprocessContextV2(
          context,
          ruleConfig,
          options.trustedIssuers
        )
        : context;

    const normalized = normalizeContext(preparedContext);

    const wasmForEngine =
      typeof Buffer !== "undefined" && !(wasmBinary instanceof Buffer)
        ? Buffer.from(wasmBinary)
        : wasmBinary;

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

  if (result.decision !== "ALLOW" && result.decision !== "REJECT") {
    return {
      decision: "REJECT",
      code: "INVALID_ENGINE_OUTPUT",
      reason: "invalid decision value"
    };
  }

  const baseResult: RuleResult = {
    decision: result.decision,
    code: result.code || "UNKNOWN",
    reason: result.reason
  };

  if (options?.debug) {
    return {
      ...baseResult,
      debug: {
        trace: buildDecisionTrace(context, ruleConfig)
      }
    };
  }

  return baseResult;
}
