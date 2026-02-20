/**
 * FIX — Subscribe + extend ruleExpiry for existing tokenId
 *
 * Dipakai ketika tokenId sudah di-mint tapi ruleExpiry = 0
 * karena lupa subscribe sebelum activateRule().
 *
 * Run: bun run examples/simple/fix-rule-expiry.ts
 */
import { ethers } from "ethers";
import { envData } from "../config/config";
import ruleAbi from "../shared/PayIDModule#RuleItemERC721.json";

const {
  rpcUrl: RPC_URL,
  contract: { ruleItemERC721: RULE_ITEM_ERC721 },
  account: { reciverPk: RECEIVER_PRIVATE_KEY },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);
console.log("Receiver:", wallet.address);

const ruleNFT = new ethers.Contract(RULE_ITEM_ERC721, ruleAbi.abi, wallet);

// ← isi tokenId dari debug output: "Rule[0] NFT: 0x... #<tokenId>"
const TOKEN_ID = 1n;

async function main() {
  const price: bigint = await ruleNFT.getFunction("subscriptionPriceETH")();
  console.log("Subscription price:", ethers.formatEther(price), "ETH");

  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet balance    :", ethers.formatEther(balance), "ETH");

  if (balance < price) {
    throw new Error(`Insufficient ETH — need ${ethers.formatEther(price)} ETH`);
  }

  const newExpiry = BigInt(Math.floor(Date.now() / 1000)) + 30n * 24n * 60n * 60n; // +30 days

  console.log("\nExtending ruleExpiry for tokenId:", TOKEN_ID.toString());
  console.log("New expiry:", new Date(Number(newExpiry) * 1000).toISOString());

  const tx = await ruleNFT
    .getFunction("extendRuleExpiry")
    .send(TOKEN_ID, newExpiry, { value: price });

  console.log("TX:", tx.hash);
  await tx.wait();

  // Verify
  const expiry: bigint = await ruleNFT.getFunction("ruleExpiry")(TOKEN_ID);
  console.log("\nVerified expiry:", new Date(Number(expiry) * 1000).toISOString());
  console.log("✅ Done — run client.ts sekarang");
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.reason ?? err?.message);
  process.exit(1);
});