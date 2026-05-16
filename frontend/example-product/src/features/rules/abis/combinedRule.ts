export const COMBINED_ABI = [
  {
    name: 'registerCombinedRule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ruleSetHash', type: 'bytes32' },
      { name: 'ruleNFTs', type: 'address[]' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'version', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    name: 'registerCombinedRuleForDirection',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ruleSetHash', type: 'bytes32' },
      { name: 'direction', type: 'uint8' },
      { name: 'ruleNFTs', type: 'address[]' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'version', type: 'uint64' },
    ],
    outputs: [],
  },
] as const
