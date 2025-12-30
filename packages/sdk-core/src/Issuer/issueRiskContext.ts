import type { Wallet } from "ethers";
import type { RiskContext } from "payid-types";
import { signAttestation } from "./signAttestation";

export async function issueRiskContext(
  wallet: Wallet,
  score: number,
  category: string,
  modelHash: string
): Promise<RiskContext> {
  const payload = { score, category, modelHash };

  const signAttestationData = await signAttestation(wallet, payload, 120);

  return {
    score,
    category,
    proof: {
      ...signAttestationData,
      modelHash
    }
  };
}
