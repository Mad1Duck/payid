import type { DecisionPayload, DecisionProof } from "./types";
import { hashContext, hashRuleSet } from "./hash";
import { signDecision } from "./sign";
import { ethers } from "ethers";
import { randomHex } from "../utils/randomHex";

export async function generateDecisionProof(params: {
  payId: string;
  owner: string;
  decision: "ALLOW" | "REJECT";
  context: any;
  ruleConfig: any;
  signer: ethers.Signer;
  chainId: number;
  verifyingContract: string;
  ttlSeconds?: number;
}): Promise<DecisionProof> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (params.ttlSeconds ?? 60);

  const payload: DecisionPayload = {
    version: "payid.decision.v1",
    payId: params.payId,
    owner: params.owner,
    decision: params.decision === "ALLOW" ? 1 : 0,
    contextHash: hashContext(params.context),
    ruleSetHash: hashRuleSet(params.ruleConfig),
    issuedAt,
    expiresAt,
    nonce: randomHex(32)
  };

  const signature = await signDecision(
    params.signer,
    params.chainId,
    params.verifyingContract,
    payload
  );

  return { payload, signature };
}
