/**
 * Canonicalize a rule set into a deterministic, order-independent form.
 *
 * Canonicalization ensures that semantically identical rule sets
 * always produce the same structural representation, regardless of:
 * - Rule insertion order
 * - Object key order
 * - Nested object layout
 *
 * This function is CRITICAL for:
 * - Rule hashing (`ruleSetHash`)
 * - Policy signing (QR / session / intent)
 * - Consistent off-chain evaluation
 *
 * ## Canonicalization rules
 *
 * - Rules are normalized individually.
 * - Rule entries are sorted lexicographically by `id`.
 * - All nested objects are recursively sorted by key.
 * - Arrays preserve their original order unless explicitly sorted.
 *
 * ## Security model
 *
 * - Canonicalization MUST be applied BEFORE hashing or signing.
 * - Canonicalization MUST NOT be applied during verification
 *   (the verified payload must match exactly what was signed).
 *
 * ## Invariants
 *
 * - Canonicalization does NOT change rule semantics.
 * - Canonicalization does NOT weaken rule constraints.
 * - Canonicalization is a pure, deterministic operation.
 *
 * @param ruleSet
 *   A rule configuration object containing:
 *   - `version`: rule schema version
 *   - `logic`: logical operator ("AND" | "OR")
 *   - `rules`: list of rule definitions
 *
 * @returns
 *   A canonicalized rule configuration suitable for hashing,
 *   signing, and deterministic evaluation.
 */
export function canonicalizeRuleSet(ruleSet: {
  version: string;
  logic: "AND" | "OR";
  rules: any[];
}) {
  return {
    version: ruleSet.version,
    logic: ruleSet.logic,
    rules: ruleSet.rules
      .map(rule => canonicalizeRule(rule))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
}

/**
 * Canonicalize a single rule definition.
 *
 * - Normalizes the rule identifier.
 * - Canonicalizes the conditional expression (`if`) recursively.
 *
 * @param rule
 *   A single rule object.
 *
 * @returns
 *   A canonicalized rule representation.
 */
function canonicalizeRule(rule: any) {
  return {
    id: rule.id,
    if: canonicalizeObject(rule.if)
  };
}

/**
 * Recursively canonicalize an arbitrary object.
 *
 * - Object keys are sorted lexicographically.
 * - Nested objects are canonicalized depth-first.
 * - Primitive values are returned as-is.
 *
 * @param obj
 *   Any JSON-compatible value.
 *
 * @returns
 *   A canonicalized representation of the input.
 */
function canonicalizeObject(obj: any): any {
  if (obj === undefined) {
    throw new Error("Undefined value not allowed in canonical object");
  }

  if (
    typeof obj === "function" ||
    typeof obj === "symbol"
  ) {
    throw new Error("Non-JSON value not allowed in canonical object");
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalizeObject(obj[key]);
        return acc;
      }, {} as any);
  }

  return obj;
}

