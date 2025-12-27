import { createPayID } from "payid";
import { Wallet } from "ethers";
import fs from "fs";
import path from "path";
import { context } from "./context";
import { BundlerClient } from "./bundler";

// =====================
// LOAD WASM
// =====================
const WASM_PATH = path.join(
  __dirname,
  "../rule_engine.wasm"
);

const wasm = new Uint8Array(
  fs.readFileSync(WASM_PATH)
);

// =====================
// INIT PAYID
// =====================
const payid = createPayID({ wasm });

// =====================
// SIGNER (PROVER / AUTHORITY)
// =====================
const ownerWallet = new Wallet(
  process.env.PROVER_PRIVATE_KEY ??
  "0x59c6995e998f97a5a0044966f094538c5f7d6d1b1e5f9d8b52b0c9d9d2f6b3c1"
);

// =====================
// LOAD LOCAL RULE (DUMMY)
// =====================
const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);

// =====================
// LISK SEPOLIA CONFIG
// =====================
const CHAIN_ID = 4202;

const SMART_ACCOUNT = "0xSMART_ACCOUNT_ADDRESS";
const PAY_CONTRACT = "0xPAY_CONTRACT";
const ENTRY_POINT = "0xENTRY_POINT_LISK_SEPOLIA";
const PAYID_VERIFIER = "0xPAYID_VERIFIER_LISK_SEPOLIA";

const BUNDLER_RPC =
  "https://bundler.lisk.com/sepolia"; // contoh

// =====================
// EXECUTION
// =====================
async function main() {
  const { result, proof } =
    await payid.evaluateAndProve({
      context,
      rule: ruleConfig, // ✅ dummy rule

      payId: "pay.id/lisk-sepolia-demo",
      owner: ownerWallet.address,
      signer: ownerWallet,

      chainId: CHAIN_ID,
      verifyingContract: PAYID_VERIFIER
    });

  console.log("=== RULE RESULT ===");
  console.log(result);

  if (result.decision !== "ALLOW" || !proof) {
    console.log("Transaction rejected by PAY.ID");
    return;
  }

  const userOp = payid.buildUserOperation({
    proof,
    smartAccount: SMART_ACCOUNT,
    targetContract: PAY_CONTRACT,
    nonce: "0x01",
    gas: {
      callGasLimit: "120000",
      verificationGasLimit: "250000",
      preVerificationGas: "60000",
      maxFeePerGas: "30000000000",
      maxPriorityFeePerGas: "2000000000"
    }
  });

  console.log("\n=== USER OPERATION ===");
  console.log(userOp);

  const bundler = new BundlerClient(
    BUNDLER_RPC,
    ENTRY_POINT
  );

  const userOpHash =
    await bundler.sendUserOperation(userOp);

  console.log("\n=== SENT TO LISK SEPOLIA ===");
  console.log("userOpHash:", userOpHash);
}

main().catch(console.error);
