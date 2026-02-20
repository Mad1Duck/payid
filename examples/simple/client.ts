/**
 * CLIENT EXAMPLE — Fully Serverless Payer Flow
 *
 * Ini adalah contoh dari perspektif PAYER (orang yang bayar).
 * Tidak butuh server — semua berjalan di client (browser/mobile/Node.js).
 *
 * Kapan pakai client/index.ts:
 *   ✅ Rule hanya butuh Context V1 (tx, env.timestamp, state.spentToday)
 *   ✅ Tidak ada requiresAttestation di rule config
 *   ✅ Payer sign sendiri menggunakan wallet mereka
 *
 * Kapan HARUS pakai server/index.ts:
 *   ❌ Rule butuh data yang harus di-attest (env verified, oracle, risk score)
 *   ❌ State data (spent tracking) dari database, bukan dari client
 *
 * Flow:
 *   1. Load rule set dari on-chain → fetch config dari IPFS
 *   2. Build Context V1
 *   3. evaluateAndProve() — payer sign sendiri
 *   4. Approve ERC20 + payERC20()
 *
 * Run: bun run client/index.ts
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { createPayID } from "payid";
import { envData } from "../config/config";
import PayWithPayIDAbi from "../shared/PayIDModule#PayWithPayID.json";
import usdcAbi from "../shared/PayIDModule#MockUSDC.json";
import ruleNFTAbi from "../shared/PayIDModule#RuleItemERC721.json";
import combinedAbi from "../shared/PayIDModule#CombinedRuleStorage.json";

const {
  rpcUrl: RPC_URL,
  contract: {
    mockUSDC: USDC,
    payIdVerifier: PAYID_VERIFIER,
    payWithPayId: PAY_CONTRACT,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
  },
  account: { senderPk: SENDER_PRIVATE_KEY, reciverAddress },
} = envData;

// ─── Setup ────────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Wallet payer — di browser ini datang dari MetaMask/WalletConnect
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
console.log("Payer:", payerWallet.address);

// Load WASM — di browser bisa pakai: const wasm = await fetch("/rule_engine.wasm")
const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "../rule_engine.wasm"))
);

// Client mode: TANPA trustedIssuers
// Context V1 — client isi env/state sendiri, tidak perlu signature dari issuer
const payid = createPayID({ wasm });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch active rule set milik receiver dari CombinedRuleStorage */
async function getActiveRuleSet(receiver: string) {
  const combined = new ethers.Contract(
    COMBINED_RULE_STORAGE,
    combinedAbi.abi,
    provider
  );

  const ruleSetHash: string =
    await combined.getFunction("activeRuleOf")(receiver);

  console.log(ruleSetHash, "🚨 Rule Hash");

  if (ruleSetHash === ethers.ZeroHash) {
    throw new Error(`Receiver tidak punya active rule set: ${receiver}`);
  }

  const [owner, ruleRefs, version] =
    await combined.getFunction("getRuleByHash")(ruleSetHash);

  return {
    ruleSetHash,
    owner: owner as string,
    version: (version as bigint).toString(),
    rules: (ruleRefs as any[]).map((r) => ({
      ruleNFT: r.ruleNFT as string,
      tokenId: (r.tokenId as bigint).toString(),
    })),
  };
}

