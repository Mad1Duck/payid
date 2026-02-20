/**
 * SETUP — Step 2: Register Combined Rule Set
 */

import {
  ethers,
  keccak256,
  toUtf8Bytes,
  NonceManager,
} from "ethers";

import { canonicalize } from "../../utils/cannonicalize";
import { mainRule } from "../rule.nft/create-rule-item";

import ruleAbi from "../../shared/PayIDModule#RuleItemERC721.json";
import combinedAbi from "../../shared/PayIDModule#CombinedRuleStorage.json";

import { envData } from "../../config/config";

/* --------------------------------------------------
   ENV
-------------------------------------------------- */

const {
  rpcUrl: RPC_URL,

  contract: {
    ruleItemERC721: RULE_ITEM_ERC721,
    combinedRuleStorage: COMBINED_RULE_STORAGE,
  },

  account: { reciverPk: RECEIVER_PRIVATE_KEY },
} = envData;

/* --------------------------------------------------
   PROVIDER + WALLET (Nonce Safe)
-------------------------------------------------- */

const provider = new ethers.JsonRpcProvider(RPC_URL);

const wallet = new NonceManager(
  new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider)
);

console.log("Using wallet:", await wallet.getAddress());

/* --------------------------------------------------
   CONTRACTS
-------------------------------------------------- */

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

/* --------------------------------------------------
   MAIN
-------------------------------------------------- */

async function main() {
  /* ----------------------------------
     1. Create / Get Rule NFT
  ---------------------------------- */

  const { tokenId: ruleTokenId } = await mainRule();

  console.log("Using Rule NFT:", ruleTokenId.toString());

  /* ----------------------------------
     2. Check ownership
  ---------------------------------- */

  const owner = await ruleNFT
    .getFunction("ownerOf")(ruleTokenId);

  console.log(owner, "=====owner=====");

  if (owner.toLowerCase() !== (await wallet.getAddress()).toLowerCase()) {
    throw new Error("❌ You do NOT own this NFT");
  }

  console.log("✅ Ownership verified");

  /* ----------------------------------
     4. Load Metadata
  ---------------------------------- */

  const tokenURI = await ruleNFT
    .getFunction("tokenURI")(ruleTokenId);

  const url = tokenURI.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
    : tokenURI;

  console.log("Fetching:", url);

  const res = await fetch(url);

  if (!res.ok) throw new Error("Metadata fetch failed");

  const metadata: any = await res.json();

  if (!metadata.rule) {
    throw new Error("Invalid metadata: no rule");
  }

  /* ----------------------------------
     5. Build ruleSetHash
  ---------------------------------- */

  const combinedRuleJSON = canonicalize({
    version: "1",
    logic: "AND",
    rules: [metadata.rule],
  });

  const ruleSetHash = keccak256(
    toUtf8Bytes(combinedRuleJSON)
  );

  console.log("ruleSetHash:", ruleSetHash);

  /* ----------------------------------
     6. Preflight: simulate call (catch revert)
  ---------------------------------- */

  console.log("Simulating register...");

  await combined
    .getFunction("registerCombinedRule")
    .staticCall(
      ruleSetHash,
      [RULE_ITEM_ERC721],
      [ruleTokenId],
      1n
    );

  console.log("✅ Simulation OK");

  /* ----------------------------------
     7. Register (REAL TX)
  ---------------------------------- */

  console.log("📝 Registering combined rule...");

  const tx = await combined
    .getFunction("registerCombinedRule")
    .send(
      ruleSetHash,
      [RULE_ITEM_ERC721],
      [ruleTokenId],
      1n
    );

  console.log("TX:", tx.hash);

  await tx.wait();

  console.log("✅ Registered");


  /* ----------------------------------
     8. Verify
  ---------------------------------- */

  const [resolvedOwner, ruleRefs, version] =
    await combined
      .getFunction("getRuleByHash")(ruleSetHash);

  console.log("\nRESULT:");
  console.log("Owner:", resolvedOwner);
  console.log("Version:", version.toString());

  ruleRefs.forEach((r: any, i: number) => {
    console.log(
      `Rule[${i}] NFT=${r.ruleNFT} Token=${r.tokenId}`
    );
  });
}

/* --------------------------------------------------
   RUN
-------------------------------------------------- */

main().catch((e) => {
  console.error("\n❌ Setup failed");

  console.error(
    e?.shortMessage ||
    e?.reason ||
    e?.message ||
    e
  );

  process.exit(1);
});