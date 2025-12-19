import { keccak256 } from "ethers";

export function verifyHash(
  content: string,
  expectedHash?: string
) {
  if (!expectedHash) return;

  const actual = keccak256(Buffer.from(content));
  if (actual !== expectedHash) {
    throw new Error("RULE_HASH_MISMATCH");
  }
}
