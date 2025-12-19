import { PayID } from "@payid/sdk-core";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { context } from "./context";

// ====== SETUP ======

// 1. Load rule config
const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);

// 2. Load WASM
const WASM_PATH = path.join(__dirname, "./rule_engine.wasm");

// 3. Create PAY.ID SDK instance
const payid = new PayID(WASM_PATH);

// 4. Wallet (authority signer / PAY.ID owner)
const wallet = new ethers.Wallet(
  // ⚠️ PRIVATE KEY DEMO — jangan pakai di prod
  "0x59c6995e998f97a5a0044966f094538c5f7d6d1b1e5f9d8b52b0c9d9d2f6b3c1"
);

// ====== EXECUTION ======

async function main() {
  const { result, proof } = await payid.evaluateAndProve({
    context,
    ruleConfig,

    // identity
    payId: "pay.id/demo",
    owner: wallet.address,

    // signing
    signer: wallet,

    // chain & verifier
    chainId: 1,
    verifyingContract: "0x000000000000000000000000000000000000DEAD",

    // optional
    ttlSeconds: 60
  });

  console.log("=== RULE RESULT ===");
  console.log(result);
  /*
    {
      decision: 'ALLOW',
      code: 'OK',
      reason: 'all rules passed'
    }
  */

  console.log("\n=== DECISION PROOF ===");
  console.log({
    payload: proof.payload,
    signature: proof.signature
  });

  /*
    payload: {
      version: 'payid.decision.v1',
      payId: 'pay.id/demo',
      owner: '0x...',
      decision: 1,
      contextHash: '0x...',
      ruleSetHash: '0x...',
      issuedAt: 1712345678,
      expiresAt: 1712345738,
      nonce: '0x...'
    }
  */
}

main().catch(console.error);
