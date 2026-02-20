/**
 * SETUP — Step 1b: Buat & mint Rule NFT on-chain
 *
 * Dijalankan oleh RECEIVER/MERCHANT setelah upload ke Pinata.
 * Flow: createRule() → activateRule() → dapat tokenId
 *
 * Run: bun run setup/rule.nft/create-rule-item.ts
 */

import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "../../utils/cannonicalize";
import { mainPinata } from "./upload-rule-nft-to-pinata";
import ruleAbi from "./RuleItemERC721.abi.json";
import { envData } from "../../config/config";

const {
  rpcUrl: RPC_URL,
  contract: { ruleItemERC721: RULE_ITEM_ERC721 },
  account: { receiverPk: RECEIVER_PRIVATE_KEY },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);

console.log("Rule Creator (Receiver):", wallet.address);

const ruleNFT = new ethers.Contract(RULE_ITEM_ERC721, ruleAbi.abi, wallet);

export async function mainRule() {
  // Step 1: Upload metadata ke IPFS
  const { url: tokenURI, metadata: ruleMetadata } = await mainPinata();

  // Hitung hash dari rule config untuk verifikasi on-chain
  const canonicalRuleJSON = canonicalize(ruleMetadata.rule);
  const ruleHash = keccak256(toUtf8Bytes(canonicalRuleJSON));

  console.log("\nCanonical rule:", canonicalRuleJSON);
  console.log("Rule hash     :", ruleHash);

  // Step 2: Register rule on-chain
  console.log("\n📝 Creating rule on-chain...");
  const txCreate = await ruleNFT.getFunction("createRule").send(ruleHash, tokenURI);
  console.log("createRule tx:", txCreate.hash);
  await txCreate.wait();

  const nextRuleId: bigint = await ruleNFT.getFunction("nextRuleId")();
  const ruleId = nextRuleId - 1n;   // nextRuleId sudah increment, mundur satu
  console.log("Rule ID:", ruleId.toString());

  // Step 3: Activate (mint NFT ke wallet receiver)
  console.log("\n🎟 Activating rule (minting NFT)...");
  const txActivate = await ruleNFT.getFunction("activateRule").send(ruleId);
  console.log("activateRule tx:", txActivate.hash);
  await txActivate.wait();

  const [, , , tokenId] = await ruleNFT.getFunction("getRule")(ruleId);
  console.log("NFT tokenId:", tokenId.toString());
  console.log("✅ Rule NFT ready — tokenId:", tokenId.toString());

  return { ruleTokenId: tokenId as bigint };
}

mainRule().catch(console.error);