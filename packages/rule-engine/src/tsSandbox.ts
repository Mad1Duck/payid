// sandbox.ts — Pure TypeScript rule engine (no WASM)
//
// Implements semua operator v4: exists, not_exists, transforms, regex, mod_ne, dll.
// Tidak butuh compile Rust, tidak butuh WASI.

import type { RuleContext, RuleResult } from "payid-types";

// ── Entry point (sama interface dengan runWasmRule) ───────────────────────────

export async function runWasmRule(
  _wasmBinary: Buffer,   // ignored — pakai TS implementation
  context: RuleContext,
  config: any
): Promise<RuleResult> {
  return evaluateRule(context, config);
}

// ── Core evaluation ───────────────────────────────────────────────────────────

function evaluateRule(context: any, config: any): RuleResult {
  const rules: any[] = config?.rules;
  if (!Array.isArray(rules) || rules.length === 0) {
    return { decision: "ALLOW", code: "NO_RULES", reason: "no rules defined" };
  }

  const logic: string = config?.logic ?? "AND";
  return evalRules(context, rules, logic);
}

function evalRules(context: any, rules: any[], logic: string): RuleResult {
  for (const rule of rules) {
    const res = evalOneRule(context, rule);
    if (res.decision === "REJECT" && logic === "AND") return res;
    if (res.decision === "ALLOW" && logic === "OR") return res;
  }
  if (logic === "AND") return { decision: "ALLOW", code: "OK", reason: "all rules passed" };
  return { decision: "REJECT", code: "NO_RULE_MATCH", reason: "no rule matched in OR group" };
}

function evalOneRule(context: any, rule: any): RuleResult {
  const ruleId = rule?.id ?? "UNKNOWN_RULE";
  const message = rule?.message ?? "";

  // Format C: nested rules
  if (Array.isArray(rule?.rules)) {
    const subLogic = rule?.logic ?? "AND";
    const res = evalRules(context, rule.rules, subLogic);
    if (res.decision === "REJECT" && message) {
      return { decision: "REJECT", code: ruleId, reason: message };
    }
    return res;
  }

  // Format B: multi-condition
  if (Array.isArray(rule?.conditions)) {
    const inner = rule?.logic ?? "AND";
    for (const cond of rule.conditions) {
      const passed = evalCondition(context, cond);
      if (!passed && inner === "AND") {
        const reason = message || cond?.field || ruleId;
        return { decision: "REJECT", code: ruleId, reason };
      }
      if (passed && inner === "OR") {
        return { decision: "ALLOW", code: ruleId };
      }
    }
    if (inner === "AND") return { decision: "ALLOW", code: ruleId };
    return { decision: "REJECT", code: ruleId, reason: message || "no condition matched in OR" };
  }

  // Format A: single if
  if (rule?.if !== undefined) {
    const passed = evalCondition(context, rule.if);
    if (!passed) {
      const reason = message || rule.if?.field || ruleId;
      return {
        decision: "REJECT",
        code: ruleId,
        reason: interpolate(reason, context)
      };
    }
    return { decision: "ALLOW", code: ruleId };
  }

  return { decision: "REJECT", code: ruleId, reason: "rule has no evaluable condition" };
}

// ── Condition evaluation ──────────────────────────────────────────────────────

function evalCondition(context: any, cond: any): boolean {
  const fieldExpr: string = cond?.field;
  const op: string = cond?.op;
  if (!fieldExpr || !op) return false;

  const baseField = splitTransform(fieldExpr)[0];

  if (op === "exists") return resolveField(context, baseField) !== undefined;
  if (op === "not_exists") return resolveField(context, baseField) === undefined;

  const actualRaw = resolveField(context, baseField);
  if (actualRaw === undefined) return false;
  const actual = applyTransform(actualRaw, fieldExpr);

  // Cross-field reference
  let expected = cond.value;
  if (typeof expected === "string" && expected.startsWith("$")) {
    const refField = expected.slice(1);
    const refBase = splitTransform(refField)[0];
    const refRaw = resolveField(context, refBase);
    if (refRaw === undefined) return false;
    expected = applyTransform(refRaw, refField);
  }

  return applyOp(actual, op, expected);
}

// ── Field resolution ──────────────────────────────────────────────────────────

function resolveField(ctx: any, path: string): any {
  const base = splitTransform(path)[0];
  return base.split(".").reduce((o: any, k: string) => o?.[k], ctx);
}

function splitTransform(expr: string): [string, string | null] {
  const i = expr.indexOf("|");
  if (i === -1) return [expr, null];
  return [expr.slice(0, i), expr.slice(i + 1)];
}

// ── Field transforms ──────────────────────────────────────────────────────────

