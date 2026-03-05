/**
 * generate-policy.ts — DIJALANKAN OLEH RECEIVER
 * 
 * Receiver jalankan ini SEKALI untuk generate QR.
 * Setelah QR di-print/simpan, receiver bisa offline.
 * Private key receiver TIDAK pernah keluar dari script ini.
 * 
 * Run: bun run examples/simple/generate-policy.ts
 */

import { ethers } from "ethers";
import { createSessionPolicyV2, encodeSessionPolicyV2QR } from "payid/sessionPolicy";
import { envData } from "../../config/config";
import combinedAbi from "../../shared/PayIDModule#CombinedRuleStorage.json";

const {
  rpcUrl: RPC_URL,
  contract: {
    mockUSDC: USDC,
    payIdVerifier: PAYID_VERIFIER,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
  },
  account: {
    reciverPk: RECEIVER_PRIVATE_KEY,   // hanya receiver yang punya ini
    reciverAddress: RECEIVER_ADDRESS,
  },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const receiverWallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);

async function main() {
  console.log("=== PAY.ID Session Policy Generator ===");
  console.log("Receiver:", receiverWallet.address);

  // Fetch ruleSetHash dari chain
  const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
  const ruleSetHash: string = await combined.getFunction("activeRuleOf")(RECEIVER_ADDRESS);
  if (ruleSetHash === ethers.ZeroHash) throw new Error("No active rule set");
  console.log("ruleSetHash:", ruleSetHash);

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const block = await provider.getBlock("latest");
  const blockTs = block!.timestamp;

  // Receiver sign policy constraints
  const sessionPolicy = await createSessionPolicyV2({
    receiver: RECEIVER_ADDRESS,
    ruleSetHash,
    ruleAuthority: COMBINED_RULE_STORAGE,
    allowedAsset: USDC,
    maxAmount: 500_000_000n,
    expiresAt: blockTs + 60 * 60 * 24, // 24 jam
    payId: "pay.id/lisk-sepolia-demo",
    chainId,
    verifyingContract: PAYID_VERIFIER,
    signer: receiverWallet,
  });

  // Output QR string — ini yang di-share ke payer (tidak ada private key di sini)
  const qrString = encodeSessionPolicyV2QR(sessionPolicy);

  console.log("\n=== QR STRING (share ini ke payer) ===");
  console.log(qrString);
  console.log("=======================================");
  console.log("Receiver bisa offline sekarang.");
}

main().catch(console.error);