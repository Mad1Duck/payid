export interface RuleCondition {
  field: string;
  op: string;
  value: any;
}

export interface Rule {
  id: string;
  if: RuleCondition;
}

export interface RuleConfig {
  version?: string;
  logic: "AND" | "OR";
  rules: Rule[];
  requires?: string[];
}
