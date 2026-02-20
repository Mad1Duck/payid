// ─── Primitive condition (shared across all rule formats) ───────────────────

export interface RuleCondition {
  field: string;
  op: string;
  /** Literal value OR cross-field reference prefixed with "$" (e.g. "$state.dailyLimit") */
  value: any;
}

// ─── Format A: single-condition rule ────────────────────────────────────────

export interface SimpleRule {
  id: string;
  if: RuleCondition;
  message?: string;
}

// ─── Format B: multi-condition rule (AND / OR over conditions[]) ─────────────

export interface MultiConditionRule {
  id: string;
  logic: "AND" | "OR";
  conditions: RuleCondition[];
  message?: string;
}

// ─── Format C: nested rule (AND / OR over child rules) ──────────────────────

export interface NestedRule {
  id: string;
  logic: "AND" | "OR";
  rules: AnyRule[];
  message?: string;
}

/** Union of all supported rule formats */
export type AnyRule = SimpleRule | MultiConditionRule | NestedRule;

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isSimpleRule(rule: AnyRule): rule is SimpleRule {
  return "if" in rule;
}

export function isMultiConditionRule(rule: AnyRule): rule is MultiConditionRule {
  return "conditions" in rule;
}

export function isNestedRule(rule: AnyRule): rule is NestedRule {
  return "rules" in rule;
}

// ─── Root rule config ────────────────────────────────────────────────────────

export interface RuleConfig {
  version?: string;
  logic: "AND" | "OR";
  rules: AnyRule[];
  /** Optional list of required context namespaces (e.g. ["oracle", "risk"]) */
  requires?: string[];
  message?: string;
}

// ─── Backwards-compat alias (Rule was previously SimpleRule only) ────────────
/** @deprecated Use AnyRule instead */
export type Rule = AnyRule;