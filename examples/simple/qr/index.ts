/**
 * QR Generator — Channel A
 * examples/simple/qr/index.ts
 *
 * Receiver jalankan sekali untuk generate QR.
 * Output bisa di-print, di-display di toko, atau di-embed di website.
 *
 * Run: bun run examples/simple/qr/index.ts
 */

import { ethers } from "ethers";
import { envData } from "../../config/config";
import { createSessionPolicy, encodeSessionPolicyQR } from "../channel-a";
import combinedAbi from "../../shared/PayIDModule#CombinedRuleStorage.json";

const {
  rpcUrl: RPC_URL,
  contract: {
    payIdVerifier: PAYID_VERIFIER,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
    mockUSDC: USDC,
  },
  account: {
    reciverPk: RECEIVER_PRIVATE_KEY,
    reciverAddress: RECEIVER_ADDRESS,
  },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const receiverWallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);

async function main() {
  console.log("=== PAY.ID QR Generator (Channel A) ===\n");
  console.log("Receiver:", receiverWallet.address);

  // [1] Fetch ruleSetHash dari chain
  console.log("\n[1/3] Fetching active rule set...");
  const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
  const ruleSetHash: string = await combined.getFunction("activeRuleOf")(RECEIVER_ADDRESS);

  if (ruleSetHash === ethers.ZeroHash) {
    throw new Error("Receiver belum punya active rule set. Jalankan setup:register dulu.");
  }
  console.log("  ruleSetHash:", ruleSetHash);

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // [2] Buat Session Policy
  console.log("\n[2/3] Creating Session Policy...");
  const policy = await createSessionPolicy({
    receiver: RECEIVER_ADDRESS,
    ruleSetHash,
    ruleAuthority: COMBINED_RULE_STORAGE,
    allowedAsset: USDC,
    maxAmount: 500_000_000n,             // max 500 USDC per transaksi
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 jam
    payId: "pay.id/my-store",
    chainId,
    verifyingContract: PAYID_VERIFIER,
    signer: receiverWallet,
  });

  console.log("  maxAmount:", "500 USDC");
  console.log("  expiresAt:", new Date(policy.expiresAt * 1000).toISOString());

  // [3] Encode ke QR
  console.log("\n[3/3] Encoding to QR string...");
  const qrString = encodeSessionPolicyQR(policy);

  console.log("\n─────────────────────────────────────────");
  console.log("QR String (copy ke QR generator):\n");
  console.log(qrString);
  console.log("─────────────────────────────────────────");
  console.log("\nLength  :", qrString.length, "chars");
  console.log("\n✅ Receiver tidak perlu online lagi setelah ini.");
}

main().catch((err) => {
  console.error("❌", err?.message ?? err);
  process.exit(1);
});
