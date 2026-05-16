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

  // 0G Newton Testnet (real, chain 16600) — update after deploy
  16600: {
    ruleAuthority: "0x0000000000000000000000000000000000000000",
    ruleItemERC721: "0x0000000000000000000000000000000000000000",
    combinedRuleStorage: "0x0000000000000000000000000000000000000000",
    payIDVerifier: "0x0000000000000000000000000000000000000000",
    payWithPayID: "0x0000000000000000000000000000000000000000",
    vindexRegistry: "0x0000000000000000000000000000000000000000",
    attestationVerifier: "0x0000000000000000000000000000000000000000",
    aiAgentRegistry: "0x0000000000000000000000000000000000000000",
    aiAgentRuleManager: "0x0000000000000000000000000000000000000000",
  },

  // 0G Newton Testnet (Fork, chain 16601)
  16601: {
    ruleAuthority: "0x25A1DF485cFBb93117f12fc673D87D1cddEb845a",
    ruleItemERC721: "0xD855cE0C298537ad5b5b96060Cf90e663696bbf6",
    combinedRuleStorage: "0xA9d0Fb5837f9c42c874e16da96094b14Af0e2784",
    payIDVerifier: "0xF9c0bF1CFAAB883ADb95fed4cfD60133BffaB18a",
    payWithPayID: "0xb830887eE23d3f9Ed8c27dbF7DcFe63037765475",
    vindexRegistry: "0x22b1c5C2C9251622f7eFb76E356104E5aF0e996A",
    attestationVerifier: "0x6e0a5725dD4071e46356bD974E13F35DbF9ef367",
    aiAgentRegistry: "0x1eB5C49630E08e95Ba7f139BcF4B9BA171C9a8C7",
    aiAgentRuleManager: "0x5A569Ad19272Afa97103fD4DbadF33B2FcbaA175",
  },

  // 0G Galileo Testnet (chain 16602)
  16602: {
    ruleAuthority: "0x3d2F9441c589a24A524c36892268f35C6467bFF6",
    ruleItemERC721: "0xc22fE6CbeE7fA5A35DAf40B30D91d5D3bFfa2fD8",
    combinedRuleStorage: "0x486a6d305742B0b5847770BF421114161440E79b",
    payIDVerifier: "0xE2FfE1037b996B8F66dE7cba0398A411850Ecd91",
    payWithPayID: "0x04eEAF2dc4Ee22E7362a60dd652E1DF450697dbb",
    vindexRegistry: "0x3F6ba46650f78AcAeebf906306987994555a8CCb",
    attestationVerifier: "0x524130A6974B3075eb6DB32afA89AE4315bf7b2d",
    aiAgentRegistry: "0x76E829f48BD5e3c5380f5c77Fe1a3EFBD9AC5a44",
    aiAgentRuleManager: "0xd5eA6ABe9727061c18fa65Fcd75bd7dAc7E7e7f5",
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