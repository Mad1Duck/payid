import type { EnvContext } from "payid-types";
import { Wallet, keccak256, toUtf8Bytes } from "ethers";
import { signAttestation } from "./signAttestation";

export async function issueEnvContext(wallet: Wallet): Promise<EnvContext> {
  const payload = {
    timestamp: Math.floor(Date.now() / 1000)
  };

  return {
    ...payload,
    proof: await signAttestation(wallet, payload, 30)
  };
}
