import type { Wallet } from "ethers";
import type { ContextV1, ContextV2 } from "payid-types";
import { issueEnvContext } from "../issuer/issueEnvContext";
import { issueStateContext } from "../issuer/issueStateContext";
import { issueOracleContext } from "../issuer/issueOracleContext";
import { issueRiskContext } from "../issuer/issueRiskContext";

/**
 * Build an attested Context V2 object from a base execution context
 * and a set of optional attestation issuers.
 *
 * ## Purpose
 *
 * This function assembles **Context V2**, which extends a raw
 * execution context (Context V1) with **cryptographically attested
 * facts** such as:
 * - Environment data (time, runtime conditions)
 * - Stateful data (daily spend, quotas)
 * - Oracle data (country, FX rate, KYC attributes)
 * - Risk signals (ML score, risk category)
 *
 * The resulting context is suitable for:
 * - Deterministic rule evaluation
 * - Context V2 verification via `preprocessContextV2`
 * - Off-chain decision proof generation
 * - On-chain attestation verification
 *
 * ## Trust model
 *
 * - Each context domain (`env`, `state`, `oracle`, `risk`) MUST be
 *   issued and signed by a trusted issuer.
 * - The rule engine does NOT trust raw values; it only trusts
 *   verified attestations.
 * - Which domains are required is determined by `ruleConfig.requires`.
 *
 * ## Responsibility
 *
 * This function:
 * - Calls the appropriate issuer functions to generate attestations
 * - Aggregates all issued contexts into a single Context V2 object
 * - Does NOT evaluate rules
 * - Does NOT perform attestation verification
 *
 * ## Environment
 *
 * This function may be called from:
 * - Backend services
 * - Relayers / bundlers
 * - Edge runtimes
 *
 * It SHOULD NOT be called directly from untrusted clients unless
 * issuer keys are properly secured.
 *
 * @example
 * ### Minimal Context V2 (env + state only)
 *
 * ```ts
 * const contextV2 = await buildContextV2({
 *   baseContext: {
 *     tx,
 *     payId
 *   },
 *   env: {
 *     issuer: envIssuer
 *   },
 *   state: {
 *     issuer: stateIssuer,
 *     spentToday: "2500000",
 *     period: "DAY"
 *   }
 * });
 * ```
 *
 * @example
 * ### Full Context V2 (env + state + oracle + risk)
 *
 * ```ts
 * const contextV2 = await buildContextV2({
 *   baseContext: {
 *     tx,
 *     payId
 *   },
 *   env: {
 *     issuer: envIssuer
 *   },
 *   state: {
 *     issuer: stateIssuer,
 *     spentToday: "2500000",
 *     period: "DAY"
 *   },
 *   oracle: {
 *     issuer: oracleIssuer,
 *     data: {
 *       country: "ID",
 *       fxRate: 15600
 *     }
 *   },
 *   risk: {
 *     issuer: riskIssuer,
 *     score: 72,
 *     category: "MEDIUM",
 *     modelHash: "0xmodelhash123"
 *   }
 * });
 * ```
 *
 * @param params
 *   Context assembly parameters.
 *
 * @param params.baseContext
 *   Base execution context (Context V1), containing transaction
 *   and PayID-related fields.
 *
 * @param params.env
 *   Optional environment attestation.
 *   Typically used for time-based or runtime constraints.
 *
 * @param params.state
 *   Optional state attestation.
 *   Used for cumulative values such as daily spend or quota tracking.
 *
 * @param params.oracle
 *   Optional oracle attestation.
 *   Used for external facts such as country, FX rate, or KYC signals.
 *
 * @param params.risk
 *   Optional risk attestation.
 *   Used for ML-based risk scoring and categorization.
 *
 * @returns
 *   A fully assembled Context V2 object containing the base context
 *   and all requested attested sub-contexts.
 *
 * @throws
 *   May throw if attestation issuance fails for any domain.
 */
export async function buildContextV2(params: {
  baseContext: ContextV1;

  env?: {
    issuer: Wallet;
  };

  state?: {
    issuer: Wallet;
    spentToday: string;
    period: string;
  };

  oracle?: {
    issuer: Wallet;
    data: Record<string, string | number>;
  };

  risk?: {
    issuer: Wallet;
    score: number;
    category: string;
    modelHash: string;
  };
}): Promise<ContextV2> {

  const ctx: ContextV2 = {
    ...params.baseContext
  };

  if (params.env) {
    ctx.env = await issueEnvContext(
      params.env.issuer
    );
  }

  if (params.state) {
    ctx.state = await issueStateContext(
      params.state.issuer,
      params.state.spentToday,
      params.state.period
    );
  }

  if (params.oracle) {
    ctx.oracle = await issueOracleContext(
      params.oracle.issuer,
      params.oracle.data
    );
  }

  if (params.risk) {
    ctx.risk = await issueRiskContext(
      params.risk.issuer,
      params.risk.score,
      params.risk.category,
      params.risk.modelHash
    );
  }

  return ctx;
}