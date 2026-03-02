import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function loadArtifact(name: string) {
  const artifactPath = path.join(
    __dirname,
    `./artifacts/contracts/${name}.sol/${name}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function ensureContract(provider: ethers.Provider, address: string, label: string) {
  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(`${label} not deployed at ${address}`);
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  const nftAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  const verifierAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const combinedAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const receiver = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
  const ruleSetHash = "0x6a955a70789121f29aa54e2156bb2b12f9ab20a29a3695da920770e0cffd785b";

  // 🔎 Ensure contracts exist
  await ensureContract(provider, nftAddress, "RuleItemERC721");
  await ensureContract(provider, verifierAddress, "PayIDVerifier");
  await ensureContract(provider, combinedAddress, "CombinedRuleStorage");

  // 📦 Load artifacts
  const nftArtifact = await loadArtifact("RuleItemERC721");
  const verifierArtifact = await loadArtifact("PayIDVerifier");
  const combinedArtifact = await loadArtifact("CombinedRuleStorage");

  const nft = new ethers.Contract(nftAddress, nftArtifact.abi, provider);
  const verifier = new ethers.Contract(verifierAddress, verifierArtifact.abi, provider);
  const combined = new ethers.Contract(combinedAddress, combinedArtifact.abi, provider);

  const now = BigInt(Math.floor(Date.now() / 1000));

  // =============================
  // Basic Checks
  // =============================

  const subExpiry: bigint = await nft.subscriptionExpiry(receiver);
  const ruleExp: bigint = await nft.ruleExpiry(1n);
  const trusted: boolean = await verifier.trustedAuthorities(combinedAddress);

  console.log("========== BASIC ==========");
  console.log("trusted:", trusted);
  console.log("subExpiry:", subExpiry);
  console.log("ruleExpiry:", ruleExp);
  console.log("now:", now);
  console.log("sub expired?", subExpiry < now);
  console.log("rule expired?", ruleExp < now);

  // =============================
  // Combined Rule Checks
  // =============================

  console.log("\n========== ACTIVE RULE ==========");

  try {
    const activeHash: string = await combined.getActiveRuleOf(receiver);
    console.log("activeRuleOf:", activeHash);
    console.log(
      "matches ruleSetHash:",
      activeHash.toLowerCase() === ruleSetHash.toLowerCase()
    );
  } catch (e: any) {
    console.log("getActiveRuleOf REVERT:", e.shortMessage ?? e.message);
  }

  console.log("\n========== RULE BY HASH ==========");

  try {
    const result = await combined.getRuleByHash(ruleSetHash);

    const owner: string = result[0];
    const refs = result[1];
    const version: bigint = result[2];

    console.log("ruleOwner:", owner);
    console.log("match receiver:", owner.toLowerCase() === receiver.toLowerCase());
    console.log("version:", version);
    console.log("refs length:", refs.length);
  } catch (e: any) {
    console.log("getRuleByHash REVERT:", e.shortMessage ?? e.message);
    console.log("→ Rule tidak ada atau tidak active");
  }
}

main().catch((err) => {
  console.error("\nFATAL ERROR:");
  console.error(err);
  process.exit(1);
});