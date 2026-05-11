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
  ruleSetHashOverride?: string;
  signer: ethers.Signer;
  ruleAuthority: string;
  verifyingContract: string;
  ttlSeconds?: number;
  chainId?: number;
  blockTimestamp?: number;
  attestationUIDs?: string[];
}): Promise<DecisionProof> {
  // L1: zero-address guard
  if (!ethers.isAddress(params.payer) || params.payer === ethers.ZeroAddress) {
    throw new Error("GENERATE_PROOF: payer address tidak valid atau zero");
  }
  if (!ethers.isAddress(params.receiver) || params.receiver === ethers.ZeroAddress) {
    throw new Error("GENERATE_PROOF: receiver address tidak valid atau zero");
  }
  if (!ethers.isAddress(params.verifyingContract) || params.verifyingContract === ethers.ZeroAddress) {
    throw new Error("GENERATE_PROOF: verifyingContract tidak valid atau zero");
  }
  if (params.amount <= 0n) {
    throw new Error("GENERATE_PROOF: amount harus > 0");
  }

  const now = params.blockTimestamp ?? Math.floor(Date.now() / 1000);
  const issuedAt = now - 30;
  const expiresAt = now + (params.ttlSeconds ?? 300);

  // M4: chainId validation — derive from provider only if not provided,
  // then verify it's a positive integer to catch RPC misconfigurations.
  let chainId = params.chainId;
  if (!chainId && params.signer.provider) {
    const network = await params.signer.provider.getNetwork();
    chainId = Number(network.chainId);
  }
  if (!chainId || chainId <= 0 || !Number.isInteger(chainId)) {
    throw new Error(`GENERATE_PROOF: chainId tidak valid: ${chainId}`);
  }

  const requiresAttestation =
    Array.isArray(params.ruleConfig?.requires) &&
    params.ruleConfig.requires.length > 0;

  const attestationUIDsHash = params.attestationUIDs
    ? ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32[]"], [params.attestationUIDs]))
    : ethers.ZeroHash;

  const payload: DecisionPayload = {
    version: hash("2"),
    payId: hash(params.payId),
    payer: params.payer,
    receiver: params.receiver,
    asset: params.asset,
    amount: params.amount,
    contextHash: hashContext(params.context),
    ruleSetHash: params.ruleSetHashOverride ?? hashRuleSet(params.ruleConfig),
    ruleAuthority: params.ruleAuthority ?? ZeroAddress,
    issuedAt: BigInt(issuedAt),
    expiresAt: BigInt(expiresAt),
    nonce: randomHex(32),
    requiresAttestation,
    attestationUIDsHash
  };

  const domain = {
    name: "PAY.ID Decision",
    version: "2",
    chainId: chainId,
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
      { name: "attestationUIDsHash", type: "bytes32" },
    ],
  };

  const signature = await params.signer.signTypedData(domain, types, payload);
  const recovered = ethers.verifyTypedData(domain, types, payload, signature);

  // Verify against actual signer address — NOT hardcoded to payer.
  // In Channel A: signer = receiver (signs on behalf of their policy).
  // In Channel B/server: signer = server wallet.
  // In legacy client mode: signer = payer.
  const signerAddress = await params.signer.getAddress();
  if (recovered.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("SIGNATURE_MISMATCH");
  }

  return { payload, signature };
}