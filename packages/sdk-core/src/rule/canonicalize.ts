import type { AnyRule } from "payid-types";

/**
 * Canonicalize a rule set into a deterministic, order-independent form.
 *
 * Supports all three v4 rule formats:
 *   - Format A: { id, if, message? }
 *   - Format B: { id, logic, conditions[], message? }
 *   - Format C: { id, logic, rules[], message? }
 */
export function canonicalizeRuleSet(ruleSet: {
  version?: string;
  logic: "AND" | "OR";
  rules: any[];
}) {
  return {
    version: ruleSet.version ?? "1",
    logic: ruleSet.logic,
    rules: ruleSet.rules
      .map(rule => canonicalizeRule(rule))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
}

/**
 * Canonicalize a single rule — handles all three v4 formats.
 */
function canonicalizeRule(rule: any): AnyRule {
  const base = { id: rule.id, ...(rule.message ? { message: rule.message } : {}) };

  // Format C: nested rules
  if ("rules" in rule && Array.isArray(rule.rules)) {
    return {
      ...base,
      logic: rule.logic,
      rules: rule.rules
        .map((r: any) => canonicalizeRule(r))
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
    } as any;
  }

  // Format B: multi-condition
  if ("conditions" in rule && Array.isArray(rule.conditions)) {
    return {
      ...base,
      logic: rule.logic,
      conditions: rule.conditions.map((c: any) => canonicalizeObject(c))
    } as any;
  }

  // Format A: simple if
  return {
    ...base,
    if: canonicalizeObject(rule.if)
  } as any;
}

/**
 * Recursively canonicalize an arbitrary object (sort keys, handle special types).
 */
function canonicalizeObject(obj: any): any {
  if (obj === undefined) {
    throw new Error("Undefined value not allowed in canonical object");
  }

  if (typeof obj === "function" || typeof obj === "symbol") {
    throw new Error("Non-JSON value not allowed in canonical object");
  }

  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "bigint") return obj.toString();

  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalizeObject(obj[key]);
        return acc;
      }, {} as any);
  }

  return obj;
}