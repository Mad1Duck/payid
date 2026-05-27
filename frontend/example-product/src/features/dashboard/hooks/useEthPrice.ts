import { useReadContract } from 'wagmi';
import { addresses } from '@/constants/contracts/addresses';

const CHAINLINK_ORACLE_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CHAINLINK_FEEDS: Record<number, `0x${string}`> = {
  421614: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
  11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  84532: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
};

export function useEthPrice(chainId: number): number {
  const chainlinkAddr = CHAINLINK_FEEDS[chainId];
  const mockAddr = (addresses as Record<number, Record<string, `0x${string}`>>)[chainId]?.MockOracle;
  const oracleAddr = chainlinkAddr ?? mockAddr;

  const { data } = useReadContract({
    address: oracleAddr,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: 'latestRoundData',
    query: { enabled: !!oracleAddr, staleTime: 60_000 },
  });

  if (data && Array.isArray(data) && data[1]) {
    const price = Number(data[1]) / 1e8;
    if (price > 100 && price < 1_000_000) return price;
  }
  return 3500;
}
