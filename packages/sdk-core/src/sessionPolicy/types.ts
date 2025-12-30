// sessinPolicy/types.ts
export interface PayIDSessionPolicyPayloadV1 {
  version: "payid.session.policy.v1" | string;

  receiver: string;

  rule: {
    version: string;
    logic: "AND" | "OR";
    rules: any[];
  };

  expiresAt: number;
  nonce: string;
  issuedAt: number;

  signature: string;
}
