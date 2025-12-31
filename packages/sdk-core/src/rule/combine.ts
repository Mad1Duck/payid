// rule/combineRules.ts
import type { RuleConfig } from "payid-types";
import { canonicalizeRuleSet } from "./canonicalize";

/**
 * Combine an authoritative rule set with additional ephemeral rules
 * for off-chain evaluation.
 *
 * This helper merges:
 * - A **default (authoritative) rule set** owned by the receiver
 * - One or more **ephemeral rule constraints** (e.g. session / QR rules)
 *
 * The resulting rule set is intended **ONLY for off-chain evaluation**
 * and MUST NOT be used as an authoritative rule on-chain.
 *
 * ## Security model
 *
 * - The default rule set defines sovereignty and ownership.
 * - Ephemeral rules can only further restrict behavior
 *   (logical AND composition).
 * - Ephemeral rules MUST NOT bypass or weaken default rules.
 *
 * ## Canonicalization
 *
 * - The combined rule set is canonicalized to ensure deterministic
 *   hashing and evaluation behavior.
 *
 * ## Invariants
 *
 * - The resulting rule set always uses logical AND semantics.
 * - Rule order is normalized via canonicalization.
 *
 * @param defaultRuleSet
 *   The authoritative rule configuration (on-chain registered).
 *
 * @param sessionRule
 *   A list of additional rule conditions derived from an ephemeral
 *   policy (session, QR, intent, etc.).
 *
 * @returns
 *   A canonicalized rule configuration suitable for off-chain
 *   evaluation.
 */
export function combineRules(
  defaultRuleSet: RuleConfig,
  sessionRule: any[]
) {
  return canonicalizeRuleSet({
    version: defaultRuleSet.version ?? "1",
    logic: "AND",
    rules: [
      ...defaultRuleSet.rules,
      ...sessionRule
    ]
  });
}
