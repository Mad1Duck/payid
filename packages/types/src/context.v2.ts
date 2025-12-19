import type { ContextV1 } from "./context.v1";

export interface Attestation {
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

/* ---- Extensions ---- */

export interface EnvContext {
  timestamp: number;
  proof: Attestation;
}

export interface StateContext {
  spentToday: string;
  period: string;
  proof: Attestation;
}

export interface OracleContext {
  [key: string]: string | number | Attestation;
  proof: Attestation;
}

export interface RiskContext {
  score: number;
  category: string;
  proof: Attestation & {
    modelHash: string;
  };
}

/* ---- Final Context ---- */

export interface ContextV2 extends ContextV1 {
  env?: EnvContext;
  state?: StateContext;
  oracle?: OracleContext;
  risk?: RiskContext;
}
