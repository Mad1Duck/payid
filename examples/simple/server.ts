/**
 * SERVER EXAMPLE — Context V2 dengan Trusted Issuers
 *
 * Ini adalah contoh dari perspektif SERVER/RELAYER.
 * Digunakan ketika rule membutuhkan data yang harus di-attest oleh trusted party:
 *   - env.timestamp  → waktu server yang verified, bukan dari client
 *   - state          → spent tracking dari database
 *   - oracle         → FX rate, country, KYC level dari external service
 *   - risk           → ML risk score dari risk engine
 *
 * Kapan pakai server/index.ts:
 *   ✅ Rule config punya field "requires" (env, state, oracle, risk)
 *   ✅ Butuh data dari database (daily/monthly spend)
 *   ✅ Butuh data eksternal yang perlu di-trust (KYC, FX rate, risk score)
 *
 * ⚠️  PENTING: Issuer private keys TIDAK BOLEH ada di client/browser.
 *     Di production: gunakan HSM, AWS KMS, atau Vault untuk menyimpan keys.
 *
 * Dua mode deployment:
 *   Mode A — Server sign atas nama payer (butuh payer signature delegation)
 *   Mode B — Server evaluate + kirim proof ke payer untuk di-sign (recommended)
 *   (Contoh ini: Mode A, karena demo menggunakan server wallet sebagai payer)
 *
 * Run: bun run server/index.ts
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { createPayID, context as contextModule } from "payid";
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

// Issuer wallets — di production gunakan HSM/KMS, bukan plain wallet
// Satu wallet bisa dipakai untuk beberapa domain, atau satu wallet per domain
const ENV_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);
const STATE_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);
const ORACLE_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);
const RISK_ISSUER = new ethers.Wallet(RECIVER_PRIVATE_KEY, provider);

console.log("Server issuer :", ENV_ISSUER.address);
console.log("Payer         :", payerWallet.address);

const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "../rule_engine.wasm"))
);

// Server mode: DENGAN trustedIssuers
// Rule engine akan verifikasi setiap attestation di context harus di-sign
// oleh salah satu address dalam set ini
const TRUSTED_ISSUERS = new Set([
  ENV_ISSUER.address,
  STATE_ISSUER.address,
  ORACLE_ISSUER.address,
  RISK_ISSUER.address,
]);

const payid = createPayID({ wasm, trustedIssuers: TRUSTED_ISSUERS });

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
      if (!metadata.rule) throw new Error(`Missing 'rule' in metadata`);

      return metadata.rule;
    })
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const RECEIVER = "0x73F98364f6B62a5683F2C14ae86a23D7288f6106";
  const AMOUNT = 150_000_000n;  // 150 USDC (6 decimals)

  // ── 1. Load rule set ─────────────────────────────────────────────────────────
  console.log("\n[1/5] Loading rule set from chain + IPFS...");

  const activeRuleSet = await getActiveRuleSet(RECEIVER);
  const ruleConfigs = await loadRuleConfigs(activeRuleSet.rules);

  const authorityRule = {
    version: activeRuleSet.version,
    logic: "AND" as const,
    rules: ruleConfigs,
  };

  // ── 2. Build Context V2 dengan Attestations ───────────────────────────────────
  // Ini yang membedakan server dari client:
  // setiap sub-context (env, state, oracle, risk) di-sign oleh trusted issuer
  console.log("\n[2/5] Building Context V2 with attestations...");

  // Data dari database / external service
  const spentToday = 0n;
  const spentThisMonth = 12_000_000n;

  const contextV2 = await contextModule.buildContextV2({
    // Base context (Context V1) — sama seperti client
    baseContext: {
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
    },

    // env: timestamp dari server — lebih trusted daripada client timestamp
    // Rule bisa enforce "only allow during business hours" dengan ini
    env: {
      issuer: ENV_ISSUER,
      // timestamp otomatis diisi Math.floor(Date.now() / 1000)
    },

    // state: data spent dari database, di-attest oleh state issuer
    // Client tidak bisa manipulasi ini karena harus di-sign server
    state: {
      issuer: STATE_ISSUER,
      spentToday: (spentToday + AMOUNT).toString(),
      period: "DAY",
    },

    // oracle: data eksternal seperti KYC, country, FX rate
    // Contoh: rule bisa enforce "only allow country ID"
    oracle: {
      issuer: ORACLE_ISSUER,
      data: {
        country: "ID",
        kycLevel: "2",      // 0=none, 1=basic, 2=full KYC
        fxRate: 15600,    // IDR per USD
      },
    },

    // risk: ML-based risk score dari risk engine
    // Contoh: rule bisa enforce "reject if risk.score > 70"
    risk: {
      issuer: RISK_ISSUER,
      score: 25,         // 0-100, makin tinggi = makin berisiko
      category: "LOW",
      modelHash: "0xmodelhash123",
    },
  });

  console.log("  env.timestamp :", contextV2.env?.timestamp);
  console.log("  state.spentToday :", contextV2.state?.spentToday);
  console.log("  oracle.country   :", contextV2.oracle?.country);
  console.log("  oracle.kycLevel  :", contextV2.oracle?.kycLevel);
  console.log("  risk.score       :", contextV2.risk?.score, `(${contextV2.risk?.category})`);

  // ── 3. Evaluate + generate Decision Proof ────────────────────────────────────
  // trustedIssuers diset di constructor — rule engine akan verifikasi
  // setiap proof di context harus di-sign oleh issuer yang trusted
  console.log("\n[3/5] Evaluating rule & generating proof...");

  const { result, proof } = await payid.evaluateAndProve({
    context: contextV2,
    authorityRule,
    payId: "pay.id/lisk-sepolia-demo",
    payer: payerWallet.address,
    receiver: RECEIVER,
    asset: USDC,
    amount: AMOUNT,
    signer: payerWallet,  // Mode A: server sign; Mode B: kirim ke client untuk di-sign
    ttlSeconds: 60,
    verifyingContract: PAYID_VERIFIER,
    ruleAuthority: COMBINED_RULE_STORAGE,  // FIX: was ruleRegistryContract
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
  // FIX: 3 parameter sekarang — (Decision, sig, bytes32[] attestationUIDs)
  // attestationUIDs di sini tetap [] karena attestation ada di dalam proof payload
  // (Context V2 custom attestation ≠ EAS on-chain attestation)
  // Kalau rule butuh EAS on-chain attestation (Worldcoin, Gitcoin Passport, dsb),
  // isi dengan UIDs dari EASClient.getValidUIDs()
  console.log("\n[5/5] Sending payERC20...");

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    PayWithPayIDAbi.abi,
    payerWallet
  );

  const tx = await payContract.getFunction("payERC20").send(
    proof.payload,
    proof.signature,
    []   // attestationUIDs
  );

  console.log("  TX hash:", tx.hash);
  await tx.wait();

  console.log("\n✅ Payment success!");
  console.log("   Payer      :", payerWallet.address);
  console.log("   Receiver   :", RECEIVER);
  console.log("   Amount     :", AMOUNT.toString(), "μUSDC (150 USDC)");
  console.log("   Risk Score :", contextV2.risk?.score, `(${contextV2.risk?.category})`);
  console.log("   KYC Level  :", contextV2.oracle?.kycLevel);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});