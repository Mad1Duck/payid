import { keccak256, toUtf8Bytes } from "ethers";

export function verifyHash(
  content: string,
  expectedHash?: string
) {
  if (!expectedHash) return;

  const actual = keccak256(toUtf8Bytes(content));
  if (actual !== expectedHash) {
    throw new Error("RULE_HASH_MISMATCH");
  }
}