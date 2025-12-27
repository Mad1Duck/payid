import { createPayID } from "payid";
import { Wallet } from "ethers";
import fs from "fs";
import path from "path";
import { context } from "./context";

// ==================
// LOAD WASM
// ==================
const WASM_PATH = path.join(
  __dirname,
  "../rule_engine.wasm"
);

const wasm = new Uint8Array(
  fs.readFileSync(WASM_PATH)
);

// ==================
// INIT PAYID
// ==================
const payid = createPayID({ wasm });

// ==================
// SIGNER (SERVER)
// ==================
const wallet = new Wallet(
  process.env.PROVER_PRIVATE_KEY ??
  "0x59c6995e998f97a5a0044966f094538c5f7d6d1b1e5f9d8b52b0c9d9d2f6b3c1"
);

// ==================
// LOCAL RULE CONFIG
// (DEV / DEMO ONLY)
// ==================
const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);

// ==================
// MAIN
// ==================
async function main() {
  const { result, proof } =
    await payid.evaluateAndProve({
      context,

      // ✅ API BARU
      rule: ruleConfig,

      // identity
      payId: "pay.id/demo",
      owner: wallet.address,

      // signing
      signer: wallet,

      // chain & verifier
      chainId: 1,
      verifyingContract:
        "0x000000000000000000000000000000000000DEAD",

      // optional
      ttlSeconds: 60
    });

  console.log("=== RULE RESULT ===");
  console.log(result);

  if (!proof) {
    console.log("No proof generated");
    return;
  }

  console.log("\n=== DECISION PROOF ===");
  console.log({
    payload: proof.payload,
    signature: proof.signature
  });
}

main().catch(console.error);
