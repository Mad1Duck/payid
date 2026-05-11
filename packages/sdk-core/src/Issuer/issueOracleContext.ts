import type { Wallet } from "ethers";
import { signAttestation } from "./signAttestation";
import type { OracleContext } from "../types";

export async function issueOracleContext(
  wallet: Wallet,
  data: Record<string, string | number>
): Promise<OracleContext> {
  const proof = await signAttestation(wallet, data, 120);
  return { ...data, proof };
}
