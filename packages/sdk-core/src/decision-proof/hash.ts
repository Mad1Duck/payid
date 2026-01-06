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

export function hashContext(context: any): string {
  return keccak256(Buffer.from(stableStringify(context)));
}

export function hashRuleSet(ruleConfig: any): string {
  return keccak256(Buffer.from(stableStringify(ruleConfig)));
}
