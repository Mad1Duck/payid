import { keccak256 } from "ethers";

function stableStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }
  if (obj && typeof obj === "object") {
    return `{${Object.keys(obj).sort().map(
      k => `"${k}":${stableStringify(obj[k])}`
    ).join(",")}}`;
  }
  return JSON.stringify(obj);
}

function toUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function hashContext(context: any): string {
  return keccak256(toUtf8Bytes(stableStringify(context)));
}

export function hashRuleSet(ruleConfig: any): string {
  // WAJIB gunakan stableStringify (key-sorted) agar hash konsisten
  // dengan register-combined-rule.ts yang juga menggunakan canonicalize()
  // JSON.stringify() menghasilkan key order yang berbeda → hash mismatch → RULE_NOT_ACTIVE revert
  return keccak256(toUtf8Bytes(stableStringify(ruleConfig)));
}