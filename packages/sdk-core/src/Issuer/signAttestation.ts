import { Wallet, keccak256, toUtf8Bytes } from "ethers";
import type { Attestation } from "payid-types";

export async function signAttestation(
  issuerWallet: Wallet,
  payload: object,
  ttlSeconds = 60
): Promise<Attestation> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttlSeconds;

  const hash = keccak256(
    toUtf8Bytes(JSON.stringify(payload))
  );

  const signature = await issuerWallet.signMessage(
    Buffer.from(hash.slice(2), "hex")
  );

  return {
    issuer: issuerWallet.address,
    issuedAt,
    expiresAt,
    signature
  };
}
