export type DecisionValue = 0 | 1; // 1=ALLOW, 0=REJECT

export interface DecisionPayload {
  // protocol
  version: string;          // bytes32 (keccak256("2"))
  payId: string;            // bytes32 (keccak256(payId))

  // parties
  payer: string;            // address (signer, fund owner)
  receiver: string;         // address (merchant)

  // payment
  asset: string;            // address (ERC20) | address(0) for ETH
  amount: bigint;           // uint256

  // policy binding
  contextHash: string;      // bytes32
  ruleSetHash: string;      // bytes32

  ruleAuthority: string;  // address | ZeroAddress

  // validity
  issuedAt: bigint;         // uint64
  expiresAt: bigint;        // uint64

  // replay protection
  nonce: string;            // bytes32
}

export interface DecisionProof {
  payload: DecisionPayload;
  signature: string;          // EIP-712 signature
}
