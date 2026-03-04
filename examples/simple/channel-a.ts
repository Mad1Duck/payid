/**
 * CHANNEL A — examples/simple/channel-a.ts
 *
 * Thin wrapper di atas sdk-core/sessionPolicy.
 * Fungsi create/encode/decode hidup di packages/sdk-core.
 * File ini hanya expose claimSessionPolicy() yang butuh PayIDClient + wasm.
 */

import { ethers } from "ethers";
import { createPayID } from "payid/client";
import { decodeSessionPolicyV2 } from "payid/sessionPolicy";
import type { SessionPolicyV2 } from "payid/sessionPolicy";
import type { AuthorityRule, ClaimResult } from "./channel-a.types";

// Re-export semua yang dibutuhkan dari satu tempat
export {
  createSessionPolicyV2    as createSessionPolicy,
  encodeSessionPolicyV2QR  as encodeSessionPolicyQR,
  decodeSessionPolicyV2QR  as decodeSessionPolicyQR,
} from "payid/sessionPolicy";

export type { SessionPolicyV2 as SessionPolicy } from "payid/sessionPolicy";

// ─── claimSessionPolicy ────────────────────────────────────────────────────

export interface ClaimSessionPolicyParams {
  policy:            SessionPolicyV2;
  payer:             string;
  amount:            bigint;
  signer:            ethers.Signer;
  blockTimestamp:    number;
  chainId:           number;
  verifyingContract: string;
  ttlSeconds?:       number;
  authorityRule:     AuthorityRule;
  wasm:              Uint8Array;
}

/**
 * Payer claim policy receiver dan generate Decision Proof.
 *
 * Guard berurutan:
 *   1. Verifikasi EIP-712 signature policy (decodeSessionPolicyV2)
 *   2. Cek amount ≤ maxAmount
 *   3. Build context deterministik (tx.*, env.timestamp dari block)
 *   4. Evaluate rule via WASM
 *   5. Payer sign Decision Proof
 */
export async function claimSessionPolicy(
  params: ClaimSessionPolicyParams
): Promise<ClaimResult> {
  const {
    policy, payer, amount, signer,
    blockTimestamp, chainId, verifyingContract,
    ttlSeconds = 300, authorityRule, wasm,
  } = params;

  // [1] Verifikasi policy signature + expiry check
  decodeSessionPolicyV2(policy, blockTimestamp);

  // [2] Amount constraint
  const maxAmount = BigInt(policy.maxAmount);
  if (amount > maxAmount) {
    throw new Error(`AMOUNT_EXCEEDS_POLICY: ${amount} > maxAmount ${maxAmount}`);
  }
  if (amount <= 0n) {
    throw new Error("AMOUNT_ZERO");
  }

  // [3] Context — deterministik, on-chain only
  // Tidak ada oracle / risk / field yang bisa di-inject bebas
  const context = {
    tx: {
      sender:   payer,
      receiver: policy.receiver,
      asset:    policy.allowedAsset,
      amount:   amount.toString(),
      chainId,
    },
    payId: {
      id:    policy.payId,
      owner: policy.receiver,
    },
    env: {
      timestamp: blockTimestamp, // dari block, bukan Date.now()
    },
  };

  // [4+5] Evaluate rule + payer sign proof
  const payid = createPayID({ wasm });

  const { result, proof } = await payid.evaluateAndProve({
    context,
    authorityRule,
    sessionPolicyV2:     policy,          // SDK akan verify signature-nya lagi
    payId:               policy.payId,
    payer,
    receiver:            policy.receiver,
    asset:               policy.allowedAsset,
    amount,
    signer,                               // payer sign context proof
    ttlSeconds,
    verifyingContract,
    ruleAuthority:       policy.ruleAuthority,
    ruleSetHashOverride: policy.ruleSetHash,
    chainId,
    blockTimestamp,
  });

  return {
    proof: proof
      ? { payload: proof.payload as any, signature: proof.signature }
      : null as any,
    policy,
    evaluation: {
      decision: result.decision as "ALLOW" | "REJECT",
      code:     result.code,
      reason:   result.reason,
    },
  };
}
