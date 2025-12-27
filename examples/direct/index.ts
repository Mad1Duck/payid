import * as dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

import { ethers } from "ethers";
import fs from "fs";
import { createPayID } from "payid";

import payAbi from "./abi.json";
import usdcAbi from "./usdc.abi.json";

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

// =====================
// DEPLOYED CONTRACTS
// =====================
const PAYID_VERIFIER =
  "0x5379EBc02A8386D9B9C63074d131Cdd44f7657CD";

const PAY_CONTRACT =
  "0x1B12cF87E28dF21fF68070803184EB501f3B4a2b";

const USDC =
  "0x6398ad8134E48c8b85323dFf4Ed8E03bAa79197d";

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

async function main() {
  const amount = 150_000_000n;
  const receiver = "0xAdfED322a38D35Db150f92Ae20BDe3EcfCEf6b84";

  const intent = {
    sender: wallet.address,
    receiver,
    asset: "USDC",
    amount: amount.toString(),
    chainId: 4202,
  };

  const context = {
    tx: intent,
    payId: {
      id: "pay.id/lisk-sepolia-demo",
      owner: wallet.address
    }
  };

  const { result, proof } =
    await payid.evaluateAndProve({
      context: context,
      rule: ruleConfig,
      payId: "pay.id/lisk-sepolia-demo",
      payer: context.tx.sender,
      receiver: context.tx.receiver,
      asset: USDC,
      amount,
      signer: wallet,
      verifyingContract: PAYID_VERIFIER,
      ttlSeconds: 60,
    });

  if (!proof) {
    console.log(result);

    throw new Error("PAY.ID rejected by rule");
  }

  console.log("PAY.ID consent signed");

  // ensure allowance
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

  // execute payment
  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    payAbi.abi,
    wallet
  );

  console.log("⏳ start TX hash:");

  const tx = await payContract
    .getFunction("payERC20")
    .send(
      proof.payload,
      proof.signature
    );

  console.log("⏳ TX hash:", tx.hash, tx.toJSON());
  await tx.wait();

  console.log("✅ USDC payment success", proof, result);
}

main().catch(console.error);
