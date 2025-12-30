// sessionPolicy/decodeSessionPolicy.ts
import { ethers } from "ethers";
import type { PayIDSessionPolicyPayloadV1 } from "./types";
import type { RuleConfig } from "payid-types";

/**
 * Decode and verify an ephemeral PayID session policy.
 *
 * This function validates that a session policy:
 * - Uses a supported policy version
 * - Has not expired
 * - Was cryptographically signed by the declared receiver
 *
 * If all checks pass, the embedded rule configuration is returned
 * and may be used as an **off-chain evaluation override**
 * (e.g. combined with an authoritative on-chain rule).
 *
 * ## Security model
 *
 * - The session policy signature represents **explicit consent**
 *   from the receiver for temporary rule constraints.
 * - This policy does NOT establish on-chain authority and MUST NOT
 *   be used to derive `ruleSetHash` or interact with rule registries.
 *
 * ## Invariants
 *
 * - The payload verified here MUST match exactly the payload that was signed.
 * - No canonicalization or mutation is performed during verification.
 * - Expired or invalidly signed policies are rejected immediately.
 *
 * @export
 *
 * @param sessionPolicy
 *   A signed session policy payload created by
 *   `createSessionPolicyPayload`.
 *
 * @param now
 *   Current UNIX timestamp (seconds) used to validate policy expiry.
 *
 * @returns
 *   A `RuleConfig` representing the session's evaluation rule.
 *
 * @throws
 *   Throws if:
 *   - The policy version is unsupported
 *   - The policy has expired
 *   - The signature does not match the receiver
 */
export function decodeSessionPolicy(
  sessionPolicy: PayIDSessionPolicyPayloadV1,
  now: number
): RuleConfig {

  if (sessionPolicy.version !== "payid.session.policy.v1") {
    throw new Error("INVALID_SESSION_POLICY_VERSION");
  }

  if (now > sessionPolicy.expiresAt) {
    throw new Error("SESSION_POLICY_EXPIRED");
  }

  const payload = {
    version: sessionPolicy.version,
    receiver: sessionPolicy.receiver,
    rule: sessionPolicy.rule,
    issuedAt: sessionPolicy.issuedAt,
    expiresAt: sessionPolicy.expiresAt,
    nonce: sessionPolicy.nonce
  };

  const message = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(payload))
  );

  const recovered = ethers.verifyMessage(
    message,
    sessionPolicy.signature
  );

  if (recovered.toLowerCase() !== sessionPolicy.receiver.toLowerCase()) {
    throw new Error("INVALID_SESSION_POLICY_SIGNATURE");
  }

  return sessionPolicy.rule;
}
