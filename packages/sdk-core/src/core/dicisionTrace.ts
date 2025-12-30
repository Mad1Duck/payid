import type { RuleConfig, RuleContext, RuleTraceEntry } from "payid-types";

function getValueByPath(obj: any, path: string) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function evaluateCondition(actual: any, op: string, expected: any): boolean {
  switch (op) {
    case ">=": return BigInt(actual) >= BigInt(expected);
    case "<=": return BigInt(actual) <= BigInt(expected);
    case ">": return BigInt(actual) > BigInt(expected);
    case "<": return BigInt(actual) < BigInt(expected);
    case "==": return actual == expected;
    case "in": return Array.isArray(expected) && expected.includes(actual);
    default: return false;
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
      result: pass ? "PASS" : "FAIL"
    };
  });
}
