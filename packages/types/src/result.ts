export interface RuleResult {
  decision: "ALLOW" | "REJECT";
  code: string;
  reason?: string;
}
