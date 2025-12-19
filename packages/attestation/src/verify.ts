import { ethers, keccak256, toUtf8Bytes, verifyMessage, toBeArray } from "ethers";
import type { Attestation } from "./types";

export function verifyAttestation(
  payload: object,
  proof: Attestation,
  trustedIssuers: Set<string>
) {
  const now = Math.floor(Date.now() / 1000);

  if (!trustedIssuers.has(proof.issuer)) {
    throw new Error("UNTRUSTED_ATTESTATION_ISSUER");
  }

  if (proof.expiresAt < now) {
    throw new Error("ATTESTATION_EXPIRED");
  }

  const hash = keccak256(
    toUtf8Bytes(JSON.stringify(payload))
  );

  const recovered = verifyMessage(
    toBeArray(hash),
    proof.signature
  );

  if (recovered.toLowerCase() !== proof.issuer.toLowerCase()) {
    throw new Error("INVALID_ATTESTATION_SIGNATURE");
  }
}
