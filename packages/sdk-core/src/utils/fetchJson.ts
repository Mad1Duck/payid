import { subtleCrypto } from "../utils/subtle";

export async function fetchJsonWithHashCheck(
  url: string,
  expectedHash?: string
): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("RULE_FETCH_FAILED");
  }

  const buffer = await res.arrayBuffer();

  if (expectedHash) {
    const digest = await subtleCrypto.digest(
      "SHA-256",
      buffer
    );

    const actualHash = bufferToHex(digest);

    if (actualHash !== expectedHash) {
      throw new Error("RULE_HASH_MISMATCH");
    }
  }

  return JSON.parse(new TextDecoder().decode(buffer));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
