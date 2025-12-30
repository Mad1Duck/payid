// sessionPolicy/createSessionPolicyPayload.ts
import { ethers } from "ethers";
import { canonicalizeRuleSet } from "../rule/canonicalize";
import { randomHex } from "../utils/randomHex";
import type { PayIDSessionPolicyPayloadV1 } from "./types";

/**
 * Create and sign an ephemeral PayID session policy payload.
 *
 * A session policy represents a **temporary, off-chain consent**
 * granted by the receiver to apply additional rule constraints
 * during rule evaluation (e.g. session limits, QR payments,
 * intent-scoped conditions).
 *
 * ## Security model
 *
 * - The session policy is signed by the receiver.
 * - The signature proves **explicit consent** for the included rule.
 * - This policy does NOT establish on-chain authority and MUST NOT
 *   be registered or referenced in any on-chain rule registry.
 *
 * ## Canonicalization
 *
 * - The rule set is canonicalized BEFORE signing to ensure
 *   deterministic hashing and signature verification.
 * - The exact payload signed here MUST be used verbatim during
 *   policy verification.
 *
 * ## Lifecycle
 *
 * - Session policies are valid only until `expiresAt`.
 * - Expired policies MUST be rejected by the verifier.
 *
 * @param params
 * @param params.receiver
 *   Address of the receiver granting the session policy.
 *
 * @param params.rule
 *   Rule configuration to be applied as an **off-chain evaluation
 *   override** during the session.
 *
 * @param params.expiresAt
 *   UNIX timestamp (seconds) indicating when the session policy
 *   becomes invalid.
 *
 * @param params.signer
 *   Signer controlling the receiver address, used to sign the
 *   session policy payload.
 *
 * @returns
 *   A signed `PayIDSessionPolicyPayloadV1` that may be transmitted
 *   to clients and verified using `decodeSessionPolicy`.
 *
 * @throws
 *   May throw if signing fails or the signer is misconfigured.
 */
export async function createSessionPolicyPayload(params: {
  receiver: string;
  rule: {
    version: string;
    logic: "AND";
    rules: any[];
  };
  expiresAt: number;
  signer: ethers.Signer;
}): Promise<PayIDSessionPolicyPayloadV1> {

  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = randomHex(16);

  const payload: Omit<PayIDSessionPolicyPayloadV1, "signature"> = {
    version: "payid.session.policy.v1",
    receiver: params.receiver,
    rule: canonicalizeRuleSet(params.rule),
    issuedAt,
    expiresAt: params.expiresAt,
    nonce
  };

  const message = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(payload))
  );

  const signature = await params.signer.signMessage(message);

  return {
    ...payload,
    signature
  };
}
