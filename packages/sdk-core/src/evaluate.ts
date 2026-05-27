import type { RuleContext, RuleResult, RuleConfig, RuleResultDebug } from "./types";
import { executeRule, preprocessContextV2 } from "./rule/engine";
import { normalizeContext } from "./normalize";
import { buildDecisionTrace } from "./core/decisionTrace";

export async function evaluate(
  context: RuleContext,
  ruleConfig: RuleConfig,
  options?: {
    trustedIssuers?: Set<string>;
    debug?: boolean;
  },
  wasmBinary?: Uint8Array,
): Promise<RuleResult | RuleResultDebug> {
  if (!context || typeof context !== "object") {
    throw new Error("evaluate(): context is required");
  }
  if (!context.tx) {
    throw new Error("evaluate(): context.tx is required");
  }
  if (context.tx.chainId !== undefined && (!Number.isInteger(context.tx.chainId) || context.tx.chainId <= 0)) {
    throw new Error(`evaluate(): context.tx.chainId is invalid: ${context.tx.chainId}`);
  }
  if (context.tx.amount !== undefined) {
    const amt = BigInt(context.tx.amount);
    if (amt <= 0n) throw new Error("evaluate(): context.tx.amount must be > 0");
  }
  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error("evaluate(): ruleConfig is required");
  }
  if (ruleConfig.logic !== "AND" && ruleConfig.logic !== "OR") {
    throw new Error(`evaluate(): ruleConfig.logic must be "AND" or "OR", got: ${ruleConfig.logic}`);
  }
  if (!Array.isArray(ruleConfig.rules)) {
    throw new Error("evaluate(): ruleConfig.rules must be an array");
  }

  // No rules = allow-all (recipient has no policy configured)
  if (ruleConfig.rules.length === 0) {
    return {
      decision: "ALLOW",
      code: "NO_RULES",
      reason: "No policy configured for this recipient",
      ...(options?.debug ? { debug: { trace: buildDecisionTrace(context, ruleConfig) } } : {}),
    } as RuleResult | RuleResultDebug;
  }

  let result: RuleResult;

  try {
    const preparedContext = options?.trustedIssuers
      ? preprocessContextV2(context, ruleConfig, options.trustedIssuers)
      : context;

    const normalized = normalizeContext(preparedContext);

    // Tidak pakai Buffer — Uint8Array works di browser, Node.js, dan edge
    result = await executeRule(normalized, ruleConfig, wasmBinary as any);
  } catch (err: any) {
    return {
      decision: "REJECT",
      code: "CONTEXT_OR_ENGINE_ERROR",
      reason: err?.message ?? "rule evaluation failed",
    };
  }

  if (result.decision !== "ALLOW" && result.decision !== "REJECT") {
    return {
      decision: "REJECT",
      code: "INVALID_ENGINE_OUTPUT",
      reason: "invalid decision value",
    };
  }

  const baseResult: RuleResult = {
    decision: result.decision,
    code: result.code || "UNKNOWN",
    reason: result.reason,
  };

  if (options?.debug) {
    return {
      ...baseResult,
      debug: {
        trace: buildDecisionTrace(context, ruleConfig),
      },
    };
  }

  return baseResult;
}