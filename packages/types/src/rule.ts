export interface RuleConfig {
  version: string;
  logic: "AND" | "OR";
  rules: any[];
}
