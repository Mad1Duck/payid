import type { PayIDContracts } from "../types";

/**
 * Contract addresses per chainId.
 *
 * FIX: Semua chain sebelumnya berisi zero addresses sehingga setiap
 * interaksi on-chain dari payid-react akan silently send ke address(0).
 *
 * Localhost (31337) di-fill dari ignition/deployments/chain-31337/deployed_addresses.json.
 * Chain lain perlu di-fill setelah deploy ke masing-masing network.
 *
 * Untuk override per-chain di runtime, gunakan prop `contracts` di <PayIDProvider>:
 * @example
 * <PayIDProvider contracts={{ 31337: { payIDVerifier: '0x...', ... } }}>
 */
export const PAYID_CONTRACTS: Record<number, PayIDContracts> = {

  31337: {
    ruleAuthority: "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9",
    ruleItemERC721: "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8",
    combinedRuleStorage: "0x09635F643e140090A9A8Dcd712eD6285858ceBef",
    payIDVerifier: "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB",
    payWithPayID: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
    vindexRegistry: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
    aiAgentRegistry: "0x0000000000000000000000000000000000000000",
    aiAgentRuleManager: "0x0000000000000000000000000000000000000000",
  },

  4202: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
    vindexRegistry: "0x0000000000000000000000000000000000000000",
  },

  10143: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
    vindexRegistry: "0x0000000000000000000000000000000000000000",
  },

  1287: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
    vindexRegistry: "0x0000000000000000000000000000000000000000",
  },

  // 0G Newton Testnet
  16600: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
    vindexRegistry: "0x0000000000000000000000000000000000000000",
  },
};

export function getContracts(chainId: number): PayIDContracts {
  const contracts = PAYID_CONTRACTS[chainId];
  if (!contracts) {
    throw new Error(`[payid-react] No contracts configured for chainId ${chainId}. ` +
      `Pass the 'contracts' prop to <PayIDProvider> to override.`);
  }
  return contracts;
}