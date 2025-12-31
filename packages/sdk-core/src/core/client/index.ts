import { PayIDClient as PayID } from "./client";
import type { PayIDClient, PayIDServer } from "../types";

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
 *   @example
 *   ```ts
 *
 *   const payid = new PayID(wasmBinary, debugTrace);
 *   ```
 */
export function createPayID(params: {
  wasm: Uint8Array;
  debugTrace?: boolean;
}) {
  return new PayID(
    params.wasm,
    params.debugTrace ?? false,
  );
}
