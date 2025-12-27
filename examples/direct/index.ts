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
// WALLET (PAYER)
// =====================
if (!process.env.SENDER_PRIVATE_KEY) {
  throw new Error("SENDER_PRIVATE_KEY missing");
}

const wallet = new ethers.Wallet(
  process.env.SENDER_PRIVATE_KEY,
  provider
);

console.log("Payer:", wallet.address);
// PayIDModule#PayIDVerifier - 0x320d63373B719Db4CcadD8340BFF7908Aa4F50CD
// PayIDModule#PayWithPayID - 0x92591803d2008b280e98defA4D096EeF05546bfd
// =====================
// DEPLOYED CONTRACTS
// =====================
const PAYID_VERIFIER =
  "0x320d63373B719Db4CcadD8340BFF7908Aa4F50CD";

const PAY_CONTRACT =
  "0x92591803d2008b280e98defA4D096EeF05546bfd";

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
  const amount = 150_000_000n;
  const receiver = "0xAdfED322a38D35Db150f92Ae20BDe3EcfCEf6b84";

  // 1️⃣ evaluate merchant rule + sign consent
  const { result, proof } =
    await payid.evaluateAndProve({
      context: {
        tx: {
          sender: wallet.address,
          receiver,
          asset: "USDC",
          amount: "150000000",
          chainId: 4202
        },
        payId: {
          id: "pay.id/lisk-sepolia-demo",
          owner: wallet.address
        }
      },
      rule: ruleConfig,
      payId: "pay.id/lisk-sepolia-demo",
      payer: wallet.address,
      receiver,
      asset: USDC,
      amount,
      signer: wallet,
      verifyingContract: PAYID_VERIFIER,
      ttlSeconds: 60,
    });

  if (!proof) {
    throw new Error("PAY.ID rejected by rule");
  }

  console.log("PAY.ID consent signed");

  // 2️⃣ ensure allowance
  const usdc = new ethers.Contract(
    USDC,
    usdcAbi,
    wallet
  );

  if (!usdc) {
    return console.log("usdc empty");

  }

  const allowance = await (usdc as any).allowance(
    wallet.address,
    PAY_CONTRACT
  );

  if (allowance < amount) {
    console.log("Approving USDC...");
    const approveTx = await (usdc as any).approve(
      PAY_CONTRACT,
      amount
    );
    await approveTx.wait();
    console.log("USDC approved");
  }

  // 3️⃣ execute payment (NO PARAM DRIFT)
  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    payAbi.abi,
    wallet
  );

  const tx = await payContract
    .getFunction("payERC20")
    .send(
      proof.payload,
      proof.signature
    );

  console.log("⏳ TX hash:", tx.hash);
  await tx.wait();

  console.log("✅ USDC payment success", proof);
}

main().catch(console.error);