/** Fetch rule configs dari IPFS via tokenURI — langsung dari client */
async function loadRuleConfigs(rules: { ruleNFT: string; tokenId: string; }[]) {
  return Promise.all(
    rules.map(async ({ ruleNFT, tokenId }) => {
      const nft = new ethers.Contract(ruleNFT, ruleNFTAbi.abi, provider);

      const tokenURI: string =
        await nft.getFunction("tokenURI")(BigInt(tokenId));

      const url = tokenURI.startsWith("ipfs://")
        ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
        : tokenURI;

      console.log(`  Fetching [${ruleNFT} #${tokenId}]:`, url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch metadata: ${url}`);

      const metadata: any = await res.json();
      if (!metadata.rule) throw new Error(`Missing 'rule' in metadata for tokenId ${tokenId}`);

      return metadata.rule;
    })
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const RECEIVER = reciverAddress;
  const AMOUNT = 150_000_000n;  // 150 USDC (6 decimals)

  // ── 1. Load rule set ─────────────────────────────────────────────────────────
  console.log("\n[1/5] Loading rule set from chain + IPFS...");

  const activeRuleSet = await getActiveRuleSet(RECEIVER);
  console.log("  ruleSetHash:", activeRuleSet.ruleSetHash);
  console.log("  rules count:", activeRuleSet.rules.length);

  const ruleConfigs = await loadRuleConfigs(activeRuleSet.rules);

  const authorityRule = {
    version: activeRuleSet.version,
    logic: "AND" as const,
    rules: ruleConfigs,
  };

  // ── 2. Build Context V1 ──────────────────────────────────────────────────────
  // Tidak butuh server — client isi langsung.
  // Untuk rule yang butuh env/state yang di-attest, gunakan server/index.ts
  console.log("\n[2/5] Building Context V1...");

  const spentToday = 0n;                  // ambil dari local storage / API
  const spentThisMonth = 12_000_000n;          // ambil dari local storage / API

  const context = {
    tx: {
      sender: payerWallet.address,
      receiver: RECEIVER,
      asset: "USDC",
      amount: AMOUNT.toString(),
      chainId: 4202,
    },
    payId: {
      id: "pay.id/lisk-sepolia-demo",
      owner: RECEIVER,
    },
    env: {
      // Client isi timestamp sendiri (jam lokal)
      // Jika rule butuh timestamp yang verified, gunakan server/index.ts
      timestamp: new Date().getHours(),
    },
    state: {
      spentTodayPlusTx: (spentToday + AMOUNT).toString(),
      spentThisMonthPlusTx: (spentThisMonth + AMOUNT).toString(),
    },
  };

  // ── 3. Evaluate + generate Decision Proof ────────────────────────────────────
  // Payer sign sendiri menggunakan wallet mereka
  console.log("\n[3/5] Evaluating rule & generating proof...");

  console.log(authorityRule, "=====authorityRule=====");


  const { result, proof } = await payid.evaluateAndProve({
    context,
    authorityRule,
    payId: "pay.id/lisk-sepolia-demo",
    payer: payerWallet.address,
    receiver: RECEIVER,
    asset: USDC,
    amount: AMOUNT,
    signer: payerWallet,
    ttlSeconds: 60,
    verifyingContract: PAYID_VERIFIER,
    ruleAuthority: COMBINED_RULE_STORAGE,
  });

  console.log("  Decision:", result.decision, `(${result.code})`);
  if (result.reason) console.log("  Reason  :", result.reason);

  if (!proof) {
    throw new Error(`PAY.ID rejected: ${result.reason ?? result.code}`);
  }
  console.log("  ✅ Proof generated");

  // ── 4. Approve ERC20 ─────────────────────────────────────────────────────────
  console.log("\n[4/5] Checking USDC allowance...");

  const usdc = new ethers.Contract(USDC, usdcAbi.abi, payerWallet);
  const allowance: bigint =
    await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);

  if (allowance < AMOUNT) {
    console.log("  Approving USDC...");
    const approveTx = await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT);
    await approveTx.wait();
    console.log("  ✅ Approved");
  } else {
    console.log("  Allowance sufficient, skip");
  }

  // ── 5. Send payment ──────────────────────────────────────────────────────────
  // attestationUIDs = [] karena rule ini tidak pakai requiresAttestation
  // Kalau rule butuh KYC EAS attestation, gunakan EASClient.getValidUIDs()
  console.log("\n[5/5] Sending payERC20...");

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    PayWithPayIDAbi.abi,
    payerWallet
  );

  const tx = await payContract.getFunction("payERC20").send(
    proof.payload,
    proof.signature,
    []   // attestationUIDs — kosong karena tidak perlu KYC attestation
  );

  console.log("  TX hash:", tx.hash);
  await tx.wait();

  console.log("\n✅ Payment success!");
  console.log("   Payer   :", payerWallet.address);
  console.log("   Receiver:", RECEIVER);
  console.log("   Amount  :", AMOUNT.toString(), "μUSDC (150 USDC)");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});