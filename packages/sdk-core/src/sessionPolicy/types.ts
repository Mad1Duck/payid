import type { RuleConfig } from "payid-types";

/**
 * SessionPolicy V1 — off-chain only, rule injected inline.
 *
 * @deprecated Use SessionPolicyV2 for new implementations.
 * V1 tidak ada chain binding (chainId, verifyingContract) sehingga
 * policy bisa di-replay di chain lain, dan tidak ada constraint
 * ruleSetHash / maxAmount.
 */
export interface PayIDSessionPolicyPayloadV1 {
  version: "payid.session.policy.v1" | string;
  receiver: string;
  rule: RuleConfig;
  expiresAt: number;
  nonce: string;
  issuedAt: number;
  signature: string;
}

/**
 * SessionPolicyV2 — Channel A, on-chain rule binding.
 *
 * Perbedaan dari V1:
 *
 * 1. ruleSetHash + ruleAuthority
 *    Receiver commit ke rule set yang terdaftar on-chain.
 *    Payer tidak bisa swap rule dengan yang lebih longgar.
 *
 * 2. allowedAsset + maxAmount
 *    Receiver set constraint token dan batas amount.
 *    Payer tidak bisa melebihi maxAmount atau pakai token lain.
 *
 * 3. chainId + verifyingContract (EIP-712 domain)
 *    Policy di-bind ke chain dan contract tertentu.
 *    Policy tidak bisa di-replay di chain lain.
 *
 * 4. Signed via EIP-712 (bukan raw keccak256)
 *    Type-safe, human-readable di wallet UI, standard.
 */
export interface SessionPolicyV2 {
  version: "payid.session.policy.v2";

  /** Receiver address — pemilik policy */
  receiver: string;

  /** ruleSetHash dari CombinedRuleStorage — binding ke rule on-chain */
  ruleSetHash: string;

  /** CombinedRuleStorage address — authority rule */
  ruleAuthority: string;

  /** Token address yang diizinkan. ZeroAddress = ETH. */
  allowedAsset: string;

  /** Max amount per transaksi (string karena bigint tidak JSON-safe) */
  maxAmount: string;

  /** Unix timestamp expiry */
  expiresAt: number;

  /** Nonce unik per policy — anti-replay */
  policyNonce: string;

  /** PAY.ID identifier string (e.g. "pay.id/toko-budi") */
  payId: string;

  /** Chain ID — bagian dari EIP-712 domain */
  chainId: number;

  /** PayIDVerifier contract address — bagian dari EIP-712 domain */
  verifyingContract: string;

  /** EIP-712 signature dari receiver */
  signature: string;
}