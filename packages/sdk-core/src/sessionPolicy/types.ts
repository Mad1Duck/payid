import type { RuleConfig } from "payid-types";

export interface PayIDSessionPolicyPayloadV1 {
  version: "payid.session.policy.v1" | string;

  receiver: string;

  rule: RuleConfig;

  expiresAt: number;
  nonce: string;
  issuedAt: number;

  signature: string;
}