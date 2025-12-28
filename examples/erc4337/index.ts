import { createPayID } from "payid";
import { Wallet } from "ethers";
import fs from "fs";
import path from "path";
import { context } from "./context";
import { BundlerClient } from "./bundler";
import { envData } from "../config/config";

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
const { rpcUrl: RPC_URL, contract: { ruleItemERC721: RULE_ITEM_ERC721, mockUSDC: USDC, payIdVerifier: PAYID_VERIFIER, payWithPayId: PAY_CONTRACT, combinedRuleStorage: COMBINED_RULE_STORAGE }, account: { senderPk: SENDER_PRIVATE_KEY, receiverPk: RECIVER_PRIVATE_KEY } } = envData;

const SMART_ACCOUNT = "0x73F98364f6B62a5683F2C14ae86a23D7288f6106";
const ENTRY_POINT = "0xAdfED322a38D35Db150f92Ae20BDe3EcfCEf6b84";

const amount = 150_000_000n;
const receiver =
  "0x73F98364f6B62a5683F2C14ae86a23D7288f6106";

const BUNDLER_RPC =
  "https://bundler.lisk.com/sepolia";

// =====================
// EXECUTION
// =====================
async function main() {
  const { result, proof } =
    await payid.evaluateAndProve({
      context,
      rule: ruleConfig, // ✅ dummy rule

      payId: "pay.id/lisk-sepolia-demo",
      payer: ownerWallet.address,
      signer: ownerWallet,

      amount,
      asset: USDC,
      receiver,
      ttlSeconds: 60,
      verifyingContract: PAYID_VERIFIER,
      ruleAuthority: COMBINED_RULE_STORAGE
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

  // const bundler = new BundlerClient(
  //   BUNDLER_RPC,
  //   ENTRY_POINT
  // );

  // const userOpHash =
  //   await bundler.sendUserOperation(userOp);

  // console.log("\n=== SENT TO LISK SEPOLIA ===");
  // console.log("userOpHash:", userOpHash);
}

main().catch(console.error);
