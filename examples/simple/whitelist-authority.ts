/**
 * SETUP — Whitelist RuleAuthorities di PayIDVerifier
 *
 * Jalankan ini SEKALI setelah deploy kalau pakai ignition module lama
 * (yang belum ada setTrustedAuthority calls).
 *
 * Run: bun run setup:whitelist
 */

import { ethers, NonceManager } from "ethers";
import payIdVerifierAbi from "../shared/PayIDModule#PayIDVerifier.json";
import { envData } from "../config/config";

const {
  rpcUrl: RPC_URL,
  contract: {
    payIdVerifier: PAYID_VERIFIER,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
  },
  account: { adminPk: ADMIN_PRIVATE_KEY },  // harus pakai account[0] = admin/deployer
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const admin = new NonceManager(
  new ethers.Wallet(ADMIN_PRIVATE_KEY, provider)
);

console.log("Admin:", await admin.getAddress());

const payIdVerifier = new ethers.Contract(
  PAYID_VERIFIER,
  payIdVerifierAbi.abi,
  admin
);

async function main() {

  // Cek apakah sudah di-whitelist
  const alreadyTrusted: boolean =
    await payIdVerifier.getFunction("trustedAuthorities")(COMBINED_RULE_STORAGE);

  console.log("CombinedRuleStorage trusted:", alreadyTrusted);

  if (alreadyTrusted) {
    console.log("✅ Already whitelisted, nothing to do");
    return;
  }

  // Whitelist CombinedRuleStorage
  console.log("📝 Whitelisting CombinedRuleStorage...");
  const tx = await payIdVerifier
    .getFunction("setTrustedAuthority")
    .send(COMBINED_RULE_STORAGE, true);

  console.log("TX hash:", tx.hash);
  await tx.wait();
  console.log("✅ CombinedRuleStorage whitelisted");

  // Verify
  const nowTrusted: boolean =
    await payIdVerifier.getFunction("trustedAuthorities")(COMBINED_RULE_STORAGE);
  console.log("Verified trusted:", nowTrusted);
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.reason ?? err?.message);
  process.exit(1);
});