import { ethers, keccak256, toUtf8Bytes, toBeArray } from "ethers";
import type { Attestation } from "../types/attestation";

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

  if (proof.issuedAt > now) {
    throw new Error("ATTESTATION_ISSUED_IN_FUTURE");
  }

  const payloadHash = keccak256(toUtf8Bytes(JSON.stringify(payload)));

  // Use recoverAddress with explicit Ethereum message hash to avoid
  // ambiguity between verifyMessage(string) and verifyMessage(bytes).
  const messageHash = ethers.hashMessage(toBeArray(payloadHash));
  const recovered = ethers.recoverAddress(messageHash, proof.signature);

  if (recovered.toLowerCase() !== proof.issuer.toLowerCase()) {
    throw new Error("INVALID_ATTESTATION_SIGNATURE");
  }
}
