/**
 * SERVER EXAMPLE — Context V2 dengan Trusted Issuers
 *
 * Run: bun run examples/simple/server.ts
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { createPayID } from "payid/server";
import { buildContextV2 } from "payid/context";
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
  account: {
    senderPk: SENDER_PRIVATE_KEY,
    reciverPk: RECIVER_PRIVATE_KEY,
  },
} = envData;

// ─── Setup ────────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

// Di production: gunakan HSM/KMS, bukan plain wallet
const ENV_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);
const STATE_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);
const ORACLE_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);
const RISK_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);

console.log("Server issuer:", ENV_ISSUER.address);
console.log("Payer        :", payerWallet.address);

const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "../rule_engine.wasm"))
);

// trustedIssuers = set address yang boleh sign attestation
const payid = createPayID({
  wasm,
  signer: payerWallet,   // signer untuk sign Decision Proof
  trustedIssuers: new Set([
    ENV_ISSUER.address,
    STATE_ISSUER.address,
    ORACLE_ISSUER.address,
    RISK_ISSUER.address,
  ]),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getActiveRuleSet(receiver: string) {
  const combined = new ethers.Contract(
    COMBINED_RULE_STORAGE,
    combinedAbi.abi,
    provider
  );

  const ruleSetHash: string =
    await combined.getFunction("activeRuleOf")(receiver);

  if (ruleSetHash === ethers.ZeroHash) {
    throw new Error(`No active rule set for: ${receiver}`);
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

async function loadRuleConfigs(rules: { ruleNFT: string; tokenId: string; }[]) {
  return Promise.all(
    rules.map(async ({ ruleNFT, tokenId }) => {
      const nft = new ethers.Contract(ruleNFT, ruleNFTAbi.abi, provider);
      const tokenURI: string =
        await nft.getFunction("tokenURI")(BigInt(tokenId));

      const url = tokenURI.startsWith("ipfs://")
        ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
        : tokenURI;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${url}`);

      const metadata: any = await res.json();
      if (!metadata.rule) throw new Error("Missing 'rule' in metadata");

      return metadata.rule;
    })
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const RECEIVER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const AMOUNT = 150_000_000n;

  // ── 1. Load rule set ───────────────────────────────────────────────────────
  console.log("\n[1/5] Loading rule set...");
  const activeRuleSet = await getActiveRuleSet(RECEIVER);
  const ruleConfigs = await loadRuleConfigs(activeRuleSet.rules);

  const authorityRule = {
    version: activeRuleSet.version,
    logic: "AND" as const,
    rules: ruleConfigs,
  };

  // ── 2. Build Context V2 ────────────────────────────────────────────────────
  console.log("\n[2/5] Building Context V2...");

  const contextV2 = await buildContextV2({
    baseContext: {
      tx: {
        sender: payerWallet.address,
        receiver: RECEIVER,
        asset: "USDC",
        amount: AMOUNT.toString(),
        chainId: 31337,
      },
      payId: {
        id: "pay.id/hardhat-demo",
        owner: RECEIVER,
      },
    },
    env: { issuer: ENV_ISSUER },
    state: { issuer: STATE_ISSUER, spentToday: AMOUNT.toString(), period: "DAY" },
    oracle: { issuer: ORACLE_ISSUER, data: { country: "ID", kycLevel: "2", fxRate: 15600 } },
    risk: { issuer: RISK_ISSUER, score: 25, category: "LOW", modelHash: "0xmodelhash123" },
  });

  console.log("  env.timestamp   :", contextV2.env?.timestamp);
  console.log("  state.spentToday:", contextV2.state?.spentToday);
  console.log("  oracle.country  :", contextV2.oracle?.country);
  console.log("  risk.score      :", contextV2.risk?.score, `(${contextV2.risk?.category})`);

  // ── 3. Evaluate + Prove ────────────────────────────────────────────────────
  console.log("\n[3/5] Evaluating & generating proof...");

  const { result, proof } = await payid.evaluateAndProve({
    context: contextV2,
    authorityRule,
    payId: "pay.id/hardhat-demo",
    payer: payerWallet.address,
    receiver: RECEIVER,
    asset: USDC,
    amount: AMOUNT,
    ttlSeconds: 60,
    verifyingContract: PAYID_VERIFIER,
    ruleAuthority: COMBINED_RULE_STORAGE,
  });

  console.log("  Decision:", result.decision, `(${result.code})`);
  if (result.reason) console.log("  Reason  :", result.reason);

  if (!proof) throw new Error(`Rejected: ${result.reason ?? result.code}`);
  console.log("  ✅ Proof generated");

  // ── 4. Approve USDC ───────────────────────────────────────────────────────
  console.log("\n[4/5] Checking allowance...");

  const usdc = new ethers.Contract(USDC, usdcAbi.abi, payerWallet);
  const allowance: bigint =
    await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);

  if (allowance < AMOUNT) {
    await (await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT)).wait();
    console.log("  ✅ Approved");
  } else {
    console.log("  Sufficient, skip");
  }

  // ── 5. Send Payment ────────────────────────────────────────────────────────
  console.log("\n[5/5] Sending payERC20...");

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    PayWithPayIDAbi.abi,
    payerWallet
  );

  const tx = await payContract.getFunction("payERC20").send(
    proof.payload,
    proof.signature,
    []
  );

  console.log("  TX:", tx.hash);
  await tx.wait();

  console.log("\n✅ Payment success!");
  console.log("   Payer     :", payerWallet.address);
  console.log("   Receiver  :", RECEIVER);
  console.log("   Amount    : 150 USDC");
  console.log("   KYC Level :", contextV2.oracle?.kycLevel);
  console.log("   Risk      :", contextV2.risk?.score, `(${contextV2.risk?.category})`);
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.reason ?? err?.message ?? err);
  process.exit(1);
});