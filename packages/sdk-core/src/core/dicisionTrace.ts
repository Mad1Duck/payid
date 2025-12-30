import type { RuleConfig, RuleContext, RuleTraceEntry } from "payid-types";

function toBigIntSafe(v: any): bigint | null {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number" && Number.isFinite(v)) {
      return BigInt(Math.trunc(v));
    }
    if (typeof v === "string" && v !== "") {
      return BigInt(v);
    }
    return null;
  } catch {
    return null;
  }
}

function getValueByPath(obj: any, path: string) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function evaluateCondition(
  actual: any,
  op: string,
  expected: any
): boolean {
  switch (op) {
    case ">=":
    case "<=":
    case ">":
    case "<": {
      const a = toBigIntSafe(actual);
      const b = toBigIntSafe(expected);
      if (a === null || b === null) return false;

      if (op === ">=") return a >= b;
      if (op === "<=") return a <= b;
      if (op === ">") return a > b;
      if (op === "<") return a < b;
      return false;
    }

    case "==":
      return actual == expected;

    case "in":
      return Array.isArray(expected) && expected.includes(actual);

    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual);

    default:
      return false;
  }
}

export function buildDecisionTrace(
  context: RuleContext,
  ruleConfig: RuleConfig
): RuleTraceEntry[] {
  return ruleConfig.rules.map(rule => {
    const cond = rule.if;
    const actual = getValueByPath(context, cond.field);
    const pass = evaluateCondition(actual, cond.op, cond.value);

    return {
      ruleId: rule.id,
      field: cond.field,
      op: cond.op,
      expected: cond.value,
      actual,
      result: actual === undefined
        ? "FAIL"
        : pass ? "PASS" : "FAIL"
    };
  });
}
