import { PayIDClient } from "./core/client/client";
import { PayIDServer } from "./core/server/server";
import type { ethers } from "ethers";
import type { ZGStorage } from "./storage/zgStorage";

/**
 * Create a client-safe PayID instance.
 *
 * - Safe for browser, mobile, and edge runtimes.
 * - Signer is injected per-call in `evaluateAndProve`.
 * - WASM rule engine with automatic TS fallback.
 *
 * @example
 * ```ts
 * // Browser / React
 * const client = createPayIDClient({ debugTrace: true });
 * const { result, proof } = await client.evaluateAndProve({
 *   ..., signer: walletSigner
 * });
 * ```
 */
export function createPayIDClient(params?: {
  wasm?: Uint8Array;
  debugTrace?: boolean;
}): PayIDClient {
  return new PayIDClient(params?.debugTrace, params?.wasm);
}

/**
 * Create a server-side PayID instance.
 *
 * - For backends, bundlers, and relayers only — never ship to browser.
 * - Signer is bound at construction time (server wallet).
 * - Supports Context V2 with `trustedIssuers` enforcement.
 * - Can build ERC-4337 UserOperations.
 *
 * @example
 * ```ts
 * // Backend / bundler
 * const server = createPayIDServer({
 *   signer: serverWallet,
 *   trustedIssuers: new Set([TIME_ISSUER, RISK_ISSUER]),
 * });
 * const { result, proof } = await server.evaluateAndProve({ ... });
 * const userOp = server.buildUserOperation({ proof, paymentType: "erc20", ... });
 * ```
 */
export function createPayIDServer(params: {
  signer: ethers.Signer;
  wasm?: Uint8Array;
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;
  storage?: ZGStorage;
}): PayIDServer {
  return new PayIDServer(
    params.signer,
    params.trustedIssuers,
    params.debugTrace,
    params.wasm,
    params.storage,
  );
}

/**
 * Alias for `createPayIDClient` — backwards-compatible entry point.
 * Prefer `createPayIDClient` or `createPayIDServer` for clarity.
 */
export function createPayID(params?: {
  wasm?: Uint8Array;
  debugTrace?: boolean;
}): PayIDClient {
  return createPayIDClient(params);
}
