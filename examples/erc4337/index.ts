import { PayID } from "@payid/sdk-core";
import { ethers } from "ethers";
import { context } from "./context";
import { BundlerClient } from "./bundler";
import path from "path";

// ========= CONFIG =========

// WASM rule engine
const WASM_PATH = path.join(__dirname, "../rule_engine.wasm");

// PAY.ID SDK
const payid = new PayID(WASM_PATH);

// PAY.ID owner (authority signer)
const ownerWallet = new ethers.Wallet(
  // DEMO PRIVATE KEY — jangan pakai di prod
  "0x59c6995e998f97a5a0044966f094538c5f7d6d1b1e5f9d8b52b0c9d9d2f6b3c1"
);

// ERC-4337
const SMART_ACCOUNT = "0xSMART_ACCOUNT_ADDRESS";
const PAY_CONTRACT = "0xPAY_CONTRACT";
const ENTRY_POINT = "0xEntryPointAddress";
const BUNDLER_RPC = "https://bundler.example/rpc";

// Rule source (IPFS)
const RULE_SOURCE = {
  uri: "ipfs://QmRuleCID",
  hash: "0xRuleConfigHash"
};

// ========= EXECUTION =========

async function main() {
  const { result, userOp, proof } =
    await payid.evaluateProveAndBuildUserOp({
      context,
      ruleSource: RULE_SOURCE,

      payId: "pay.id/demo",
      owner: ownerWallet.address,
      signer: ownerWallet,

      smartAccount: SMART_ACCOUNT,
      targetContract: PAY_CONTRACT,

      // nonce dari smart account (biasanya via RPC)
      nonce: "0x01",

      gas: {
        callGasLimit: "120000",
        verificationGasLimit: "250000",
        preVerificationGas: "60000",
        maxFeePerGas: "30000000000",
        maxPriorityFeePerGas: "2000000000"
      },

      chainId: 1,
      verifyingContract: "0xPAYID_VERIFIER"
    });

  console.log("=== RULE RESULT ===");
  console.log(result);

  if (!userOp) {
    console.log("Transaction rejected by PAY.ID");
    return;
  }

  console.log("\n=== USER OPERATION ===");
  console.log(userOp);

  // ========= SEND TO BUNDLER =========

  const bundler = new BundlerClient(
    BUNDLER_RPC,
    ENTRY_POINT
  );

  const userOpHash = await bundler.sendUserOperation(userOp);

  console.log("\n=== SENT TO BUNDLER ===");
  console.log("userOpHash:", userOpHash);
}

main().catch(console.error);
