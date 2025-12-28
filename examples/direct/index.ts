import * as dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve("../../", ".env"),
});

import { ethers } from "ethers";
import fs from "fs";
import { createPayID } from "payid";
import { keccak256, toUtf8Bytes } from "ethers";

import payAbi from "./abi.json";
import usdcAbi from "./usdc.abi.json";

const RPC_URL = "https://rpc.sepolia-api.lisk.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

if (!process.env.SENDER_PRIVATE_KEY) {
  throw new Error("SENDER_PRIVATE_KEY missing");
}

const wallet = new ethers.Wallet(
  process.env.SENDER_PRIVATE_KEY,
  provider
);

console.log("Payer:", wallet.address);


const PAYID_VERIFIER =
  "0x4b19111A7b17F8eD5A7d86a368c55AC4dbc920eb";

const PAY_CONTRACT =
  "0x1B12cF87E28dF21fF68070803184EB501f3B4a2b";

const USDC =
  "0x6398ad8134E48c8b85323dFf4Ed8E03bAa79197d";

const RULE_ITEM_ERC721 =
  "0x92c9451Acf88a342Ad3937691F8d5586C3e1e289";

const COMBINED_RULE_STORAGE =
  "0x4F7c0EC1B6870fd0CFAB295D3A4a0BB84dA75Ac7";

const RULE_TOKEN_ID = 1n;

const wasm = new Uint8Array(
  fs.readFileSync(
    path.join(__dirname, "../rule_engine.wasm")
  )
);

const payid = createPayID({ wasm });

import ruleAbi from "./rule.nft/RuleItemERC721.abi.json";
import combinedAbi from "./combiner.rule/CombinedRuleStorage.abi.json";
import { canonicalize } from "../utils/cannonicalize";
import { queryEventsInChunks } from "../utils/queryEventsInChunks";

const ruleNFT = new ethers.Contract(
  RULE_ITEM_ERC721,
  ruleAbi.abi,
  provider
);

const combined = new ethers.Contract(
  COMBINED_RULE_STORAGE,
  combinedAbi.abi,
  provider
);


async function loadRuleFromNFT() {
  const tokenURI: string = await (ruleNFT as any).tokenURI(
    RULE_TOKEN_ID
  );

  if (!tokenURI.startsWith("https://")) {
    throw new Error("tokenURI must be https://");
  }

  const metadataCid = tokenURI.replace("ipfs://", "");
  const metadataURL =
    `${metadataCid}`;

  console.log("Fetching rule metadata:", metadataURL);

  const res = await fetch(metadataURL);
  if (!res.ok) {
    throw new Error("Failed to fetch rule metadata");
  }

  const metadata: any = await res.json();

  if (!metadata.rule) {
    throw new Error("NFT metadata missing rule");
  }

  return metadata.rule;
}

async function listActiveRules() {
  const latestBlock = await provider.getBlockNumber();

  const events = await queryEventsInChunks({
    contract: combined,
    eventName: "CombinedRuleRegistered", // ✅ BENAR
    fromBlock: 0n,
    toBlock: BigInt(latestBlock),
    step: 50_000n
  });

  const seen = new Set<string>();
  const activeRules = [];

  for (const e of events) {
    if (!(e as any).args) continue;

    const {
      ruleSetHash,
      owner,
      version
    } = (e as any).args as any;

    const hash = ruleSetHash.toLowerCase();
    if (seen.has(hash)) continue;
    seen.add(hash);

    const isActive = await combined.isActive(ruleSetHash);
    if (!isActive) continue;

    const [resolvedOwner, ruleRefs, resolvedVersion] =
      await combined.getRuleByHash(ruleSetHash);

    activeRules.push({
      ruleSetHash,
      owner: resolvedOwner,
      version: resolvedVersion.toString(),
      rules: ruleRefs.map((r: any) => ({
        ruleNFT: r.ruleNFT,
        tokenId: r.tokenId.toString()
      }))
    });
  }

  return activeRules;
}


async function main() {
  // const ruleConfig = await loadRuleFromNFT();
  const rules = await listActiveRules();

  console.log("Rule loaded from NFT:");
  console.log(rules);
  return;

  /* --------------------------------------------- */
  /* 3. BUILD CONTEXT                              */
  /* --------------------------------------------- */

  const amount = 150_000_000n;
  const receiver =
    "0xAdfED322a38D35Db150f92Ae20BDe3EcfCEf6b84";

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
      owner: receiver
    }
  };

  // ruleSetHash
  const { result, proof } =
    await payid.evaluateAndProve({
      context,
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

  console.log(result, proof.payload);


  return;

  console.log("PAY.ID consent signed");

  const usdc = new ethers.Contract(
    USDC,
    usdcAbi,
    wallet
  );

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

  /* --------------------------------------------- */
  /* 6. EXECUTE PAYMENT                            */
  /* --------------------------------------------- */

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    payAbi.abi,
    wallet
  );

  console.log("⏳ Sending transaction...");

  const tx = await payContract
    .getFunction("payERC20")
    .send(
      proof.payload,
      proof.signature
    );

  console.log("TX hash:", tx.hash);
  await tx.wait();

  console.log("✅ USDC payment success", result);
}

main().catch(console.error);
