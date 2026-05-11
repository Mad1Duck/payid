// sessionPolicy/create.ts
import { ethers } from "ethers";
import type { RuleConfig } from "../types";
import { canonicalizeRuleSet } from "../rule/canonicalize";
import { randomHex } from "../utils/randomHex";
import type { PayIDSessionPolicyPayloadV1, SessionPolicyV2 } from "./types";

// ─── V1 (legacy) ─────────────────────────────────────────────────────────────

/**
 * @deprecated V1 session policies have no chain binding and are vulnerable to
 * cross-chain signature replay attacks. Use createSessionPolicyV2 instead.
 * This function now throws to prevent creation of new V1 policies.
 */
export async function createSessionPolicyPayload(
  _params: {
    receiver: string;
    rule: RuleConfig;
    expiresAt: number;
    signer: ethers.Signer;
  }
): Promise<PayIDSessionPolicyPayloadV1> {
  throw new Error(
    "SESSION_POLICY_V1_DISABLED: V1 policies have no chainId binding and are " +
    "vulnerable to cross-chain replay. Use createSessionPolicyV2() instead."
  );
}

// ─── V2 (Channel A) ──────────────────────────────────────────────────────────

const SESSION_POLICY_V2_DOMAIN_NAME = "PAY.ID SessionPolicy";
const SESSION_POLICY_V2_DOMAIN_VERSION = "1";

import type { TypedDataField } from "ethers";

export const SESSION_POLICY_V2_TYPES: Record<string, TypedDataField[]> = {
  SessionPolicy: [
    { name: "receiver", type: "address" },
    { name: "ruleSetHash", type: "bytes32" },
    { name: "ruleAuthority", type: "address" },
    { name: "allowedAsset", type: "address" },
    { name: "maxAmount", type: "uint256" },
    { name: "expiresAt", type: "uint64" },
    { name: "policyNonce", type: "bytes32" },
    { name: "payId", type: "bytes32" },
  ],
};

/**
 * Build EIP-712 domain untuk SessionPolicyV2.
 * Bind ke chainId + verifyingContract — policy tidak bisa di-replay di chain lain.
 */
export function buildSessionPolicyV2Domain(chainId: number, verifyingContract: string) {
  return {
    name: SESSION_POLICY_V2_DOMAIN_NAME,
    version: SESSION_POLICY_V2_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

/**
 * Create and sign a Channel A Session Policy (V2).
 *
 * Receiver sign CONSTRAINTS — bukan transaksi spesifik.
 * Receiver tidak perlu tahu siapa payer-nya saat membuat ini.
 *
 * Security model:
 *   - Receiver sign constraints (rule, maxAmount, asset, expiry)
 *   - Payer sign context transaksinya sendiri
 *   - Chain enforce keduanya — tidak ada self-approval
 *
 * Perbedaan dari V1:
 *   - Bind ke ruleSetHash on-chain   → payer tidak bisa swap rule
 *   - Bind ke allowedAsset+maxAmount → payer tidak bisa exceed
 *   - Bind ke chainId+verifyingContract (EIP-712) → anti cross-chain replay
 *   - Signed via EIP-712 → human-readable di wallet UI
 *
 * @throws Jika maxAmount <= 0, expiresAt sudah lewat, atau address invalid
 */
export async function createSessionPolicyV2(params: {
  receiver: string;
  ruleSetHash: string;
  ruleAuthority: string;
  allowedAsset: string;
  maxAmount: bigint;
  expiresAt: number;
  payId: string;
  chainId: number;
  verifyingContract: string;
  signer: ethers.Signer;
}): Promise<SessionPolicyV2> {
  const {
    receiver, ruleSetHash, ruleAuthority, allowedAsset,
    maxAmount, expiresAt, payId, chainId, verifyingContract, signer,
  } = params;

  const MIN_TTL_SECONDS = 60;        // minimum 1 menit
  const MAX_TTL_SECONDS = 30 * 24 * 3600; // maksimum 30 hari

  if (!ethers.isAddress(receiver)) {
    throw new Error(`SESSION_POLICY_V2: receiver address tidak valid: ${receiver}`);
  }
  if (maxAmount <= 0n) {
    throw new Error("SESSION_POLICY_V2: maxAmount harus > 0");
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now + MIN_TTL_SECONDS) {
    throw new Error(`SESSION_POLICY_V2: expiresAt terlalu dekat — minimum ${MIN_TTL_SECONDS}s dari sekarang`);
  }
  if (expiresAt > now + MAX_TTL_SECONDS) {
    throw new Error(`SESSION_POLICY_V2: expiresAt terlalu jauh — maksimum ${MAX_TTL_SECONDS / 86400} hari`);
  }

  const policyNonce = randomHex(32);
  const payIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(payId));

  const domain = buildSessionPolicyV2Domain(chainId, verifyingContract);
  const value = {
    receiver, ruleSetHash, ruleAuthority, allowedAsset,
    maxAmount, expiresAt, policyNonce, payId: payIdBytes32,
  };

  const signature = await (signer as ethers.Wallet).signTypedData(
    domain, SESSION_POLICY_V2_TYPES, value
  );

  // Self-verify — pastikan signature valid sebelum return
  const recovered = ethers.verifyTypedData(domain, SESSION_POLICY_V2_TYPES, value, signature);
  if (recovered.toLowerCase() !== receiver.toLowerCase()) {
    throw new Error("SESSION_POLICY_V2: self-verification gagal");
  }

  return {
    version: "payid.session.policy.v2",
    receiver, ruleSetHash, ruleAuthority, allowedAsset,
    maxAmount: maxAmount.toString(),
    expiresAt, policyNonce, payId,
    chainId, verifyingContract, signature,
  };
}