/**
 * SETUP — Step 1b: Create & Mint Rule NFT
 *
 * Flow:
 *  1. Subscribe (jika belum) — HARUS sebelum createRule
 *  2. Upload metadata to IPFS
 *  3. createRule()
 *  4. activateRule()
 *  5. get tokenId
 *
 * Run:
 *  bun run setup:create-rule
 */
import { ethers, keccak256, NonceManager, toUtf8Bytes } from "ethers";
import { canonicalize } from "../../utils/cannonicalize";
import { mainPinata } from "./upload-rule-nft-to-pinata";
import ruleAbi from "../../shared/PayIDModule#RuleItemERC721.json";
import { envData } from "../../config/config";

const {
  rpcUrl: RPC_URL,
  contract: { ruleItemERC721: RULE_ITEM_ERC721 },
  account: { reciverPk: RECEIVER_PRIVATE_KEY },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new NonceManager(
  new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider)
);
console.log("Using wallet:", await wallet.getAddress());

const ruleNFT = new ethers.Contract(
  RULE_ITEM_ERC721,
  ruleAbi.abi,
  wallet
);

export async function mainRule() {

  /* ----------------------------------
     0. Check contract deployed
  ---------------------------------- */
  const code = await provider.getCode(RULE_ITEM_ERC721);
  if (code === "0x") {
    throw new Error("RuleItemERC721 not deployed on this network");
  }

  /* ----------------------------------
     1. Subscribe jika belum
  ---------------------------------- */
  const isSubscribed: boolean =
    await ruleNFT.getFunction("hasSubscription")(await wallet.getAddress());

  if (!isSubscribed) {
    console.log("No active subscription → subscribing...");

    const price: bigint =
      await ruleNFT.getFunction("subscriptionPriceETH")();

    console.log("  Price:", ethers.formatEther(price), "ETH");

    const txSub = await ruleNFT
      .getFunction("subscribe")
      .send({ value: price });

    await txSub.wait();
    console.log("Subscribed");
  } else {
    console.log("Already subscribed");
  }

  /* ----------------------------------
     2. Upload to IPFS
  ---------------------------------- */
  console.log("Uploading to IPFS...");
  const { url: tokenURI, metadata } = await mainPinata();

  const canonicalRule = canonicalize(metadata.rule);
  const ruleHash = keccak256(toUtf8Bytes(canonicalRule));

  console.log("Rule hash:", ruleHash);
  console.log("Token URI:", tokenURI);

  /* ----------------------------------
     3. Create Rule
  ---------------------------------- */
  console.log("Creating rule...");

  const txCreate = await ruleNFT
    .getFunction("createRule")
    .send(ruleHash, tokenURI);

  const receipt = await txCreate.wait();
  if (!receipt) throw new Error("Create tx failed");

  /* ----------------------------------
     4. Get ruleId from event
  ---------------------------------- */
  let ruleId: bigint | null = null;

  for (const log of receipt.logs) {
    try {
      const parsed = ruleNFT.interface.parseLog(log);
      if (parsed?.name === "RuleCreated") {
        ruleId = parsed.args.ruleId;
        break;
      }
    } catch {
      // ignore non-matching logs
    }
  }

  if (ruleId === null) {
    throw new Error("RuleCreated event not found in receipt");
  }

  console.log("Rule ID:", ruleId.toString());

  /* ----------------------------------
     5. Activate Rule (Mint NFT)
     ruleExpiry[tokenId] = subscriptionExpiry[msg.sender]
     Sekarang bisa karena subscriptionExpiry > 0 setelah subscribe
  ---------------------------------- */
  console.log("Activating rule...");

  const txActivate = await ruleNFT
    .getFunction("activateRule")
    .send(ruleId);

  await txActivate.wait();

  /* ----------------------------------
     6. Get tokenId & verify expiry
  ---------------------------------- */
  const tokenId: bigint =
    await ruleNFT.getFunction("ruleTokenId")(ruleId);

  const expiry: bigint =
    await ruleNFT.getFunction("ruleExpiry")(tokenId);

  const now = BigInt(Math.floor(Date.now() / 1000));

  console.log("NFT Token ID:", tokenId.toString());
  console.log("Rule expiry :", new Date(Number(expiry) * 1000).toISOString());
  console.log("Days left   :", ((expiry - now) / 86400n).toString());

  if (expiry <= now) {
    throw new Error("Rule expiry is in the past — subscribe may have failed");
  }

  console.log("DONE — Rule NFT Ready");
  return { ruleId, tokenId };
}