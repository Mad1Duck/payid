import type { Wallet } from "ethers";
import type { StateContext } from "payid-types";
import { signAttestation } from "./signAttestation";

export async function issueStateContext(
  wallet: Wallet,
  spentToday: string,
  period: string
): Promise<StateContext> {
  const payload = { spentToday, period };

  return {
    ...payload,
    proof: await signAttestation(wallet, payload, 60)
  };
}
