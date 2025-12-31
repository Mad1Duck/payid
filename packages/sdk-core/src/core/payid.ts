import type {
  RuleContext,
  RuleResult,
  RuleConfig
} from "payid-types";

import { evaluate as evaluatePolicy } from "../evaluate";
import { resolveRule } from "../resolver/resolver";
import { generateDecisionProof } from "../decision-proof/generate";
import { buildPayCallData } from "../erc4337/build";
import { buildUserOperation } from "../erc4337/userop";

import type { RuleSource } from "../resolver/types";
import type { PayIDClient, PayIDServer } from "./types";
import type { ethers } from "ethers";

function isRuleSource(
  rule: RuleConfig | RuleSource
): rule is RuleSource {
  return (
    typeof rule === "object" &&
    rule !== null &&
    "uri" in rule
  );
}

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
export class PayID implements PayIDClient, PayIDServer {
  constructor(
    private readonly wasm: Uint8Array,
    private readonly debugTrace?: boolean,
    private readonly trustedIssuers?: Set<string>,
  ) { }

  /**
   * Evaluate a rule set against a given context using the PayID WASM engine.
   *
   * ## Responsibility
   *
   * This method performs **pure rule evaluation only**:
   * - Resolves the rule configuration (inline or via RuleSource)
   * - Executes the rule engine
   * - Returns an ALLOW / REJECT decision
   *
   * This method does NOT:
   * - Generate decision proofs
   * - Interact with on-chain rule registries
   * - Enforce rule ownership or authority
   * - Perform any signing
   *
   * ## Environment
   *
   * This method is **client-safe** and may be called from:
   * - Browsers
   * - Mobile apps
   * - Edge runtimes
   * - Backend services
   *
   * ## Rule source behavior
   *
   * - If `rule` is a `RuleConfig`, it is evaluated directly.
   * - If `rule` is a `RuleSource`, it is resolved off-chain
   *   before evaluation.
   *
   * @param context
   *   Rule execution context (transaction data, payId, etc.).
   *
   * @param rule
   *   Rule configuration to evaluate, either:
   *   - An inline `RuleConfig`, or
   *   - A `RuleSource` that resolves to a `RuleConfig`.
   *
   * @returns
   *   A `RuleResult` indicating whether the rule allows or
   *   rejects the given context.
   *
   * @throws
   *   May throw if rule resolution or evaluation fails.
   */
  async evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult> {
    const config = isRuleSource(rule)
      ? (await resolveRule(rule)).config
      : rule;

    return evaluatePolicy(this.wasm, context, config, { debug: this.debugTrace, trustedIssuers: this.trustedIssuers });
  }

