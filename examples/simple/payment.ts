/**
 * DEBUG — Diagnose kenapa payERC20 revert
 *
 * Run ini sebelum client.ts kalau ada error "missing revert data"
 * Akan print exact step mana yang gagal.
 *
 * Run: bun run examples/simple/debug-payment.ts
 */
import { ethers } from "ethers";
import { envData } from "../config/config";
import payAbi from "../shared/PayIDModule#PayWithPayID.json";
import verifierAbi from "../shared/PayIDModule#PayIDVerifier.json";
import combinedAbi from "../shared/PayIDModule#CombinedRuleStorage.json";
import ruleAbi from "../shared/PayIDModule#RuleItemERC721.json";
import usdcAbi from "../shared/PayIDModule#MockUSDC.json";

const {
  rpcUrl: RPC_URL,
  contract: {
    payWithPayId: PAY_CONTRACT,
    payIdVerifier: PAYID_VERIFIER,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
    ruleItemERC721: RULE_ITEM_ERC721,
    mockUSDC: USDC,
  },
  account: { senderPk: SENDER_PRIVATE_KEY, reciverAddress: RECIVER_ADDRESS },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

const RECEIVER = RECIVER_ADDRESS; // account[2] hardhat
const AMOUNT = 150_000_000n;

async function main() {
  console.log("=== PAY.ID Debug ===\n");

  const verifier = new ethers.Contract(PAYID_VERIFIER, verifierAbi.abi, provider);
  const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
  const ruleNFT = new ethers.Contract(RULE_ITEM_ERC721, ruleAbi.abi, provider);
  const usdc = new ethers.Contract(USDC, usdcAbi.abi, provider);

  // ── 1. Check CombinedRuleStorage trusted ─────────────────────────────────
  const trusted: boolean =
    await verifier.getFunction("trustedAuthorities")(COMBINED_RULE_STORAGE);
  console.log("[1] CombinedRuleStorage trusted:", trusted);
  if (!trusted) {
    console.log("    FIX: run whitelist-authority.ts dulu");
    return;
  }

  // ── 2. Check active rule set ──────────────────────────────────────────────
  const ruleSetHash: string =
    await combined.getFunction("activeRuleOf")(RECEIVER);
  console.log("[2] Active ruleSetHash:", ruleSetHash);
  if (ruleSetHash === ethers.ZeroHash) {
    console.log("    FIX: receiver belum punya active rule — run setup:register dulu");
    return;
  }

  // ── 3. Check rule refs ────────────────────────────────────────────────────
  const [owner, ruleRefs, version] =
    await combined.getFunction("getRuleByHash")(ruleSetHash);
  console.log("[3] Rule owner  :", owner);
  console.log("    Version     :", version.toString());
  console.log("    Refs count  :", ruleRefs.length);

  if (owner.toLowerCase() !== RECEIVER.toLowerCase()) {
    console.log("    FIX: rule owner != receiver — ruleSetHash mismatch");
    return;
  }

  // ── 4. Check each NFT license expiry ─────────────────────────────────────
  const now = BigInt(Math.floor(Date.now() / 1000));

  for (let i = 0; i < ruleRefs.length; i++) {
    const { ruleNFT: nftAddr, tokenId } = ruleRefs[i];
    const nft = new ethers.Contract(nftAddr, ruleAbi.abi, provider);

    const expiry: bigint = await nft.getFunction("ruleExpiry")(tokenId);
    const nftOwner: string = await nft.getFunction("ownerOf")(tokenId);
    const expired = expiry <= now;

    console.log(`[4] Rule[${i}] NFT: ${nftAddr} #${tokenId}`);
    console.log(`    expiry  : ${expiry === 0n ? "0 (NEVER SET!)" : new Date(Number(expiry) * 1000).toISOString()}`);
    console.log(`    expired : ${expired}`);
    console.log(`    owner   : ${nftOwner}`);

    if (expiry === 0n) {
      console.log("    FIX: ruleExpiry = 0, receiver harus subscribe() sebelum activateRule()");
      console.log("    Run: bun run setup:create-rule (versi yang sudah difix)");
    } else if (expired) {
      console.log("    FIX: license expired, receiver harus extendRuleExpiry()");
    }

    if (nftOwner.toLowerCase() !== owner.toLowerCase()) {
      console.log("    FIX: NFT owner != rule owner (NFT dipindah tangan)");
    }
  }

  // ── 5. Check payer USDC balance & allowance ───────────────────────────────
  const balance: bigint =
    await usdc.getFunction("balanceOf")(payerWallet.address);
  const allowance: bigint =
    await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);

  console.log("\n[5] Payer USDC balance  :", balance.toString());
  console.log("    Payer USDC allowance:", allowance.toString());
  console.log("    Amount needed       :", AMOUNT.toString());

  if (balance < AMOUNT) {
    console.log("    FIX: payer tidak punya cukup USDC — mint dulu");
    console.log("    Run: bun run examples/simple/mint-usdc.ts");
  }
  if (allowance < AMOUNT) {
    console.log("    FIX: allowance kurang — approve dulu (client.ts akan handle ini)");
  }

  console.log("\n=== Diagnosis selesai ===");
}

main().catch(console.error);