// =====================
// ENV
// =====================
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

import { ethers } from "ethers";
import fs from "fs";
import { createPayID } from "payid";
import { context } from "./context";
import abi from "./abi.json";

// =====================
// RPC
// =====================
const RPC_URL = "https://rpc.sepolia-api.lisk.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// =====================
// SENDER (EOA)
// =====================
if (!process.env.SENDER_PRIVATE_KEY) {
  throw new Error("SENDER_PRIVATE_KEY missing");
}

const wallet = new ethers.Wallet(
  process.env.SENDER_PRIVATE_KEY,
  provider
);

// =====================
// DEPLOYED CONTRACTS
// =====================
const PAYID_VERIFIER =
  "0x68E1c5685380aa677c67EE21D70356b6d040946d";

const PAY_CONTRACT =
  "0xEF5CB265407eD989ef3842051D974F83B843016c";

// =====================
// LOAD WASM
// =====================
const wasm = new Uint8Array(
  fs.readFileSync(
    path.join(__dirname, "../rule_engine.wasm")
  )
);

// =====================
// PAYID INIT
// =====================
const payid = createPayID({ wasm });

// =====================
// RULE
// =====================
const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);

// =====================
// ABI
// =====================
const PayWithPayID_ABI = abi.abi;

// =====================
// MAIN
// =====================
async function main() {
  console.log("Sender:", wallet.address);

  // 1️⃣ off-chain prove
  const { result, proof } =
    await payid.evaluateAndProve({
      context,
      rule: ruleConfig,
      payId: "pay.id/lisk-sepolia-demo",
      owner: wallet.address,
      signer: wallet,
      chainId: 4202,
      verifyingContract: PAYID_VERIFIER
    });

  if (result.decision !== "ALLOW" || !proof) {
    throw new Error("PAY.ID rejected");
  }

  // 2️⃣ on-chain tx
  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    PayWithPayID_ABI,
    wallet
  );

  const tx = await payContract
    .getFunction("payETH")
    .send(
      proof.payload,
      proof.signature,
      {
        value: ethers.parseEther("0.01"),
      }
    );

  console.log("TX hash:", tx.hash);
  await tx.wait();
  console.log("✅ Payment success");
}

main().catch(console.error);
