export type DecisionValue = 0 | 1; // 1=ALLOW, 0=REJECT

export interface DecisionPayload {
  version: "payid.decision.v1";
  payId: string;
  owner: string;              // authority address
  decision: DecisionValue;
  contextHash: string;        // bytes32
  ruleSetHash: string;        // bytes32
  issuedAt: number;           // uint64
  expiresAt: number;          // uint64
  nonce: string;              // bytes32
}

export interface DecisionProof {
  payload: DecisionPayload;
  signature: string;          // EIP-712 signature
}
