
// ─── Address per chain ────────────────────────────────────────────────────────
// Update setelah deploy, atau override via PayIDProvider

import type { PayIDContracts } from "../types";

export const PAYID_CONTRACTS: Record<number, PayIDContracts> = {
  // Localhost
  31337: {
    ruleAuthority: '0x0000000000000000000000000000000000000000',
    ruleItemERC721: '0x0000000000000000000000000000000000000000',
    combinedRuleStorage: '0x0000000000000000000000000000000000000000',
    payIDVerifier: '0x0000000000000000000000000000000000000000',
    payWithPayID: '0x0000000000000000000000000000000000000000',
  },
  // Lisk Sepolia
  4202: {
    ruleAuthority: '0x0000000000000000000000000000000000000000',
    ruleItemERC721: '0x0000000000000000000000000000000000000000',
    combinedRuleStorage: '0x0000000000000000000000000000000000000000',
    payIDVerifier: '0x0000000000000000000000000000000000000000',
    payWithPayID: '0x0000000000000000000000000000000000000000',
  },
  // Monad Testnet
  10143: {
    ruleAuthority: '0x0000000000000000000000000000000000000000',
    ruleItemERC721: '0x0000000000000000000000000000000000000000',
    combinedRuleStorage: '0x0000000000000000000000000000000000000000',
    payIDVerifier: '0x0000000000000000000000000000000000000000',
    payWithPayID: '0x0000000000000000000000000000000000000000',
  },
  // Moonbase Alpha
  1287: {
    ruleAuthority: '0x0000000000000000000000000000000000000000',
    ruleItemERC721: '0x0000000000000000000000000000000000000000',
    combinedRuleStorage: '0x0000000000000000000000000000000000000000',
    payIDVerifier: '0x0000000000000000000000000000000000000000',
    payWithPayID: '0x0000000000000000000000000000000000000000',
  },
};

export function getContracts(chainId: number): PayIDContracts {
  const contracts = PAYID_CONTRACTS[chainId];
  if (!contracts) throw new Error(`[payid-react] No contracts configured for chainId ${chainId}`);
  return contracts;
}
