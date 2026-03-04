/**
 * CHANNEL A — Type Definitions
 * examples/simple/channel-a.types.ts
 */

export interface AuthorityRule {
  version: string;
  logic:   "AND" | "OR";
  rules:   unknown[];
}

export interface ClaimResult {
  proof: {
    payload:   DecisionPayload;
    signature: string;
  };
  policy: import("payid/sessionPolicy").SessionPolicyV2;
  evaluation: {
    decision: "ALLOW" | "REJECT";
    code:     string;
    reason?:  string;
  };
}

export interface DecisionPayload {
  version:             string;
  payId:               string;
  payer:               string;
  receiver:            string;
  asset:               string;
  amount:              bigint;
  contextHash:         string;
  ruleSetHash:         string;
  ruleAuthority:       string;
  issuedAt:            bigint;
  expiresAt:           bigint;
  nonce:               string;
  requiresAttestation: boolean;
}
