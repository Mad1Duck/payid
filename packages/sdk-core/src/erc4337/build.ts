import { ethers } from "ethers";
import type { DecisionProof } from "../decision-proof/types";

// ABI PayWithPayID yang sudah diupdate (EAS-based)
const PAY_WITH_PAYID_ABI = [
  // ETH payment — attestationUIDs adalah EAS UIDs, pass [] jika tidak perlu
  "function payETH((bytes32 version, bytes32 payId, address payer, address receiver, address asset, uint256 amount, bytes32 contextHash, bytes32 ruleSetHash, address ruleAuthority, uint64 issuedAt, uint64 expiresAt, bytes32 nonce, bool requiresAttestation) d, bytes sig, bytes32[] attestationUIDs) payable",

  // ERC20 payment
  "function payERC20((bytes32 version, bytes32 payId, address payer, address receiver, address asset, uint256 amount, bytes32 contextHash, bytes32 ruleSetHash, address ruleAuthority, uint64 issuedAt, uint64 expiresAt, bytes32 nonce, bool requiresAttestation) d, bytes sig, bytes32[] attestationUIDs)",
];

/**
 * Encode calldata untuk payETH
 * FIX: ABI lama pakai (d, sig, payloadHashes[], Attestation[]) — sudah tidak match
 *      ABI baru pakai (d, sig, bytes32[] attestationUIDs)
 */
export function buildPayETHCallData(
  contractAddress: string,
  proof: DecisionProof,
  attestationUIDs: string[] = []   // EAS UIDs, default [] jika tidak perlu attestation
): string {
  const iface = new ethers.Interface(PAY_WITH_PAYID_ABI);

  return iface.encodeFunctionData("payETH", [
    proof.payload,
    proof.signature,
    attestationUIDs
  ]);
}

/**
 * Encode calldata untuk payERC20
 */
export function buildPayERC20CallData(
  contractAddress: string,
  proof: DecisionProof,
  attestationUIDs: string[] = []   // EAS UIDs, default [] jika tidak perlu attestation
): string {
  const iface = new ethers.Interface(PAY_WITH_PAYID_ABI);

  return iface.encodeFunctionData("payERC20", [
    proof.payload,
    proof.signature,
    attestationUIDs
  ]);
}

/**
 * @deprecated Gunakan buildPayETHCallData atau buildPayERC20CallData
 * Fungsi lama ini pakai ABI yang tidak match dengan contract baru
 */
export function buildPayCallData(
  contractAddress: string,
  proof: DecisionProof,
  attestationUIDs: string[] = []
): string {
  return buildPayERC20CallData(contractAddress, proof, attestationUIDs);
}