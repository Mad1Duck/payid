import type { Wallet } from "ethers";
import type { Attestation } from "../types";
import { signAttestation } from "./signAttestation";

/**
 * Issues token price context with USD equivalent calculation
 * 
 * @param wallet - Signer wallet for attestation
 * @param tokenPrice - Token price in USD (8 decimals, e.g., 100000000 = $1.00)
 * @param tokenAmount - Raw token amount in token units
 * @param tokenDecimals - Token decimals (e.g., 6 for USDC, 18 for ETH)
 * @returns Token price context with attestation proof
 */
export async function issueTokenPriceContext(
  wallet: Wallet,
  tokenPrice: bigint,
  tokenAmount: bigint,
  tokenDecimals: number
): Promise<{ amountUsd: string; proof: Attestation; }> {
  // Calculate USD equivalent: (tokenAmount * tokenPrice) / (10^tokenDecimals * 10^8)
  // tokenPrice is in 8 decimals (Chainlink standard)
  const amountUsd = (tokenAmount * tokenPrice) / (10n ** BigInt(tokenDecimals + 8));

  const proof = await signAttestation(
    wallet,
    { amountUsd: amountUsd.toString() },
    120
  );

  return { amountUsd: amountUsd.toString(), proof };
}
