/**
 * client.ts — DIJALANKAN OLEH PAYER
 * 
 * Payer scan QR dari receiver, lalu bayar.
 * Tidak perlu tahu private key receiver sama sekali.
 * 
 * Run: bun run examples/simple/client.ts
 */

import { ethers } from "ethers";
import { createPayID } from "payid/client";
import { decodeSessionPolicyV2, decodeSessionPolicyV2QR } from "payid/sessionPolicy";
import { envData } from "../config/config";
import PayWithPayIDAbi from "../shared/PayIDModule#PayWithPayID.json";
import usdcAbi from "../shared/PayIDModule#MockUSDC.json";
import ruleNFTAbi from "../shared/PayIDModule#RuleItemERC721.json";
import combinedAbi from "../shared/PayIDModule#CombinedRuleStorage.json";
import payIdVerifierAbi from "../shared/PayIDModule#PayIDVerifier.json";
import fs from "fs";
import path from "path";

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
    reciverAddress: RECEIVER_ADDRESS,
  },
} = envData;

// ← hanya payer wallet, tidak ada receiver private key
const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
console.log("Payer:", payerWallet.address);

const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "../wasm/rule_engine.wasm"))
);
const payid = createPayID({ wasm, debugTrace: true });

// ─── Paste QR string dari receiver di sini ───────────────────────────────
// Di production: payer scan QR camera → dapat string ini otomatis
const QR_FROM_RECEIVER = process.env.PAYID_QR ?? (() => {
  throw new Error("Set PAYID_QR=<qr string> atau paste langsung di sini");
})();
// ─────────────────────────────────────────────────────────────────────────

async function getActiveRuleSet(receiver: string) {
  const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
  const ruleSetHash: string = await combined.getFunction("activeRuleOf")(receiver);
  if (ruleSetHash === ethers.ZeroHash) throw new Error(`No active rule set: ${receiver}`);
  const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);
  return {
    ruleSetHash,
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
      const tokenURI: string = await nft.getFunction("tokenURI")(BigInt(tokenId));
      const url = tokenURI.startsWith("ipfs://")
        ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
        : tokenURI;
      console.log(`  Fetching [${ruleNFT} #${tokenId}]:`, url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
      const meta: any = await res.json();
      if (!meta.rule) throw new Error(`Missing 'rule' in metadata`);
      return meta.rule;
    })
  );
}

async function syncBlockTime() {
  const latestBlock = await provider.getBlock("latest");
  const latestTs = latestBlock!.timestamp;
  const nowTs = Math.floor(Date.now() / 1000);
  if (nowTs > latestTs) {
    await provider.send("evm_setNextBlockTimestamp", [nowTs]);
    await provider.send("evm_mine", []);
  }
  return (await provider.getBlock("latest"))!.timestamp;
}

async function main() {
  const AMOUNT = 150_000_000n;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const blockTs = await syncBlockTime();
  console.log("blockTimestamp:", blockTs);

  // [1] Decode QR — verifikasi EIP-712 signature receiver
  console.log("\n[1/5] Decoding QR from receiver...");
  const scannedPolicy = decodeSessionPolicyV2QR(QR_FROM_RECEIVER);
  // Verifikasi policy belum expired dan signature valid
  decodeSessionPolicyV2(scannedPolicy, blockTs);
  console.log("  receiver  :", scannedPolicy.receiver);
  console.log("  maxAmount :", scannedPolicy.maxAmount, "μUSDC");
  console.log("  expiresAt :", new Date(scannedPolicy.expiresAt * 1000).toISOString());
  console.log("  ✅ Policy signature valid");

  // [2] Cek amount tidak melebihi policy
  if (AMOUNT > BigInt(scannedPolicy.maxAmount)) {
    throw new Error(`Amount ${AMOUNT} melebihi maxAmount ${scannedPolicy.maxAmount}`);
  }

  // [3] Load rule dari chain + IPFS
  console.log("\n[2/5] Loading rule set from chain + IPFS...");
  const activeRuleSet = await getActiveRuleSet(RECEIVER_ADDRESS);
  const ruleConfigs = await loadRuleConfigs(activeRuleSet.rules);
  const authorityRule = {
    version: activeRuleSet.version,
    logic: "AND" as const,
    rules: ruleConfigs,
  };
  console.log("  ruleSetHash:", activeRuleSet.ruleSetHash);

  // [4] Evaluate + generate proof — payer sign context sendiri
  console.log("\n[3/5] Evaluating rule & generating proof...");
  const context = {
    tx: {
      sender: payerWallet.address,
      receiver: RECEIVER_ADDRESS,
      asset: "USDC",
      amount: AMOUNT.toString(),
      chainId,
    },
    payId: {
      id: "pay.id/lisk-sepolia-demo",
      owner: RECEIVER_ADDRESS,
    },
    env: { timestamp: blockTs },
  } as any;

  const { result, proof } = await payid.evaluateAndProve({
    context,
    authorityRule,
    sessionPolicyV2: scannedPolicy,            // ← policy dari QR
    payId: "pay.id/lisk-sepolia-demo",
    payer: payerWallet.address,
    receiver: RECEIVER_ADDRESS,
    asset: USDC,
    amount: AMOUNT,
    signer: payerWallet,               // ← hanya payer sign
    ttlSeconds: 1800,
    verifyingContract: PAYID_VERIFIER,
    ruleAuthority: COMBINED_RULE_STORAGE,
    ruleSetHashOverride: scannedPolicy.ruleSetHash,
    chainId,
    blockTimestamp: blockTs,
  });

  console.log("  Decision:", result.decision, `(${result.code})`);
  if (!proof) throw new Error(`Rejected: ${result.reason ?? result.code}`);
  console.log("  ✅ Proof generated");

  // [5] USDC approve + submit
  console.log("\n[4/5] Checking USDC allowance...");
  const usdc = new ethers.Contract(USDC, usdcAbi.abi, payerWallet);
  const allowance: bigint = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
  if (allowance < AMOUNT) {
    await (await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT)).wait();
    console.log("  ✅ Approved");
  }

  console.log("\n[5/5] Sending payERC20...");
  const verifier = new ethers.Contract(PAYID_VERIFIER, payIdVerifierAbi.abi, provider);
  const isValid: boolean = await verifier.getFunction("verifyDecision")(proof.payload, proof.signature);
  if (!isValid) throw new Error("verifyDecision returned false");

  const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);
  try {
    await payContract.getFunction("payERC20").staticCall(proof.payload, proof.signature, []);
    console.log("  ✅ Simulation passed");
  } catch (err: any) {
    throw new Error("Simulation failed: " + (err?.revert?.args ?? err?.reason ?? err?.message));
  }

  const tx = await payContract.getFunction("payERC20").send(proof.payload, proof.signature, []);
  console.log("  TX:", tx.hash);
  await tx.wait();

  console.log("\n✅ Payment success! (Channel A)");
  console.log("   Payer   :", payerWallet.address);
  console.log("   Receiver:", RECEIVER_ADDRESS);
  console.log("   Amount  : 150 USDC");
  console.log("   Receiver online saat payment? NO ✓");
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.reason ?? err?.message ?? err);
  process.exit(1);
});