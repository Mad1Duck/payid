import type { DecisionPayload, DecisionProof } from "./types";
import { hashContext, hashRuleSet } from "./hash";
import { ethers, ZeroAddress } from "ethers";
import { randomHex } from "../utils/randomHex";

const hash = (v: string) =>
  ethers.keccak256(ethers.toUtf8Bytes(v));

export async function generateDecisionProof(params: {
  payId: string;

  payer: string;
  receiver: string;

  asset: string;
  amount: bigint;

  context: any;
  ruleConfig: any;

  signer: ethers.Signer;
  ruleAuthority: string;
  verifyingContract: string;
  ttlSeconds?: number;

  // FIX: tambah chainId opsional — skip getNetwork() RPC call
  // Kalau tidak diisi, fallback ke getNetwork() (behaviour lama)
  chainId?: number;
}): Promise<DecisionProof> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (params.ttlSeconds ?? 60);

  // FIX: pakai chainId dari params kalau ada, baru fallback ke RPC
  // getNetwork() di sini yang bikin hang kalau RPC lambat
  const chainId = params.chainId
    ?? Number((await params.signer.provider!.getNetwork()).chainId);

  const requiresAttestation =
    Array.isArray(params.ruleConfig?.requires) &&
    params.ruleConfig.requires.length > 0;

  const payload: DecisionPayload = {
    version: hash("2"),
    payId: hash(params.payId),

    payer: params.payer,
    receiver: params.receiver,

    asset: params.asset,
    amount: params.amount,

    contextHash: hashContext(params.context),
    ruleSetHash: hashRuleSet(params.ruleConfig),

    ruleAuthority: params.ruleAuthority ?? ZeroAddress,

    issuedAt: BigInt(now),
    expiresAt: BigInt(expiresAt),

    nonce: randomHex(32),
    requiresAttestation
  };

  const domain = {
    name: "PAY.ID Decision",
    version: "2",
    chainId,   // FIX: langsung pakai, tidak perlu await lagi
    verifyingContract: params.verifyingContract,
  };

  const types = {
    Decision: [
      { name: "version", type: "bytes32" },
      { name: "payId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "contextHash", type: "bytes32" },
      { name: "ruleSetHash", type: "bytes32" },
      { name: "ruleAuthority", type: "address" },
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "nonce", type: "bytes32" },
      { name: "requiresAttestation", type: "bool" },
    ],
  };

  const signature = await params.signer.signTypedData(domain, types, payload);

  const recovered = ethers.verifyTypedData(domain, types, payload, signature);

  if (recovered.toLowerCase() !== params.payer.toLowerCase()) {
    throw new Error("SIGNATURE_MISMATCH");
  }

  return { payload, signature };
}