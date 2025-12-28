import ruleAbi from "./RuleItemERC721.abi.json";
import * as dotenv from "dotenv";
import path from "path";
import RULE_OBJECT from "./rule.json";

dotenv.config({
  path: path.resolve("../../../", ".env"),
});

import { ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "../../utils/cannonicalize";
import { mainPinata } from "./upload-rule-nft-to-pinata";



if (!process.env.SENDER_PRIVATE_KEY) {
  throw new Error("SENDER_PRIVATE_KEY missing");
}

if (!process.env.RPC_URL) {
  throw new Error("RPC_URL missing");
}

const RPC_URL = process.env.RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(
  process.env.SENDER_PRIVATE_KEY,
  provider
);

console.log("Rule Creator:", wallet.address);

const RULE_ITEM_ERC721 =
  "0x92c9451Acf88a342Ad3937691F8d5586C3e1e289";

const ruleNFT = new ethers.Contract(
  RULE_ITEM_ERC721,
  ruleAbi.abi,
  wallet
);

const { url: RULE_URI } = await mainPinata();

async function main() {
  const canonicalRuleJSON = canonicalize(RULE_OBJECT);

  const ruleHash = keccak256(
    toUtf8Bytes(canonicalRuleJSON)
  );

  console.log("Canonical rule JSON:");
  console.log(canonicalRuleJSON);
  console.log("Rule hash:", ruleHash);

  console.log("Creating rule...");

  const txCreate = await (ruleNFT as any).createRule(
    ruleHash,
    RULE_URI
  );

  console.log("createRule tx:", txCreate.hash);
  await txCreate.wait();

  console.log("Rule created");

  const nextRuleId = await (ruleNFT as any).nextRuleId();
  const ruleId = BigInt(nextRuleId);

  console.log("Rule ID:", ruleId.toString());

  console.log("Activating rule (mint NFT)...");

  const txActivate = await (ruleNFT as any).activateRule(
    ruleId
  );

  console.log("activateRule tx:", txActivate.hash);
  await txActivate.wait();

  console.log("Rule activated & NFT minted");

  const [, , , tokenId] =
    await (ruleNFT as any).getRule(ruleId);

  console.log("🎟 NFT tokenId:", tokenId.toString());
  console.log("🎉 DONE – Rule NFT ready");
}

main().catch(console.error);
