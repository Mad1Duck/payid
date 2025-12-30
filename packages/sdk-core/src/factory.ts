import { PayID } from "./core/payid";
import type { PayIDClient, PayIDServer } from "./core/types";

/**
 * Create a PayID policy engine instance backed by a WASM rule evaluator.
 *
 * ## Responsibility
 *
 * - Holds the WASM binary used for rule execution
 * - Defines the trust boundary for context attestation verification
 * - Acts as the primary entry point for PayID rule evaluation
 *
 * ## Trust model
 *
 * - If `trustedIssuers` is provided, Context V2 attestation
 *   verification is ENFORCED.
 * - If `trustedIssuers` is omitted, the engine runs in
 *   legacy (Context V1) mode without cryptographic verification.
 *
 * ## Environment
 *
 * This class is safe to instantiate in:
 * - Browsers
 * - Mobile apps
 * - Edge runtimes
 * - Backend services
 *
 * @param wasm
 *   Compiled PayID WASM rule engine binary.
 *
 * @param debugTrace
 *   Optional flag to enable decision trace generation for debugging.
 * 
 * @param trustedIssuers
 *   Optional set of trusted attestation issuer addresses.
 *
 *   When provided, Context V2 attestation verification is ENFORCED:
 *   - Only attestations issued by addresses in this set are accepted.
 *   - Missing, expired, or invalid attestations cause evaluation to fail.
 *
 *   When omitted, the engine runs in legacy (Context V1) mode
 *   without cryptographic verification.
 *
 *   ⚠️ Important:
 *   - Do NOT pass an empty Set.
 *     An empty set means "no issuer is trusted" and will
 *     cause all attestations to be rejected.
 *
 *   @example
 *   ```ts
 *   const trustedIssuers = new Set([
 *     TIME_ISSUER,
 *     STATE_ISSUER,
 *     ORACLE_ISSUER,
 *     RISK_ISSUER
 *   ]);
 *
 *   const payid = new PayID(wasmBinary, debugTrace, trustedIssuers);
 *   ```
 */
export function createPayID(params: {
  wasm: Uint8Array;
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;
}): PayIDClient & PayIDServer {
  return new PayID(
    params.wasm,
    params.debugTrace ?? false,
    params.trustedIssuers
  );
}
