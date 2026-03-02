// rule/hashRuleSet.ts
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Canonical JSON serializer — identical to canonicalize.ts di backend.
 * Kunci diurutkan secara alfabetis agar output selalu deterministik
 * terlepas dari urutan key saat object dibuat.
 */
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

/**
 * Compute a deterministic hash of a canonicalized rule set.
 *
 * PENTING: Fungsi ini HARUS menggunakan stableStringify (bukan JSON.stringify)
 * agar menghasilkan hash yang sama dengan:
 * - register-combined-rule.ts (canonicalize + keccak256)
 * - decision-proof/hash.ts (hashRuleSet)
 * - CombinedRuleStorage.sol (ruleSetHash tersimpan on-chain)
 *
 * Menggunakan JSON.stringify biasa akan menghasilkan key order berbeda
 * → hash berbeda → getRuleByHash revert dengan RULE_NOT_ACTIVE.
 */
export function hashRuleSet(ruleSet: any): string {
  return keccak256(
    toUtf8Bytes(stableStringify(ruleSet))
  );
}