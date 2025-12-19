import { ethers } from "ethers";
import type { DecisionProof } from "../decision-proof/types";

export function buildPayCallData(
  contractAddress: string,
  proof: DecisionProof
): string {
  const iface = new ethers.Interface([
    "function pay(bytes payload, bytes signature)"
  ]);

  return iface.encodeFunctionData("pay", [
    ethers.toUtf8Bytes(JSON.stringify(proof.payload)),
    proof.signature
  ]);
}
