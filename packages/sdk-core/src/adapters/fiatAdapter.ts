import { createPayIDClient } from "../factory";
import type { RuleContext } from "../types";
import type { RuleSource } from "../resolver/types";
import type { ethers } from "ethers";
import type { DecisionProof } from "../decision-proof/types";

/**
 * Extended context for fiat payment rails.
 * The WASM engine evaluates JSON loosely, so we use Record<string,any>
 * for tx fields beyond the standard RuleContext shape.
 */
type FiatRuleContext = Omit<RuleContext, "tx" | "env"> & {
  tx: Record<string, any>;
  env: { timestamp: number; };
};

/**
 * QRIS / fiat payment payload from a bank app or PSP.
 */
export interface QRISPayload {
  /** Transaction amount in smallest unit (e.g. IDR satang) */
  amount: string;
  /** ISO-4217 currency code, e.g. "IDR", "USD" */
  currency: string;
  /** Merchant ID or identifier */
  merchantId: string;
  /** Payment Service Provider code, e.g. "BANK_ABC" */
  pspCode: string;
  /** Optional POS terminal ID */
  terminalId?: string;
  /** Optional Merchant Category Code (ISO 18245) */
  mcc?: string;
  /** Optional linked wallet address */
  userWallet?: string;
}

/**
 * Result of evaluating a fiat payment against merchant rules.
 */
export interface FiatEvaluationResult {
  /** Whether the payment is allowed */
  allowed: boolean;
  /** EIP-712 Decision Proof (present when allowed) */
  proof?: DecisionProof;
  /** Rejection reason (present when not allowed) */
  reason?: string;
}

/**
 * FiatAdapter — bridge between traditional payment rails (QRIS, SWIFT, etc.)
 * and the PAY.ID policy engine.
 *
 * The adapter normalizes bank/PSP payloads into PAY.ID RuleContext,
 * evaluates merchant rules, and returns a DecisionProof for bank verification.
 *
 * @example
 * ```ts
 * const adapter = new FiatAdapter();
 *
 * const { allowed, proof, reason } = await adapter.evaluatePayment(
 *   {
 *     amount: '150000',
 *     currency: 'IDR',
 *     merchantId: 'MID123',
 *     pspCode: 'BANK_ABC',
 *   },
 *   'https://rules.example.com/merchant-rules.json',
 *   walletSigner,
 *   {
 *     verifyingContract: '0x...',
 *     ruleAuthority: '0x...',
 *     chainId: 31337,
 *   }
 * );
 * ```
 */
export class FiatAdapter {
  private readonly client;

  constructor(debugTrace?: boolean, wasm?: Uint8Array) {
    this.client = createPayIDClient({ debugTrace, wasm });
  }

  /**
   * Evaluate a fiat payment payload against merchant rules.
   */
  async evaluatePayment(
    payload: QRISPayload,
    merchantRuleURI: string | RuleSource,
    signer: ethers.Signer,
    contractConfig: {
      verifyingContract: string;
      ruleAuthority: string;
      chainId: number;
    }
  ): Promise<FiatEvaluationResult> {
    const context = this.buildContext(payload) as any;

    const authorityRule: RuleSource =
      typeof merchantRuleURI === "string"
        ? { uri: merchantRuleURI }
        : merchantRuleURI;

    const { result, proof } = await this.client.evaluateAndProve({
      context,
      authorityRule,
      payId: `pay.id/${payload.merchantId}`,
      payer: payload.userWallet ?? "bank:user:anon",
      receiver: payload.merchantId,
      asset: payload.currency,
      amount: BigInt(payload.amount),
      signer,
      verifyingContract: contractConfig.verifyingContract,
      ruleAuthority: contractConfig.ruleAuthority,
      chainId: contractConfig.chainId,
      blockTimestamp: context.env.timestamp,
    });

    return {
      allowed: result.decision === "ALLOW",
      proof: proof ?? undefined,
      reason: result.decision === "REJECT" ? result.reason : undefined,
    };
  }

  /**
   * Build a PAY.ID RuleContext from a fiat payload without evaluating.
   * Useful for previewing or debugging rule logic.
   */
  buildContext(payload: QRISPayload): FiatRuleContext {
    return {
      tx: {
        amount: payload.amount,
        currency: payload.currency,
        rail: "QRIS",
        merchantId: payload.merchantId,
        psp: payload.pspCode,
        terminalId: payload.terminalId,
        mcc: payload.mcc,
        sender: payload.userWallet ?? "bank:user:anon",
        receiver: payload.merchantId,
        asset: payload.currency,
      },
      payId: {
        id: `pay.id/${payload.merchantId}`,
        owner: payload.merchantId,
      },
      env: { timestamp: Math.floor(Date.now() / 1000) },
    };
  }
}
