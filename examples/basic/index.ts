import { PayID } from "@payid/sdk-core";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { context } from "./context";

// ====== SETUP ======
const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);

const WASM_PATH = path.join(__dirname, "../rule_engine.wasm");

const payid = new PayID(WASM_PATH);

const wallet = new ethers.Wallet(
  "0x59c6995e998f97a5a0044966f094538c5f7d6d1b1e5f9d8b52b0c9d9d2f6b3c1"
);

// const { result, proof } = await payid.evaluateAndProveFromSource({
//   context,
//   ruleSource: {
//     uri: "ipfs://QmXyz...",
//     hash: "0xabc123..."
//   },
//   payId: "pay.id/demo",
//   owner: wallet.address,
//   signer: wallet,
//   chainId: 1,
//   verifyingContract: "0xPAYID_VERIFIER"
// });


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
  console.log("\n=== DECISION PROOF ===");
  console.log({
    payload: proof.payload,
    signature: proof.signature
  });
}

main().catch(console.error);
