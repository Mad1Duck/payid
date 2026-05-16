import { encodePacked, keccak256 } from 'viem'

export function buildRuleSetHash(
  ruleNFT: `0x${string}`,
  tokenIds: Array<bigint>,
  version: bigint,
): `0x${string}` {
  const ruleNFTs = Array(tokenIds.length).fill(ruleNFT) as Array<`0x${string}`>
  return keccak256(
    encodePacked(
      ['address[]', 'uint256[]', 'uint64'],
      [ruleNFTs, tokenIds, version],
    ),
  )
}
