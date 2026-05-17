// sessionPolicy/decode.ts
import { ethers } from "ethers";
import type { PayIDSessionPolicyPayloadV1 } from "./types";
import type { RuleConfig } from "../types";
import type { SessionPolicyV2 } from "./types";
import { SESSION_POLICY_V2_TYPES, buildSessionPolicyV2Domain } from "./create";

// ─── V1 (legacy) ─────────────────────────────────────────────────────────────

/**
 * Decode and verify a V1 session policy.
 * @deprecated Use decodeSessionPolicyV2 for new implementations.
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
    nonce: sessionPolicy.nonce,
  };

  const message = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));
  const recovered = ethers.verifyMessage(message, sessionPolicy.signature);

  if (recovered.toLowerCase() !== sessionPolicy.receiver.toLowerCase()) {
    throw new Error("INVALID_SESSION_POLICY_SIGNATURE");
  }

  return sessionPolicy.rule;
}

// ─── V2 (Channel A) ──────────────────────────────────────────────────────────

/**
 * Verify and decode a Channel A SessionPolicyV2.
 *
 * Checks (in order):
 *   1. version === "payid.session.policy.v2"
 *   2. blockTimestamp < expiresAt  (belum expired)
 *   3. EIP-712 signature valid dan recovered === receiver
 *
 * @param policy         - SessionPolicyV2 dari QR / URL
 * @param blockTimestamp - Timestamp dari block, bukan Date.now()
 * @returns policy yang terverifikasi (same object)
 * @throws  INVALID_SESSION_POLICY_V2_VERSION | SESSION_POLICY_V2_EXPIRED | INVALID_SESSION_POLICY_V2_SIGNATURE
 */
export function decodeSessionPolicyV2(
  policy: SessionPolicyV2,
  blockTimestamp: number
): SessionPolicyV2 {

  if (policy.version !== "payid.session.policy.v2") {
    throw new Error("INVALID_SESSION_POLICY_V2_VERSION");
  }

  if (blockTimestamp >= policy.expiresAt) {
    throw new Error("SESSION_POLICY_V2_EXPIRED");
  }

  const payIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(policy.payId));
  const domain = buildSessionPolicyV2Domain(policy.chainId, policy.verifyingContract);
  const value = {
    receiver: policy.receiver,
    ruleSetHash: policy.ruleSetHash,
    ruleAuthority: policy.ruleAuthority,
    allowedAsset: policy.allowedAsset,
    maxAmount: BigInt(policy.maxAmount),
    expiresAt: policy.expiresAt,
    policyNonce: policy.policyNonce,
    payId: payIdBytes32,
  };

  const recovered = ethers.verifyTypedData(domain, SESSION_POLICY_V2_TYPES, value, policy.signature);

  if (recovered.toLowerCase() !== policy.receiver.toLowerCase()) {
    throw new Error("INVALID_SESSION_POLICY_V2_SIGNATURE");
  }

  return policy;
}

// Browser-compatible base64url helpers
function base64urlEncode(str: string): string {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  let binary = '';
  uint8Array.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const uint8Array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array);
}

/**
 * Encode SessionPolicyV2 ke QR / URL string.
 * Format: "payid-v2:<base64url(JSON)>"
 */
export function encodeSessionPolicyV2QR(policy: SessionPolicyV2): string {
  const encoded = base64urlEncode(JSON.stringify(policy));
  return `payid-v2:${encoded}`;
}

/**
 * Decode QR / URL string ke SessionPolicyV2.
 * @throws QR_FORMAT_UNKNOWN | QR_CORRUPT | SESSION_POLICY_V2_INVALID
 */
export function decodeSessionPolicyV2QR(qrString: string): SessionPolicyV2 {
  const PREFIX = "payid-v2:";

  if (!qrString.startsWith(PREFIX)) {
    throw new Error(
      `QR_FORMAT_UNKNOWN: harus diawali "${PREFIX}". Got: ${qrString.slice(0, 20)}...`
    );
  }

  let policy: SessionPolicyV2;
  try {
    const json = base64urlDecode(qrString.slice(PREFIX.length));
    policy = JSON.parse(json);
  } catch {
    throw new Error("QR_CORRUPT: tidak bisa di-decode");
  }

  const required: (keyof SessionPolicyV2)[] = [
    "version", "receiver", "ruleSetHash", "ruleAuthority",
    "allowedAsset", "maxAmount", "expiresAt", "policyNonce",
    "payId", "chainId", "verifyingContract", "signature",
  ];

  for (const f of required) {
    if (policy[f] == null) {
      throw new Error(`SESSION_POLICY_V2_INVALID: field "${f}" tidak ada`);
    }
  }

  return policy;
}
