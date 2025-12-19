import { ethers } from "ethers";
import type { DecisionPayload } from "./types";

export async function signDecision(
  signer: ethers.Signer,
  chainId: number,
  verifyingContract: string,
  payload: DecisionPayload
): Promise<string> {
  const domain = {
    name: "PAY.ID Decision",
    version: "1",
    chainId,
    verifyingContract
  };

  const types = {
    Decision: [
      { name: "version", type: "string" },
      { name: "payId", type: "string" },
      { name: "owner", type: "address" },
      { name: "decision", type: "uint8" },
      { name: "contextHash", type: "bytes32" },
      { name: "ruleSetHash", type: "bytes32" },
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "nonce", type: "bytes32" }
    ]
  };

  if (typeof (signer as any).signTypedData === "function") {
    return await (signer as any).signTypedData(domain, types, payload);
  }

  if (typeof (signer as any)._signTypedData === "function") {
    return await (signer as any)._signTypedData(domain, types, payload);
  }

  throw new Error(
    "Signer does not support EIP-712 signing (signTypedData)"
  );
}
