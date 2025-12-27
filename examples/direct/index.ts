import * as dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

import { ethers } from "ethers";
import fs from "fs";
import { createPayID } from "payid";
import { context } from "./context";

import payAbi from "./abi.json";
import usdcAbi from "./usdc.abi.json";

// =====================
// RPC LISK SEPOLIA
// =====================
const RPC_URL = "https://rpc.sepolia-api.lisk.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// =====================
// WALLET (EOA SENDER)
// =====================
if (!process.env.SENDER_PRIVATE_KEY) {
  throw new Error("SENDER_PRIVATE_KEY missing");
}

const wallet = new ethers.Wallet(
  process.env.SENDER_PRIVATE_KEY,
  provider
);

console.log("Sender:", wallet.address);

// =====================
// DEPLOYED CONTRACTS
// =====================
const PAYID_VERIFIER =
  "0xd5ED9d60118d3348342F32CD40FEC50b7B62E40D";

const PAY_CONTRACT =
  "0xE612695B06C05160c58b0a2FACA0CaF8653d611f";

const USDC =
  "0x9b379eA3B4dEE91E1B0F2e5c36C0931cCDf227a0";

// =====================
// LOAD WASM
// =====================
const wasm = new Uint8Array(
  fs.readFileSync(
    path.join(__dirname, "../rule_engine.wasm")
  )
);

// =====================
// INIT PAYID
// =====================
const payid = createPayID({ wasm });

// =====================
// LOAD RULE
// =====================
const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);

// =====================
// MAIN
// =====================
async function main() {
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

  console.log("PAY.ID allowed");

  const usdc = new ethers.Contract(
    USDC,
    usdcAbi,
    wallet
  );

  const amount = 150_000_000n;

  if (!usdc) {
    return console.log("usdc empty");

  }

  const allowance = await (usdc as any)?.allowance(
    wallet.address,
    PAY_CONTRACT
  );

  if (allowance < amount) {
    console.log("Approving USDC...");
    const approveTx = await (usdc as any)?.approve(
      PAY_CONTRACT,
      amount
    );
    await approveTx.wait();
    console.log("USDC approved");
  }

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    payAbi.abi,
    wallet
  );

  // const tx = await payContract
  //   .getFunction("payERC20")
  //   .send(
  //     USDC,
  //     amount,
  //     proof.payload,
  //     proof.signature
  //   );

  // console.log("⏳ TX hash:", tx.hash);
  // await tx.wait();

  console.log("✅ USDC payment success", proof);
}

main().catch(console.error);
