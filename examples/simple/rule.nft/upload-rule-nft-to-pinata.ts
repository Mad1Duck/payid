/**
 * SETUP — Step 1a: Upload Rule NFT metadata ke Pinata (IPFS)
 *
 * Dijalankan oleh RECEIVER/MERCHANT sekali saja.
 * Output: IPFS URL yang digunakan sebagai tokenURI saat createRule().
 *
 * Run: bun run setup/rule.nft/upload-rule-nft-to-pinata.ts
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PinataSDK } from "pinata";
import { envData } from "../../config/config";

const { pinata: { jwt: PINATA_JWT, url: PINATA_URL, gateway: PINATA_GATEWAY } } = envData;

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_URL,
});

const IMAGE_PATH = path.join(__dirname, "./rule.jpg");
const OUTPUT_JSON_PATH = path.join(__dirname, "./rule.json");

// ─── Definisi rule yang akan di-encode ke NFT metadata ───
const RULE_OBJECT = {
  id: "min_amount",
  if: {
    field: "tx.amount",
    op: ">=",
    value: "100000000",   // 100 USDC (6 decimals)
  },
};

const NFT_NAME = "PAY.ID Rule – Min Amount";
const NFT_DESCRIPTION = "PAY.ID rule enforcing minimum transaction amount of 100 USDC";

function canonicalize(obj: any): string {
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `"${k}":${canonicalize(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(obj);
}

function keccak256Hex(input: string): string {
  return "0x" + crypto.createHash("sha3-256").update(input).digest("hex");
}

export async function mainPinata() {
  console.log("📦 Uploading rule NFT via Pinata...\n");

  const canonicalRule = canonicalize(RULE_OBJECT);
  const ruleHash = keccak256Hex(canonicalRule);

  console.log("Canonical rule:", canonicalRule);
  console.log("Rule hash     :", ruleHash);

  // Upload image
  console.log("\n🖼 Uploading image...");
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const imageResult = await pinata.upload.public.base64(imageBuffer.toString("base64"));
  const imageURL = `${PINATA_GATEWAY}/${imageResult.cid}`;
  console.log("Image URL:", imageURL);

  // Build & upload metadata
  const metadata = {
    name: NFT_NAME,
    description: NFT_DESCRIPTION,
    image: imageURL,
    attributes: [
      { trait_type: "Rule ID", value: RULE_OBJECT.id },
      { trait_type: "Engine", value: "PAY.ID" },
      { trait_type: "Category", value: "Transaction Rule" },
    ],
    rule: RULE_OBJECT,   // ← rule engine reads this field
    ruleHash,
    standard: "payid.rule.v1",
  };

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(metadata, null, 2));

  console.log("\n📤 Uploading metadata...");
  const metaResult = await pinata.upload.public.json(metadata, {
    metadata: { name: "rule.json" },
  });

  const tokenURI = `ipfs://${metaResult.cid}`;
  const previewURL = `${PINATA_GATEWAY}/${metaResult.cid}`;

  console.log("\n✅ DONE");
  console.log("tokenURI (pakai di createRule):", tokenURI);
  console.log("Preview :", previewURL);

  return { url: previewURL, cid: metaResult.cid, metadata };
}

mainPinata().catch(console.error);