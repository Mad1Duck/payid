import { ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers";
import ruleAbi from "../rule.nft/RuleItemERC721.abi.json";
import combinedAbi from "./CombinedRuleStorage.abi.json";
import { canonicalize } from "../../utils/cannonicalize";
import { envData } from "../../config/config";
import { mainRule } from "../rule.nft/create-rule-item";

const { rpcUrl: RPC_URL, contract: { ruleItemERC721: RULE_ITEM_ERC721, combinedRuleStorage: COMBINED_RULE_STORAGE }, account: { receiverPk: RECIVER_PRIVATE_KEY, } } = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);

const wallet = new ethers.Wallet(
  RECIVER_PRIVATE_KEY,
  provider
);

console.log("Rule Owner:", wallet.address);

const ruleNFT = new ethers.Contract(
  RULE_ITEM_ERC721,
  ruleAbi.abi,
  wallet
);

const combined = new ethers.Contract(
  COMBINED_RULE_STORAGE,
  combinedAbi.abi,
  wallet
);

const RULE_VERSION = 1n;

async function main() {
  const { ruleTokenId } = await mainRule();

  const RULE_TOKEN_ID = BigInt(ruleTokenId);

  const tokenURI: string = await (ruleNFT as any).tokenURI(
    RULE_TOKEN_ID
  );

  const metadataURL = tokenURI.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
    : tokenURI;

  console.log("Metadata URL:", metadataURL);

  const res = await fetch(metadataURL);
  if (!res.ok) {
    throw new Error("Failed to fetch metadata");
  }

  const metadata: any = await res.json();

  if (!metadata.rule) {
    throw new Error("Metadata missing `rule` field");
  }

  console.log("Rule loaded from NFT metadata:");
  console.log(metadata.rule);

  const combinedRules = [metadata.rule];

  const canonicalCombinedRules = canonicalize({
    version: "1",
    logic: "AND",
    rules: combinedRules
  });

  const ruleSetHash = keccak256(
    toUtf8Bytes(canonicalCombinedRules)
  );

  console.log("Canonical combined rule JSON:");
  console.log(canonicalCombinedRules);
  console.log("ruleSetHash:", ruleSetHash);

  const owner = await (ruleNFT as any).ownerOf(
    RULE_TOKEN_ID
  );

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(
      "You do not own the rule NFT used for this ruleSet"
    );
  }

  console.log("Rule NFT ownership verified");
  console.log("Registering combined rule...");

  const tx = await (combined as any).registerCombinedRule(
    ruleSetHash,
    [RULE_ITEM_ERC721],
    [RULE_TOKEN_ID],
    RULE_VERSION
  );

  console.log("registerCombinedRule tx:", tx.hash);
  await tx.wait();

  console.log("Combined rule registered");

  const [resolvedOwner, ruleRefs, version] =
    await (combined as any).getRuleByHash(ruleSetHash);

  console.log("Resolved owner:", resolvedOwner);
  console.log("Resolved version:", version.toString());

  ruleRefs.forEach((r: any, i: number) => {
    console.log(
      `Rule[${i}] NFT:`,
      r.ruleNFT,
      "tokenId:",
      r.tokenId.toString()
    );
  });

  console.log("DONE - ruleSet active");
}

main().catch(console.error);

// ========== RESPONSE ==========
// Rule Owner: 0x73F98364f6B62a5683F2C14ae86a23D7288f6106
// Metadata URL: https://gateway.pinata.cloud/ipfs/bafkreigxgajtxtga2ewji7eldvqss5mgqscourrwnfaufeughutt46zxxa
// Rule loaded from NFT metadata:
// {
//   id: "min_amount",
//   if: {
//     field: "tx.amount",
//     op: ">=",
//     value: "100000000",
//   },
// }
// Canonical combined rule JSON:
// {"logic":"AND","rules":[{"id":"min_amount","if":{"field":"tx.amount","op":">=","value":"100000000"}}],"version":"1"}
// ruleSetHash: 0x24d8ed4f9a393c230cae05ab216a692033bbfacc1ba3767f41428061615f7899
// Rule NFT ownership verified
// Registering combined rule...
// registerCombinedRule tx: 0xceaf23fca4364cb19350460fb2cdbdb13e8ed236a5721b075a75921631fa512e
// Combined rule registered
// Resolved owner: 0x73F98364f6B62a5683F2C14ae86a23D7288f6106
// Resolved version: 1
// Rule[0] NFT: 0x92c9451Acf88a342Ad3937691F8d5586C3e1e289 tokenId: 1
// DONE - ruleSet active