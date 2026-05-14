import { createHash } from "crypto";

export interface VerifyProofOptions {
  txHash: string;
  rpcUrl: string;
  payIDVerifierAddress: string;
  expectedSigner?: string;
}

export interface VerifyProofResult {
  valid: boolean;
  status: "verified" | "invalid" | "not_found" | "error";
  details?: {
    payId: string;
    payer: string;
    receiver: string;
    amount: string;
    asset: string;
    decision: "ALLOW" | "REJECT";
    timestamp: number;
    nonce: string;
    ruleAuthority: string;
  };
  error?: string;
}

/**
 * Verify a Decision Proof on-chain by txHash.
 *
 * @example
 * ```bash
 * npx payid verify-proof 0xabc123... \
 *   --verifier 0x5678... \
 *   --rpc http://127.0.0.1:8545
 * ```
 */
export async function verifyProof(options: VerifyProofOptions): Promise<VerifyProofResult> {
  try {
    // 1. Fetch transaction receipt
    const receipt = await fetchReceipt(options.txHash, options.rpcUrl);
    if (!receipt) {
      return {
        valid: false,
        status: "not_found",
        error: `Transaction ${options.txHash} not found`,
      };
    }

    // 2. Check if it called PayIDVerifier.verifyDecision
    const verifierLog = receipt.logs.find(
      (log: any) => log.address?.toLowerCase() === options.payIDVerifierAddress.toLowerCase()
    );

    if (!verifierLog) {
      return {
        valid: false,
        status: "invalid",
        error: "No PayIDVerifier call found in transaction logs",
      };
    }

    // 3. Parse decision from event data (mock parsing)
    const decision = parseDecisionFromLog(verifierLog);

    // 4. Optionally verify signer matches expected
    if (options.expectedSigner && decision.payer?.toLowerCase() !== options.expectedSigner.toLowerCase()) {
      return {
        valid: false,
        status: "invalid",
        details: decision,
        error: "Signer mismatch: expected " + options.expectedSigner,
      };
    }

    return {
      valid: decision.decision === "ALLOW",
      status: "verified",
      details: decision,
    };
  } catch (err: any) {
    return {
      valid: false,
      status: "error",
      error: err.message ?? String(err),
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchReceipt(txHash: string, rpcUrl: string): Promise<any | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const data = (await res.json()) as { result?: unknown; };
    return (data.result as any) ?? null;
  } catch {
    return null;
  }
}

function parseDecisionFromLog(log: any): VerifyProofResult["details"] & { decision: "ALLOW" | "REJECT"; } {
  // Placeholder: real implementation decodes EIP-712 Decision struct from log data
  // using ABI decoder (ethers.Interface or viem decodeEventLog)

  const mock: any = {
    payId: "alice.pay.id",
    payer: "0x1234567890123456789012345678901234567890",
    receiver: "0x0987654321098765432109876543210987654321",
    amount: "1000000000000000000",
    asset: "0x0000000000000000000000000000000000000000",
    decision: "ALLOW",
    timestamp: Date.now(),
    nonce: "42",
    ruleAuthority: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  };

  return mock;
}