function applyTransform(val: any, expr: string): any {
  const transform = splitTransform(expr)[1];
  if (!transform) return val;

  const colonIdx = transform.indexOf(":");
  const name = colonIdx === -1 ? transform : transform.slice(0, colonIdx);
  const arg = colonIdx === -1 ? null : transform.slice(colonIdx + 1);

  const n = toU128(val);

  switch (name) {
    case "div": {
      if (n === null) return val;
      const d = arg ? BigInt(arg) : 1n;
      if (d === 0n) return val;
      return Number(n / d);
    }
    case "mod": {
      if (n === null) return val;
      const m = arg ? BigInt(arg) : 1n;
      if (m === 0n) return val;
      return Number(n % m);
    }
    case "abs": return n !== null ? Number(n < 0n ? -n : n) : val;
    case "hour": return n !== null ? Number((n % 86400n) / 3600n) : val;
    case "day": return n !== null ? Number((n / 86400n + 4n) % 7n) : val;
    case "date": return n !== null ? dayOfMonth(Number(n / 86400n)) : val;
    case "month": return n !== null ? monthOfYear(Number(n / 86400n)) : val;
    case "len": return String(val).length;
    case "lower": return String(val).toLowerCase();
    case "upper": return String(val).toUpperCase();
    default: return val;
  }
}

function toU128(v: any): bigint | null {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && v !== "") return BigInt(v);
    return null;
  } catch { return null; }
}

// ── Gregorian calendar ────────────────────────────────────────────────────────

function isLeap(y: number): boolean { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

function daysToYMD(days: number): [number, number, number] {
  let y = 1970;
  while (true) { const dy = isLeap(y) ? 366 : 365; if (days < dy) break; days -= dy; y++; }
  const months = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (isLeap(y)) months[2] = 29;
  let m = 1;
  while (true) { if (days < months[m]!) break; days -= months[m]!; m++; }
  return [y, m, days + 1];
}

function dayOfMonth(days: number): number { return daysToYMD(days)[2]; }
function monthOfYear(days: number): number { return daysToYMD(days)[1]; }

// ── Operator dispatch ─────────────────────────────────────────────────────────

function applyOp(actual: any, op: string, expected: any): boolean {
  const a = toU128(actual);
  const b = toU128(expected);

  switch (op) {
    case ">=": return a !== null && b !== null && a >= b;
    case "<=": return a !== null && b !== null && a <= b;
    case ">": return a !== null && b !== null && a > b;
    case "<": return a !== null && b !== null && a < b;

    case "==": return String(actual) === String(expected) || actual == expected;
    case "!=": return String(actual) !== String(expected) && actual != expected;

    case "in": return Array.isArray(expected) && expected.some(e => looseEq(actual, e));
    case "not_in": return Array.isArray(expected) && !expected.some(e => looseEq(actual, e));

    case "between":
      return Array.isArray(expected) && expected.length === 2 && a !== null
        && toU128(expected[0]) !== null && toU128(expected[1]) !== null
        && a >= toU128(expected[0])! && a <= toU128(expected[1])!;

    case "not_between":
      return Array.isArray(expected) && expected.length === 2 && a !== null
        && (a < toU128(expected[0])! || a > toU128(expected[1])!);

    case "mod_eq":
      return Array.isArray(expected) && expected.length === 2 && a !== null
        && toU128(expected[0]) !== null && toU128(expected[0])! > 0n
        && a % toU128(expected[0])! === toU128(expected[1])!;

    case "mod_ne":
      return Array.isArray(expected) && expected.length === 2 && a !== null
        && toU128(expected[0]) !== null && toU128(expected[0])! > 0n
        && a % toU128(expected[0])! !== toU128(expected[1])!;

    case "contains": return typeof actual === "string" && typeof expected === "string" && actual.includes(expected);
    case "not_contains": return typeof actual === "string" && typeof expected === "string" && !actual.includes(expected);
    case "starts_with": return typeof actual === "string" && typeof expected === "string" && actual.startsWith(expected);
    case "ends_with": return typeof actual === "string" && typeof expected === "string" && actual.endsWith(expected);

    case "exists": return actual !== undefined && actual !== null;
    case "not_exists": return actual === undefined || actual === null;

    case "regex": return typeof actual === "string" && typeof expected === "string" && new RegExp(expected).test(actual);
    case "not_regex": return typeof actual === "string" && typeof expected === "string" && !new RegExp(expected).test(actual);

    default: return false;
  }
}

function looseEq(a: any, b: any): boolean {
  if (a == b) return true;
  if (String(a) === String(b)) return true;
  const ba = toU128(a), bb = toU128(b);
  return ba !== null && bb !== null && ba === bb;
}

// ── Message interpolation ─────────────────────────────────────────────────────

function interpolate(template: string, context: any): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const base = splitTransform(key)[0];
    const raw = resolveField(context, base);
    if (raw === undefined) return `{${key}}`;
    const val = applyTransform(raw, key);
    return String(val);
  });
}