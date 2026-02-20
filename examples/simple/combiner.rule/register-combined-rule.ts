/**
 * SETUP — Step 2: Register Combined Rule Set on-chain
 *
 * Dijalankan oleh RECEIVER/MERCHANT setelah dapat Rule NFT.
 * CombinedRuleStorage menyimpan "ruleSetHash" yang referensi beberapa NFT.
 * PayID Verifier akan membaca hash ini saat verifikasi payment.
 *
 * Run: bun run setup/combiner.rule/register-combined-rule.ts
 */

import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "../../utils/cannonicalize";
import { mainRule } from "../rule.nft/create-rule-item";
import ruleAbi from "../rule.nft/RuleItemERC721.abi.json";
import combinedAbi from "../../clients/CombinedRuleStorage.abi.json";
import { envData } from "../../config/config";

const {
  rpcUrl: RPC_URL,
  contract: {
    ruleItemERC721: RULE_ITEM_ERC721,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
  },
  account: { receiverPk: RECEIVER_PRIVATE_KEY },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);

console.log("Rule Owner (Receiver):", wallet.address);

const ruleNFT = new ethers.Contract(RULE_ITEM_ERC721, ruleAbi.abi, wallet);
const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, wallet);

async function main() {
  // Step 1: Buat Rule NFT (atau skip jika sudah ada, uncomment baris di bawah)
  const { ruleTokenId } = await mainRule();
  // const ruleTokenId = 1n;  // ← uncomment jika NFT sudah ada, isi tokenId

  // Step 2: Fetch rule content dari IPFS untuk hitung ruleSetHash
  const tokenURI: string = await ruleNFT.getFunction("tokenURI")(ruleTokenId);
  const url = tokenURI.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
    : tokenURI;

  console.log("\nFetching rule metadata:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch metadata");

  const metadata: any = await res.json();
  if (!metadata.rule) throw new Error("Missing 'rule' field in metadata");

  // Step 3: Hitung ruleSetHash — hash dari combined rule set
  // Format: canonicalize({ version, logic, rules: [rule1, rule2, ...] })
  const combinedRuleJSON = canonicalize({
    version: "1",
    logic: "AND",
    rules: [metadata.rule],
  });
  const ruleSetHash = keccak256(toUtf8Bytes(combinedRuleJSON));

  console.log("Combined rule JSON:", combinedRuleJSON);
  console.log("ruleSetHash       :", ruleSetHash);

  // Step 4: Verifikasi ownership NFT
  const owner: string = await ruleNFT.getFunction("ownerOf")(ruleTokenId);
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("You do not own this Rule NFT");
  }
  console.log("\n✅ NFT ownership verified");

  // Step 5: Register on-chain
  console.log("📝 Registering combined rule...");
  const tx = await combined.getFunction("registerCombinedRule").send(
    ruleSetHash,
    [RULE_ITEM_ERC721],    // array NFT contract addresses
    [ruleTokenId],         // array tokenIds (sama index dengan addresses)
    1n                     // version
  );

  console.log("registerCombinedRule tx:", tx.hash);
  await tx.wait();

  // Verifikasi hasil
  const [resolvedOwner, ruleRefs, version] =
    await combined.getFunction("getRuleByHash")(ruleSetHash);

  console.log("\n✅ Combined rule registered!");
  console.log("Owner  :", resolvedOwner);
  console.log("Version:", version.toString());
  ruleRefs.forEach((r: any, i: number) => {
    console.log(`Rule[${i}]: NFT=${r.ruleNFT} tokenId=${r.tokenId}`);
  });
}

main().catch(console.error);