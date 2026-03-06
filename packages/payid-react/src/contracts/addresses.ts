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
    ruleAuthority: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
    ruleItemERC721: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f",
    combinedRuleStorage: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
    payIDVerifier: "0x59b670e9fA9D0A427751Af201D676719a970857b",
    payWithPayID: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
  },

  4202: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
  },

  10143: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
  },

  1287: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
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