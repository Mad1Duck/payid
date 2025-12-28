import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PinataSDK } from "pinata";
import { envData } from "../../config/config";

const { pinata: { jwt: PINATA_JWT, gateway: PINATA_GATEWAY, url: PINATA_URL } } = envData;

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_URL,
});


const IMAGE_PATH = path.join(__dirname, "./rule.jpg");
const OUTPUT_JSON_PATH = path.join(__dirname, "./rule.json");

const RULE_OBJECT = {
  id: "min_amount",
  if: {
    field: "tx.amount",
    op: ">=",
    value: "100000000"
  }
};

const NFT_NAME = "PAY.ID Rule – Min Amount";
const NFT_DESCRIPTION =
  "PAY.ID rule enforcing minimum transaction amount";

function canonicalize(obj: any): string {
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(",")}]`;
  }
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj)
      .sort()
      .map(
        (k) => `"${k}":${canonicalize(obj[k])}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(obj);
}

function keccak256Hex(input: string): string {
  return (
    "0x" +
    crypto
      .createHash("sha3-256")
      .update(input)
      .digest("hex")
  );
}

export async function mainPinata() {
  console.log("📦 Uploading rule NFT via Pinata SDK...\n");

  const canonicalRule = canonicalize(RULE_OBJECT);
  const ruleHash = keccak256Hex(canonicalRule);

  console.log("Canonical rule JSON:");
  console.log(canonicalRule);
  console.log("Rule hash:", ruleHash);


  console.log("\n🖼 Uploading image...");

  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  // const fileStream = fs.createReadStream(resultPath);
  const base64String = imageBuffer.toString('base64');
  const imageResult = await pinata.upload.public.base64(
    base64String
  );

  const imageCid = imageResult.cid;
  const imageURL =
    `${PINATA_GATEWAY}/${imageCid}`;

  console.log("Image URL:", imageURL);

  const metadata = {
    name: NFT_NAME,
    description: NFT_DESCRIPTION,
    image: imageURL,

    attributes: [
      { trait_type: "Rule ID", value: RULE_OBJECT.id },
      { trait_type: "Engine", value: "PAY.ID" },
      { trait_type: "Category", value: "Transaction Rule" }
    ],

    rule: RULE_OBJECT,
    ruleHash,
    standard: "payid.rule.v1"
  };

  fs.writeFileSync(
    OUTPUT_JSON_PATH,
    JSON.stringify(metadata, null, 2)
  );


  console.log("\n📤 Uploading metadata...");

  const metadataResult =
    await pinata.upload.public.json(metadata, {
      metadata: {
        name: "rule.json"
      }
    });

  const metadataCid = metadataResult.cid;

  console.log("\n✅ DONE");
  console.log("--------------------------------");
  console.log("tokenURI (use in contract):");
  console.log(`ipfs://${metadataCid}`);
  console.log("--------------------------------");
  console.log("metadata preview:");
  console.log(
    `${PINATA_GATEWAY}/${metadataCid}`
  );

  return { url: `${PINATA_GATEWAY}/${metadataCid}`, cid: metadataCid, metadata };
}
