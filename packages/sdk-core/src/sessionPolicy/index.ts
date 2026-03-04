// src/sessionPolicy/index.ts

// ─── V1 (legacy) ─────────────────────────────────────────────────────────────
export { createSessionPolicyPayload } from "./create";
export { decodeSessionPolicy } from "./decode";

// ─── V2 (Channel A) ──────────────────────────────────────────────────────────
export {
  createSessionPolicyV2,
  buildSessionPolicyV2Domain,
  SESSION_POLICY_V2_TYPES,
} from "./create";

export {
  decodeSessionPolicyV2,
  encodeSessionPolicyV2QR,
  decodeSessionPolicyV2QR,
} from "./decode";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  PayIDSessionPolicyPayloadV1,
  SessionPolicyV2,
} from "./types";
