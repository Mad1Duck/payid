// rule/hashRuleSet.ts
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Compute a deterministic hash of a canonicalized rule set.
 *
 * This function produces the `ruleSetHash` used to:
 * - Reference authoritative rules in on-chain registries
 * - Bind decision proofs to a specific rule configuration
 * - Ensure integrity between off-chain evaluation and on-chain verification
 *
 * ## Canonicalization requirement
 *
 * - The input rule set MUST already be canonicalized using
 *   `canonicalizeRuleSet`.
 * - Hashing a non-canonical rule set may result in inconsistent
 *   hashes for semantically identical rules.
 *
 * ## Security model
 *
 * - The hash represents the exact structure of the rule set at the
 *   time of hashing.
 * - Any mutation (key order, rule order, value change) will produce
 *   a different hash.
 *
 * ## Invariants
 *
 * - This function does NOT perform canonicalization.
 * - This function is pure and deterministic.
 * - The same canonical rule set will always yield the same hash.
 *
 * @param ruleSet
 *   A canonicalized rule configuration object.
 *
 * @returns
 *   A `bytes32` hex string (keccak256) uniquely identifying the rule set.
 */
export function hashRuleSet(ruleSet: any): string {
  return keccak256(
    toUtf8Bytes(JSON.stringify(ruleSet))
  );
}
