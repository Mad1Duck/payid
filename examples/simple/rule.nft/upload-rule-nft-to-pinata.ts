/**
 * SETUP — Step 1a: Upload Rule NFT metadata ke Pinata (IPFS)
 *
 * Conditional upload:
 *  - Kalau rule.json sudah ada DAN ruleHash sama → skip upload, pakai cache
 *  - Kalau rule.json belum ada ATAU ruleHash beda → upload fresh ke Pinata
 *
 * Run: bun run setup:upload
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PinataSDK } from "pinata";
import { envData } from "../../config/config";

const {
  pinata: { jwt: PINATA_JWT, url: PINATA_URL, gateway: PINATA_GATEWAY },
} = envData;

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_URL,
});

const IMAGE_PATH = path.join(__dirname, "./rule.jpg");
const CACHE_JSON_PATH = path.join(__dirname, "./rule.json");

// ─── Definisi rule ────────────────────────────────────────────────────────────
// Edit bagian ini untuk mengubah rule yang di-upload
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return (
    "0x" + crypto.createHash("sha3-256").update(input).digest("hex")
  );
}

// ─── Cache check ──────────────────────────────────────────────────────────────

function loadCache(): { url: string; cid: string; metadata: any; } | null {
  if (!fs.existsSync(CACHE_JSON_PATH)) return null;

  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_JSON_PATH, "utf-8"));
    const currentHash = keccak256Hex(canonicalize(RULE_OBJECT));

    // Cache valid kalau ruleHash sama dan ada url/cid
    if (
      cached.ruleHash === currentHash &&
      cached._ipfsCid &&
      cached._ipfsUrl
    ) {
      return {
        url: cached._ipfsUrl,
        cid: cached._ipfsCid,
        metadata: cached,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function mainPinata() {
  const canonicalRule = canonicalize(RULE_OBJECT);
  const ruleHash = keccak256Hex(canonicalRule);

  // ── Check cache dulu ──────────────────────────────────────────────────────
  const cached = loadCache();
  if (cached) {
    console.log("⚡ Cache hit — skip upload Pinata");
    console.log("   ruleHash :", ruleHash);
    console.log("   tokenURI : ipfs://", cached.cid);
    console.log("   preview  :", cached.url);
    return cached;
  }

  // ── Fresh upload ──────────────────────────────────────────────────────────
  console.log("📦 Uploading to Pinata (no cache found)...\n");
  console.log("   ruleHash:", ruleHash);

  // Upload image
  console.log("\n🖼 Uploading image...");
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const imageResult = await pinata.upload.public.base64(
    imageBuffer.toString("base64")
  );
  const imageURL = `${PINATA_GATEWAY}/${imageResult.cid}`;
  console.log("   Image URL:", imageURL);

  // Build metadata
  const metadata = {
    name: NFT_NAME,
    description: NFT_DESCRIPTION,
    image: imageURL,
    attributes: [
      { trait_type: "Rule ID", value: RULE_OBJECT.id },
      { trait_type: "Engine", value: "PAY.ID" },
      { trait_type: "Category", value: "Transaction Rule" },
    ],
    rule: RULE_OBJECT,
    ruleHash,
    standard: "payid.rule.v1",
  };

  // Upload metadata JSON
  console.log("\n📤 Uploading metadata JSON...");
  const metaResult = await pinata.upload.public.json(metadata, {
    metadata: { name: "rule.json" },
  });

  const cid = metaResult.cid;
  const previewURL = `${PINATA_GATEWAY}/${cid}`;
  const tokenURI = `ipfs://${cid}`;

  // Save to cache — tambahkan _ipfsCid dan _ipfsUrl sebagai internal fields
  const cacheData = {
    ...metadata,
    _ipfsCid: cid,
    _ipfsUrl: previewURL,
  };
  fs.writeFileSync(CACHE_JSON_PATH, JSON.stringify(cacheData, null, 2));

  console.log("\n✅ Upload done");
  console.log("   tokenURI :", tokenURI);
  console.log("   preview  :", previewURL);
  console.log("   cached to:", CACHE_JSON_PATH);

  return { url: previewURL, cid, metadata };
}

// ─── Run langsung (bun run setup:upload) ─────────────────────────────────────
// FIX: pakai import.meta.main agar tidak auto-run saat file ini di-import
// oleh create-rule-item.ts
if (import.meta.main) {
  mainPinata()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌", err?.message ?? err);
      process.exit(1);
    });
}