import { ethers } from "ethers";
import type { DecisionProof } from "../decision-proof/types";

// ABI PayWithPayID yang sudah diupdate (EAS-based)
// Decision struct must exactly mirror PayIDVerifier.sol Decision struct (14 fields).
// Field order and types are load-bearing for ABI encoding — any mismatch causes
// on-chain decode failure and silent wrong-value reads.
const DECISION_TUPLE =
  "bytes32 version," +
  "bytes32 payId," +
  "address payer," +
  "address receiver," +
  "address asset," +
  "uint256 amount," +
  "bytes32 contextHash," +
  "bytes32 ruleSetHash," +
  "address ruleAuthority," +
  "uint64 issuedAt," +
  "uint64 expiresAt," +
  "bytes32 nonce," +
  "bool requiresAttestation," +
  "bytes32 attestationUIDsHash";

const PAY_WITH_PAYID_ABI = [
  `function payNative((${DECISION_TUPLE}) d, bytes sig, bytes32[] attestationUIDs) payable`,
  `function payERC20((${DECISION_TUPLE}) d, bytes sig, bytes32[] attestationUIDs)`,
];

/**
 * Encode calldata untuk payNative (native token: ETH, MATIC, A0GI, etc.)
 */
export function buildPayNativeCallData(
  contractAddress: string,
  proof: DecisionProof,
  attestationUIDs: string[] = []   // EAS UIDs, default [] jika tidak perlu attestation
): string {
  const iface = new ethers.Interface(PAY_WITH_PAYID_ABI);

  return iface.encodeFunctionData("payNative", [
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

