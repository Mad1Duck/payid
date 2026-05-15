/**
 * Debug script: verify EIP-712 hash match and contract state
 * Run: npx hardhat run scripts/debug-verify.ts --network devnode
 */
import { ethers } from "hardhat";

const PAYID_VERIFIER  = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
const PAYWITH_PAYID   = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
const CHAIN_ID        = 31337;

// Paste the Decision args from the latest failed tx here
const PAYLOAD = {
  version:            "0xad7c5bef027816a800da1736444fb58a807ef4c9603b7848673f7e3a68eb14a5",
  payId:              "0xb52cdf2e2904e9895c9851d7f6edbb9123d590ed965751845a00e6d930f46a6f",
  payer:              "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  receiver:           "0x87587c6619b0dD3b282F684a63C186368627d893",
  asset:              "0x0000000000000000000000000000000000000000",
  amount:             ethers.parseEther("1"),
  contextHash:        "0xfe9cf27cb4756f135f94de39c583702612a57f22252436b4dcb994a0b7d75a1c",
  ruleSetHash:        "0x1c6adef4c2ce0d2ef54edfe583c8d0290645ddb04351df35fe3798b9f2f02297",
  ruleAuthority:      "0x0000000000000000000000000000000000000000",
  issuedAt:           1778848685n,
  expiresAt:          1778849015n,
  nonce:              "0xf6a6a8d5552211ca4d30fa1cac8e93ec264934b6623f979566714a9e7d92f203",
  requiresAttestation: false,
  attestationUIDsHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
};

const SIG = "0x7798a1f96c45c6bf076e10eb12fe09bf71649bec954a11bafd8f82f26259b8ce71ce1d79136854cced6f68a02fa63f577163eaec4df6fbd068fb6c3007a272071b";

const DECISION_TYPES = {
  Decision: [
    { name: "version",             type: "bytes32" },
    { name: "payId",               type: "bytes32" },
    { name: "payer",               type: "address" },
    { name: "receiver",            type: "address" },
    { name: "asset",               type: "address" },
    { name: "amount",              type: "uint256" },
    { name: "contextHash",         type: "bytes32" },
    { name: "ruleSetHash",         type: "bytes32" },
    { name: "ruleAuthority",       type: "address" },
    { name: "issuedAt",            type: "uint64"  },
    { name: "expiresAt",           type: "uint64"  },
    { name: "nonce",               type: "bytes32" },
    { name: "requiresAttestation", type: "bool"    },
    { name: "attestationUIDsHash", type: "bytes32" }, // ← MUST be included
  ],
};

async function main() {
  const verifier    = await ethers.getContractAt("PayIDVerifier",  PAYID_VERIFIER);
  const payWithPayID = await ethers.getContractAt("PayWithPayID", PAYWITH_PAYID);

  console.log("\n=== 1. Contract Initialization ===");
  console.log("PayIDVerifier.isInitialized()  :", await verifier.isInitialized());
  console.log("PayWithPayID.isInitialized()   :", await payWithPayID.isInitialized());

  console.log("\n=== 2. Verifier Address in PayWithPayID ===");
  const storedVerifier = await payWithPayID.verifier();
  console.log("PayWithPayID.verifier()        :", storedVerifier);
  console.log("Expected (payIDVerifier)       :", PAYID_VERIFIER);
  console.log("Match                          :", storedVerifier.toLowerCase() === PAYID_VERIFIER.toLowerCase());

  console.log("\n=== 3. Timestamp Check ===");
  const latestBlock = await ethers.provider.getBlock("latest");
  const blockTs = latestBlock!.timestamp;
  console.log("block.timestamp                :", blockTs);
  console.log("issuedAt                       :", Number(PAYLOAD.issuedAt));
  console.log("expiresAt                      :", Number(PAYLOAD.expiresAt));
  console.log("issuedAt > block.timestamp     :", Number(PAYLOAD.issuedAt) > blockTs, "(must be false)");
  console.log("block.timestamp > expiresAt    :", blockTs > Number(PAYLOAD.expiresAt), "(must be false)");

  console.log("\n=== 4. EIP-712 Hash Comparison ===");
  const domain = {
    name: "PAY.ID Decision",
    version: "2",
    chainId: CHAIN_ID,
    verifyingContract: PAYID_VERIFIER,
  };

  // Contract hash
  const contractHash = await verifier.hashDecision(PAYLOAD);
  console.log("contractHash                   :", contractHash);

  // SDK hash (with attestationUIDsHash — REQUIRED)
  const sdkHash = ethers.TypedDataEncoder.hash(domain, DECISION_TYPES, PAYLOAD);
  console.log("sdkHash                        :", sdkHash);
  console.log("Hash match                     :", contractHash === sdkHash);

  // SDK hash WITHOUT attestationUIDsHash (to show it breaks)
  const brokenTypes = { Decision: DECISION_TYPES.Decision.slice(0, 13) }; // drop last field
  const brokenHash = ethers.TypedDataEncoder.hash(domain, brokenTypes, PAYLOAD);
  console.log("brokenHash (missing field)     :", brokenHash);
  console.log("Broken match                   :", contractHash === brokenHash);

  console.log("\n=== 5. verifyDecision ===");
  const isValid = await verifier.verifyDecision(PAYLOAD, SIG);
  console.log("verifyDecision(payload, sig)   :", isValid);

  if (!isValid) {
    console.log("\n⚠ verifyDecision returned false. Possible causes:");
    console.log("  - Proof has expired (block.timestamp > expiresAt)");
    console.log("  - Hash mismatch (SDK type != contract typehash)");
    console.log("  - Signer != payer and not in trustedAuthorities");
    // Recover signer from sdk hash
    const recovered = ethers.recoverAddress(sdkHash, SIG);
    console.log("  Recovered signer (from sdkHash)  :", recovered);
    console.log("  Expected payer                   :", PAYLOAD.payer);
    console.log("  Signer == payer                  :", recovered.toLowerCase() === PAYLOAD.payer.toLowerCase());
  }
}

main().catch(console.error);