  /**
   * Evaluate a payment intent against PayID rules and (if allowed)
   * generate an off-chain Decision Proof for on-chain verification.
   *
   * ## Conceptual model
   *
   * - `authorityRule` defines the **authoritative rule set**
   *   registered on-chain (NFT / combined rule).
   * - `evaluationRule` (optional) is an **off-chain override**
   *   used only for evaluation (e.g. QR / session / intent rule).
   * - On-chain verification ALWAYS references `authorityRule`.
   *
   * Invariant:
   * - Evaluation may use `authorityRule ∧ evaluationRule`
   * - Proof MUST reference `authorityRule` only
   *
   * @param params
   * @param params.context
   *   Normalized rule execution context (tx, payId, etc.)
   *
   * @param params.authorityRule
   *   The authoritative rule set owned by the receiver and
   *   registered in the on-chain rule registry.
   *   This rule defines on-chain sovereignty.
   *
   * @param params.evaluationRule
   *   Optional evaluation override applied off-chain only
   *   (e.g. QR rule, ephemeral constraint).
   *   If omitted, `authorityRule` is used for evaluation.
   *
   * @param params.payId
   *   PayID identifier associated with the receiver.
   *
   * @param params.payer
   *   Address initiating the payment and signing the decision proof.
   *
   * @param params.receiver
   *   Address receiving the payment and owning the authoritative rule.
   *
   * @param params.asset
   *   Asset address to be transferred (address(0) for native ETH).
   *
   * @param params.amount
   *   Amount to be transferred (uint256 semantics).
   *
   * @param params.signer
   *   Signer corresponding to `payer`, used to sign the EIP-712
   *   decision proof payload.
   *
   * @param params.ruleRegistryContract
   *   Address of the on-chain rule registry / storage contract
   *   used by the verifier to resolve `ruleSetHash`.
   *
   * @param params.ttlSeconds
   *   Optional proof validity duration (seconds).
   *   Defaults to implementation-defined TTL.
   *
   * @returns
   *   An object containing:
   *   - `result`: rule evaluation result (ALLOW / REJECT)
   *   - `proof`: signed decision proof if allowed, otherwise `null`
   *
   * @throws
   *   May throw if rule resolution, evaluation, or signing fails.
   */
  async evaluateAndProve(params: {
    context: RuleContext;
    authorityRule: RuleConfig,       // rule berdaulat (on-chain)
    evaluationRule?: RuleConfig,        // rule evaluasi (off-chain)
    payId: string;

    payer: string;
    receiver: string;

    asset: string;
    amount: bigint;

    signer: ethers.Signer;
    ttlSeconds?: number;
    verifyingContract: string; // ini contract address verifier
    ruleRegistryContract: string; // ini contract address combined rule
  }): Promise<{ result: RuleResult; proof: any | null; }> {
    const authorityConfig = isRuleSource(params.authorityRule)
      ? (await resolveRule(params.authorityRule)).config
      : params.authorityRule;

    const evalConfig = params.evaluationRule ?? authorityConfig;

    const result = await evaluatePolicy(
      this.wasm,
      params.context,
      evalConfig,
      {
        debug: this.debugTrace,
        trustedIssuers: this.trustedIssuers
      }
    );


    if (result.decision !== "ALLOW") {
      return { result, proof: null };
    }

    const proof = await generateDecisionProof({
      payId: params.payId,

      payer: params.payer,
      receiver: params.receiver,

      asset: params.asset,
      amount: params.amount,
      context: params.context,
      ruleConfig: authorityConfig,

      signer: params.signer,
      verifyingContract: params.verifyingContract,
      ruleRegistryContract: params.ruleRegistryContract,
      ttlSeconds: params.ttlSeconds
    });

    return { result, proof };
  }

  /**
   * Build an ERC-4337 UserOperation that executes a PayID payment
   * using a previously generated Decision Proof.
   *
   * ## Responsibility
   *
   * This function:
   * - Encodes the PayID `pay(...)` calldata using the provided proof
   * - Wraps it into an ERC-4337 UserOperation
   *
   * This function does NOT:
   * - Evaluate rules
   * - Generate decision proofs
   * - Perform any signature validation
   *
   * ## Environment constraint
   *
   * This function is **server-only** and MUST NOT be called in a browser:
   * - It is intended for bundlers, relayers, or backend services
   * - Client-side apps should only generate the proof
   *
   * A runtime guard is enforced to prevent accidental browser usage.
   *
   * @param params
   * @param params.proof
   *   A valid Decision Proof generated by `evaluateAndProve`.
   *
   * @param params.smartAccount
   *   The ERC-4337 smart account address that will submit the UserOperation.
   *
   * @param params.nonce
   *   Current nonce of the smart account.
   *
   * @param params.gas
   *   Gas parameters for the UserOperation
   *   (callGasLimit, verificationGasLimit, preVerificationGas,
   *    maxFeePerGas, maxPriorityFeePerGas).
   *
   * @param params.targetContract
   *   Address of the PayID-compatible payment contract
   *   (e.g. PayWithPayID).
   *
   * @param params.paymasterAndData
   *   Optional paymaster data for sponsored transactions.
   *
   * @returns
   *   A fully constructed ERC-4337 UserOperation ready to be
   *   submitted to a bundler.
   *
   * @throws
   *   Throws if called in a browser environment.
   */
  buildUserOperation(params: {
    proof: any;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
  }) {
    // server-only guard
    if (
      typeof globalThis !== "undefined" &&
      "document" in globalThis
    ) {
      throw new Error(
        "buildUserOperation must not be called in browser"
      );
    }

    const callData = buildPayCallData(
      params.targetContract,
      params.proof
    );

    return buildUserOperation({
      sender: params.smartAccount,
      nonce: params.nonce,
      callData,
      gas: params.gas,
      paymasterAndData: params.paymasterAndData
    });
  }
}