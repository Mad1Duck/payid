// ─── Entry points ─────────────────────────────────────────────────────────────
export { createPayID, createPayIDClient, createPayIDServer } from "./factory";

// ─── Core interfaces ──────────────────────────────────────────────────────────
export type { PayIDClient, PayIDServer } from "./core/types";

// ─── Decision proof ───────────────────────────────────────────────────────────
export type { DecisionProof, DecisionPayload } from "./decision-proof/types";

// ─── Domain types ─────────────────────────────────────────────────────────────
export * from "./types/rule";
export * from "./types/context.v1";
export * from "./types/context.v2";
export * from "./types/result";
export * from "./types/attestation";

// ─── Attestation ──────────────────────────────────────────────────────────────
export * from "./attestation/verify";

// ─── Modules (namespace-qualified to avoid collision) ─────────────────────────
export * as sessionPolicy from "./sessionPolicy";
export * as rule from "./rule";
export * as issuer from "./issuer";
export * as context from "./context";
export * as eas from "./eas";
export * as storage from "./storage/zgStorage";

// ─── Client / Server class namespaces (for direct class access if needed) ─────
export * as client from "./core/client";
export * as server from "./core/server";
