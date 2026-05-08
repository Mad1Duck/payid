export interface RuleResult {
  decision: "ALLOW" | "REJECT";
  code: string;
  reason?: string;
}

export interface RuleTraceEntry {
  ruleId: string;
  field: string;
  op: string;
  expected: any;
  actual: any;
  result: "PASS" | "FAIL";
}

export interface RuleDecisionDebug {
  trace: RuleTraceEntry[];
}

export interface RuleResultDebug extends RuleResult {
  debug?: RuleDecisionDebug;
}
