import { createPayID } from "payid";
import { Wallet } from "ethers";
import fs from "fs";
import path from "path";
import { context } from "./context";

const WASM_PATH = path.join(
  __dirname,
  "../rule_engine.wasm"
);

const wasm = new Uint8Array(
  fs.readFileSync(WASM_PATH)
);


const payid = createPayID({ wasm });

const wallet = new Wallet(
  process.env.PROVER_PRIVATE_KEY ??
  "0x59c6995e998f97a5a0044966f094538c5f7d6d1b1e5f9d8b52b0c9d9d2f6b3c1"
);

const ruleConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./rule.config.json"),
    "utf8"
  )
);


async function main() {
  const USDC =
    "0x6398ad8134E48c8b85323dFf4Ed8E03bAa79197d";

  const PAYID_VERIFIER =
    "0x5379EBc02A8386D9B9C63074d131Cdd44f7657CD";

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
