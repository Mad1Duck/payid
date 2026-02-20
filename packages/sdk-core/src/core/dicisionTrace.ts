import type {
  RuleConfig,
  RuleContext,
  RuleTraceEntry,
  AnyRule,
  RuleCondition,
} from "payid-types";

function toBigIntSafe(v: any): bigint | null {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
    if (typeof v === "string" && v !== "") return BigInt(v);
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve a field path that may include a pipe-separated transform.
 * e.g. "tx.amount|div:1000000" → resolves tx.amount then divides by 1000000
 *
 * Transforms supported for tracing: div:N, mod:N, abs, hour, day, date, month, len, lower, upper
 */
function resolveField(obj: any, fieldExpr: string): any {
  const [path, ...transforms] = fieldExpr.split("|");
  let value = path?.split(".").reduce((o, k) => o?.[k], obj);

  for (const t of transforms) {
    if (value === undefined || value === null) break;

    if (t.startsWith("div:")) {
      const n = Number(t.slice(4));
      value = Number(value) / n;
    } else if (t.startsWith("mod:")) {
      const n = BigInt(t.slice(4));
      value = BigInt(value) % n;
    } else if (t === "abs") {
      value = Math.abs(Number(value));
    } else if (t === "hour") {
      value = new Date(Number(value) * 1000).getUTCHours();
    } else if (t === "day") {
      value = new Date(Number(value) * 1000).getUTCDay();
    } else if (t === "date") {
      value = new Date(Number(value) * 1000).getUTCDate();
    } else if (t === "month") {
      value = new Date(Number(value) * 1000).getUTCMonth() + 1;
    } else if (t === "len") {
      value = String(value).length;
    } else if (t === "lower") {
      value = String(value).toLowerCase();
    } else if (t === "upper") {
      value = String(value).toUpperCase();
    }
  }

  return value;
}

/**
 * Resolve a value that may be a cross-field reference (prefixed with "$").
 */
function resolveValue(context: any, value: any): any {
  if (typeof value === "string" && value.startsWith("$")) {
    return resolveField(context, value.slice(1));
  }
  return value;
}

function evaluateCondition(actual: any, op: string, expected: any): boolean {
  switch (op) {
    case ">=": case "<=": case ">": case "<": {
      const a = toBigIntSafe(actual);
      const b = toBigIntSafe(expected);
      if (a === null || b === null) return false;
      if (op === ">=") return a >= b;
      if (op === "<=") return a <= b;
      if (op === ">") return a > b;
      if (op === "<") return a < b;
      return false;
    }
    case "==": return actual == expected;
    case "!=": return actual != expected;
    case "in": return Array.isArray(expected) && expected.includes(actual);
    case "not_in": return Array.isArray(expected) && !expected.includes(actual);
    case "between":
      return Array.isArray(expected) && actual >= expected[0] && actual <= expected[1];
    case "not_between":
      return Array.isArray(expected) && !(actual >= expected[0] && actual <= expected[1]);
    case "exists": return actual !== undefined && actual !== null;
    case "not_exists": return actual === undefined || actual === null;
    default: return false;
  }
}

/**
 * Build a flat trace entry for a single condition.
 */
function traceCondition(
  context: any,
  ruleId: string,
  cond: RuleCondition
): RuleTraceEntry {
  const actual = resolveField(context, cond.field);
  const expected = resolveValue(context, cond.value);
  const pass = evaluateCondition(actual, cond.op, expected);

  return {
    ruleId,
    field: cond.field,
    op: cond.op,
    expected: cond.value,
    actual,
    result: actual === undefined ? "FAIL" : pass ? "PASS" : "FAIL",
  };
}

/**
 * Recursively build trace entries for any rule format (A, B, or C).
 */
function traceRule(context: any, rule: AnyRule): RuleTraceEntry[] {
  // Format A: simple if
  if ("if" in rule) {
    return [traceCondition(context, rule.id, rule.if)];
  }

  // Format B: multi-condition
  if ("conditions" in rule) {
    return rule.conditions.map(cond => traceCondition(context, rule.id, cond));
  }

  // Format C: nested rules
  if ("rules" in rule) {
    return rule.rules.flatMap(child => traceRule(context, child));
  }

  return [];
}

export function buildDecisionTrace(
  context: RuleContext,
  ruleConfig: RuleConfig
): RuleTraceEntry[] {
  return ruleConfig.rules.flatMap(rule => traceRule(context, rule));
}