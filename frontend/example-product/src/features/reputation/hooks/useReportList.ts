import { useReadContract, useAccount } from 'wagmi'
import { usePayIDContext } from 'payid-react'

const VindexRegistryABI = [
  {
    type: 'function',
    name: 'getReportsAgainst',
    inputs: [{ name: 'target', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reportsAgainst',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

interface UseReportListParams {
  target?: `0x${string}`
}

export function useReportList({ target }: UseReportListParams) {
  const { address: connectedAddress } = useAccount()
  const { contracts } = usePayIDContext()
  const account = target ?? connectedAddress
  const resolvedRegistry = contracts.vindexRegistry
  const enabled = !!account && !!resolvedRegistry && resolvedRegistry !== '0x0000000000000000000000000000000000000000'

  const { data: reportIds, isLoading } = useReadContract({
    address: resolvedRegistry,
    abi: VindexRegistryABI,
    functionName: 'getReportsAgainst',
    args: account ? [account] : undefined,
    query: { enabled },
  })

  return {
    reportIds: (reportIds ?? []) as bigint[],
    isLoading,
    count: (reportIds ?? []).length,
  }
}
