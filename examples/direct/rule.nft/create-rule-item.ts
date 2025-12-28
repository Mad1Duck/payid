import ruleAbi from "./RuleItemERC721.abi.json";
import { ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "../../utils/cannonicalize";
import { mainPinata } from "./upload-rule-nft-to-pinata";
import { envData } from "../../config/config";

const { rpcUrl: RPC_URL, contract: { ruleItemERC721: RULE_ITEM_ERC721 }, account: { receiverPk: RECIVER_PRIVATE_KEY, } } = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);

const wallet = new ethers.Wallet(
  RECIVER_PRIVATE_KEY,
  provider
);

console.log("Rule Creator:", wallet.address);
const ruleNFT = new ethers.Contract(
  RULE_ITEM_ERC721,
  ruleAbi.abi,
  wallet
);

const { url: RULE_URI, metadata: RULE_OBJECT } = await mainPinata();

export async function mainRule() {
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

  return { ruleTokenId: tokenId };
}
