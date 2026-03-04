/**
 * CHANNEL A — End-to-End Example
 * examples/simple/channel-a.example.ts
 *
 * Simulasi lengkap flow Channel A dalam satu script.
 *
 * RECEIVER SIDE (offline setelah ini):
 *   1. Fetch ruleSetHash dari chain
 *   2. createSessionPolicy() → sign constraints
 *   3. encodeSessionPolicyQR() → QR string
 *
 * PAYER SIDE (saat scan QR):
 *   4. decodeSessionPolicyQR() → policy
 *   5. Fetch rule configs dari IPFS
 *   6. claimSessionPolicy() → verify policy + evaluate + sign proof
 *   7. Submit payERC20()
 *
 * Run: bun run examples/simple/channel-a.example.ts
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { envData } from "../config/config";
import {
  createSessionPolicy,
  claimSessionPolicy,
  encodeSessionPolicyQR,
  decodeSessionPolicyQR,
} from "./channel-a";
import combinedAbi  from "../shared/PayIDModule#CombinedRuleStorage.json";
import ruleNFTAbi   from "../shared/PayIDModule#RuleItemERC721.json";
import usdcAbi      from "../shared/PayIDModule#MockUSDC.json";
import payWithAbi   from "../shared/PayIDModule#PayWithPayID.json";
import verifierAbi  from "../shared/PayIDModule#PayIDVerifier.json";
import type { AuthorityRule } from "./channel-a.types";

// ─── Setup ─────────────────────────────────────────────────────────────────

const {
  rpcUrl: RPC_URL,
  contract: {
    payIdVerifier:       PAYID_VERIFIER,
    payWithPayId:        PAY_CONTRACT,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
    mockUSDC:            USDC,
  },
  account: {
    senderPk:       SENDER_PRIVATE_KEY,
    reciverPk:      RECEIVER_PRIVATE_KEY,
    reciverAddress: RECEIVER_ADDRESS,
  },
} = envData;

const provider       = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet    = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
const receiverWallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);

const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "../wasm/rule_engine.wasm"))
);

console.log("Payer   :", payerWallet.address);
console.log("Receiver:", receiverWallet.address);

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchActiveRuleSet(receiver: string) {
  const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);

  const ruleSetHash: string = await combined.getFunction("activeRuleOf")(receiver);
  if (ruleSetHash === ethers.ZeroHash) {
    throw new Error(`No active rule set for: ${receiver}`);
  }

  const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

  if ((owner as string).toLowerCase() !== receiver.toLowerCase()) {
    throw new Error(`Rule owner (${owner}) !== receiver (${receiver})`);
  }

  return {
    ruleSetHash,
    version: (version as bigint).toString(),
    refs: (ruleRefs as any[]).map((r) => ({
      ruleNFT: r.ruleNFT as string,
      tokenId: (r.tokenId as bigint).toString(),
    })),
  };
}

async function loadRuleConfigs(refs: { ruleNFT: string; tokenId: string }[]) {
  return Promise.all(
    refs.map(async ({ ruleNFT, tokenId }) => {
      const nft = new ethers.Contract(ruleNFT, ruleNFTAbi.abi, provider);
      const uri: string = await nft.getFunction("tokenURI")(BigInt(tokenId));
      const url = uri.startsWith("ipfs://")
        ? `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
        : uri;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch rule: ${url}`);
      const meta: any = await res.json();
      if (!meta.rule) throw new Error(`Missing 'rule' in metadata`);
      return meta.rule;
    })
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const AMOUNT = 150_000_000n; // 150 USDC

  // Sync hardhat timestamp (dev only)
  const nowTs = Math.floor(Date.now() / 1000);
  await provider.send("evm_setNextBlockTimestamp", [nowTs]);
  await provider.send("evm_mine", []);

  const block   = await provider.getBlock("latest");
  const blockTs = block!.timestamp;
  const chainId = Number((await provider.getNetwork()).chainId);

  // ══════════════════════════════════════════════════════
  //  RECEIVER SIDE — dilakukan sekali, boleh offline setelahnya
  // ══════════════════════════════════════════════════════

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║      RECEIVER SIDE (offline OK)      ║");
  console.log("╚══════════════════════════════════════╝");

  console.log("\n[R-1] Fetching rule set from chain...");
  const ruleSet = await fetchActiveRuleSet(RECEIVER_ADDRESS);
  console.log("  ruleSetHash:", ruleSet.ruleSetHash);
  console.log("  ✅ Rule owner verified");

  console.log("\n[R-2] Creating Session Policy...");
  const policy = await createSessionPolicy({
    receiver:          RECEIVER_ADDRESS,
    ruleSetHash:       ruleSet.ruleSetHash,
    ruleAuthority:     COMBINED_RULE_STORAGE,
    allowedAsset:      USDC,
    maxAmount:         500_000_000n,              // max 500 USDC
    expiresAt:         blockTs + 60 * 60 * 24,   // 24 jam
    payId:             "pay.id/lisk-demo",
    chainId,
    verifyingContract: PAYID_VERIFIER,
    signer:            receiverWallet,
  });
  console.log("  maxAmount :", "500 USDC");
  console.log("  expiresAt :", new Date(policy.expiresAt * 1000).toISOString());
  console.log("  ✅ Policy signed by receiver");

  console.log("\n[R-3] Encoding to QR...");
  const qrString = encodeSessionPolicyQR(policy);
  console.log("  Length:", qrString.length, "chars");
  console.log("  → Receiver bisa offline sekarang ←");

  // ══════════════════════════════════════════════════════
  //  PAYER SIDE — saat scan QR
  // ══════════════════════════════════════════════════════

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║        PAYER SIDE (scan QR)          ║");
  console.log("╚══════════════════════════════════════╝");

  console.log("\n[P-1] Decoding QR...");
  const scannedPolicy = decodeSessionPolicyQR(qrString);
  console.log("  receiver :", scannedPolicy.receiver);
  console.log("  maxAmount:", scannedPolicy.maxAmount, "μUSDC");

  console.log("\n[P-2] Loading rule configs from IPFS...");
  const ruleConfigs = await loadRuleConfigs(ruleSet.refs);
  const authorityRule: AuthorityRule = {
    version: ruleSet.version,
    logic:   "AND",
    rules:   ruleConfigs,
  };
  console.log("  rules:", ruleConfigs.length);

  console.log("\n[P-3] Claiming policy...");
  console.log("  amount  :", AMOUNT.toString(), "μUSDC");
  console.log("  signer  : payer (sign context, bukan policy)");

  const claimResult = await claimSessionPolicy({
    policy:            scannedPolicy,
    payer:             payerWallet.address,
    amount:            AMOUNT,
    signer:            payerWallet,
    blockTimestamp:    blockTs,
    chainId,
    verifyingContract: PAYID_VERIFIER,
    ttlSeconds:        300,
    authorityRule,
    wasm,
  });

  console.log("  decision:", claimResult.evaluation.decision, `(${claimResult.evaluation.code})`);
  if (claimResult.evaluation.reason) console.log("  reason  :", claimResult.evaluation.reason);

  if (!claimResult.proof || claimResult.evaluation.decision !== "ALLOW") {
    throw new Error(`Rejected: ${claimResult.evaluation.reason ?? claimResult.evaluation.code}`);
  }
  console.log("  ✅ Proof generated");

  console.log("\n[P-4] Verifying on-chain...");
  const verifier = new ethers.Contract(PAYID_VERIFIER, verifierAbi.abi, provider);

  const isValid: boolean = await verifier.getFunction("verifyDecision")(
    claimResult.proof.payload, claimResult.proof.signature
  );
  if (!isValid) throw new Error("verifyDecision returned false");

  const nonceUsed: boolean = await verifier.getFunction("usedNonce")(
    payerWallet.address, claimResult.proof.payload.nonce
  );
  if (nonceUsed) throw new Error("Nonce sudah dipakai — replay detected");

  console.log("  ✅ Signature valid");
  console.log("  ✅ Nonce fresh");

  console.log("\n[P-5] Approving USDC...");
  const usdc = new ethers.Contract(USDC, usdcAbi.abi, payerWallet);
  const allowance: bigint = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
  if (allowance < AMOUNT) {
    await (await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT)).wait();
    console.log("  ✅ Approved");
  } else {
    console.log("  Sufficient, skip");
  }

  console.log("\n[P-6] Submitting payERC20...");
  const payContract = new ethers.Contract(PAY_CONTRACT, payWithAbi.abi, payerWallet);

  try {
    await payContract.getFunction("payERC20").staticCall(
      claimResult.proof.payload, claimResult.proof.signature, []
    );
    console.log("  ✅ Simulation passed");
  } catch (err: any) {
    throw new Error("Simulation failed: " + (err?.revert?.args ?? err?.reason ?? err?.message));
  }

  const tx = await payContract
    .getFunction("payERC20")
    .send(claimResult.proof.payload, claimResult.proof.signature, []);
  console.log("  TX:", tx.hash);
  await tx.wait();

  // ══════════════════════════════════════════════════════

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║           ✅ Payment Success         ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("  Payer             :", payerWallet.address);
  console.log("  Receiver          :", RECEIVER_ADDRESS);
  console.log("  Amount            : 150 USDC");
  console.log("  Channel           : A (Session Policy)");
  console.log("  Receiver online?  : NO ✓");
  console.log("  Policy signer     : receiver ✓");
  console.log("  Context signer    : payer ✓");
  console.log("  Self-approval     : NOT POSSIBLE ✓");
}

main().catch((err) => {
  console.error("\n❌", err?.shortMessage ?? err?.reason ?? err?.message ?? err);
  process.exit(1);
});
