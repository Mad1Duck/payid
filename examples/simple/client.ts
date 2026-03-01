/**
 * CLIENT EXAMPLE — Fully Serverless Payer Flow
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { createPayID } from "payid/client";
import { envData } from "../config/config";
import PayWithPayIDAbi from "../shared/PayIDModule#PayWithPayID.json";
import usdcAbi from "../shared/PayIDModule#MockUSDC.json";
import ruleNFTAbi from "../shared/PayIDModule#RuleItemERC721.json";
import combinedAbi from "../shared/PayIDModule#CombinedRuleStorage.json";
import payIdVerifierAbi from "../shared/PayIDModule#PayIDVerifier.json";

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

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
console.log("Payer:", payerWallet.address);

// const wasm = new Uint8Array(
//   fs.readFileSync(path.join(__dirname, "../rule_engine.wasm"))
// );

const payid = createPayID({});

async function getActiveRuleSet(receiver: string) {
  const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
  const ruleSetHash: string = await combined.getFunction("activeRuleOf")(receiver);
  console.log(ruleSetHash, "🚨 Rule Hash");
  if (ruleSetHash === ethers.ZeroHash) {
    throw new Error(`Receiver tidak punya active rule set: ${receiver}`);
  }
  const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);
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
      const tokenURI: string = await nft.getFunction("tokenURI")(BigInt(tokenId));
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

// Debug helper: print full EIP-712 domain dari contract 
async function debugDomain(verifierContract: ethers.Contract) {
  try {
    const d = await verifierContract.getFunction("eip712Domain")();
    console.log("\n[DEBUG] Contract EIP-712 domain:");
    console.log("  fields  :", d[0]);
    console.log("  name    :", d[1]);
    console.log("  version :", d[2]);
    console.log("  chainId :", d[3].toString());
    console.log("  verifier:", d[4]);
    return { name: d[1] as string, version: d[2] as string, chainId: Number(d[3]) };
  } catch (e) {
    console.log("\n[DEBUG] eip712Domain() not available, reading constants...");
    const name = await verifierContract.getFunction("SIGNING_DOMAIN")();
    const version = await verifierContract.getFunction("SIGNATURE_VERSION")();
    const network = await provider.getNetwork();
    console.log("  name    :", name);
    console.log("  version :", version);
    console.log("  chainId :", network.chainId.toString());
    console.log("  verifier:", PAYID_VERIFIER);
    return { name: name as string, version: version as string, chainId: Number(network.chainId) };
  }
}

async function main() {
  const RECEIVER = reciverAddress;
  // const AMOUNT = 150_000_000n;
  const AMOUNT = 6_000_000n;

  // Check RPC chainId
  const network = await provider.getNetwork();
  console.log("RPC chainId:", network.chainId.toString());

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
  const verifierContract = new ethers.Contract(PAYID_VERIFIER, payIdVerifierAbi.abi, provider);
  const contractDomain = await debugDomain(verifierContract);
  console.log("\n[2/5] Building Context V1...");
  const spentToday = 0n;
  const spentThisMonth = 12_000_000n;
  const context = {
    tx: {
      sender: payerWallet.address,
      receiver: RECEIVER,
      asset: "USDC",
      amount: AMOUNT.toString(),
      chainId: contractDomain.chainId,
    },
    payId: {
      id: "pay.id/lisk-sepolia-demo",
      owner: RECEIVER,
    },
    env: {
      timestamp: Math.floor(Date.now() / 1000),
    },
    state: {
      spentTodayPlusTx: (spentToday + AMOUNT).toString(),
      spentThisMonthPlusTx: (spentThisMonth + AMOUNT).toString(),
      dailyLimit: "500000000",
    },
  } as any;

  console.log("\n[3/5] Evaluating rule & generating proof...");

  // console.log("\n[DEBUG] Testing WASM directly...");
  // const { runWasmRule } = await import("payid-rule-engine");
  // const testResult = await runWasmRule(
  //   wasm as any,
  //   context as any,
  //   authorityRule
  // );
  // console.log("[DEBUG] WASM result:", testResult);
  console.log(authorityRule, "=====authorityRule=====");

  // Get actual domain from contract BEFORE signing 
  console.log("\n[DEBUG] Using domain for signing:", contractDomain);
  const nowTs = Math.floor(Date.now() / 1000);
  await provider.send("evm_setNextBlockTimestamp", [nowTs]);
  await provider.send("evm_mine", []);

  const block = await provider.getBlock("latest");
  const blockTs = block!.timestamp;
  console.log("[DEBUG] Hardhat time synced:", blockTs);


  const { result, proof } = await payid.evaluateAndProve({
    context,
    authorityRule,
    payId: "pay.id/lisk-sepolia-demo",
    payer: payerWallet.address,
    receiver: RECEIVER,
    asset: USDC,
    amount: AMOUNT,
    signer: payerWallet,
    ttlSeconds: 300,
    verifyingContract: PAYID_VERIFIER,
    ruleAuthority: COMBINED_RULE_STORAGE,
    chainId: contractDomain.chainId,
    blockTimestamp: blockTs
  });

  console.log("  Decision:", result.decision, `(${result.code})`);
  if (result.reason) console.log("  Reason  :", result.reason);
  if (!proof) throw new Error(`PAY.ID rejected: ${result.reason ?? result.code}`);
  console.log("  ✅ Proof generated");

  console.log("\n[4/5] Checking USDC allowance...");
  const usdc = new ethers.Contract(USDC, usdcAbi.abi, payerWallet);
  const allowance: bigint = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
  if (allowance < AMOUNT) {
    console.log("  Approving USDC...");
    const approveTx = await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT);
    await approveTx.wait();
    console.log("  ✅ Approved");
  } else {
    console.log("  Allowance sufficient, skip");
  }

  console.log("\n[5/5] Sending payERC20...");

  // DEBUG: compare contract hash vs SDK hash 
  const contractHash = await verifierContract.getFunction("hashDecision")(proof.payload);
  console.log("\n[DEBUG] Hash comparison:");
  console.log("  contractHash :", contractHash);

  const DECISION_TYPES = {
    Decision: [
      { name: "version", type: "bytes32" },
      { name: "payId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "contextHash", type: "bytes32" },
      { name: "ruleSetHash", type: "bytes32" },
      { name: "ruleAuthority", type: "address" },
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "nonce", type: "bytes32" },
      { name: "requiresAttestation", type: "bool" },
    ],
  };

  const sdkHash = ethers.TypedDataEncoder.hash(
    {
      name: contractDomain.name,
      version: contractDomain.version,
      chainId: contractDomain.chainId,
      verifyingContract: PAYID_VERIFIER,
    },
    DECISION_TYPES,
    proof.payload
  );
  console.log("  sdkHash      :", sdkHash);
  console.log("  hash match   :", contractHash === sdkHash);

  const recoveredSigner = ethers.recoverAddress(contractHash, proof.signature);
  console.log("  recovered    :", recoveredSigner);
  console.log("  payer        :", payerWallet.address);
  console.log("  signer match :", recoveredSigner.toLowerCase() === payerWallet.address.toLowerCase());

  const isValid = await verifierContract.getFunction("verifyDecision")(proof.payload, proof.signature);
  console.log("  verifyDecision:", isValid);
  console.log("  issuedAt     :", proof.payload.issuedAt.toString());
  console.log("  expiresAt    :", proof.payload.expiresAt.toString());
  console.log("  now          :", Math.floor(Date.now() / 1000));
  console.log("Hardhat block.timestamp:", block!.timestamp);
  console.log("issuedAt  :", proof.payload.issuedAt.toString());
  console.log("expiresAt :", proof.payload.expiresAt.toString());
  console.log("issuedAt > block.timestamp:", Number(proof.payload.issuedAt) > block!.timestamp);
  console.log("block.timestamp > expiresAt:", block!.timestamp > Number(proof.payload.expiresAt));
  // END DEBUG 

  if (!isValid) {
    throw new Error("verifyDecision returned false — cek domain debug di atas");
  }

  const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);
  const tx = await payContract.getFunction("payERC20").send(
    proof.payload,
    proof.signature,
    []
  );

  console.log("  TX hash:", tx.hash);
  await tx.wait();

  console.log("\n✅ Payment success!");
  console.log("   Payer   :", payerWallet.address);
  console.log("   Receiver:", RECEIVER);
  console.log("   Amount  :", AMOUNT.toString(), "μUSDC (150 USDC)");
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.reason ?? err?.message ?? err);
  process.exit(1);
});