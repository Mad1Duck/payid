import { createPublicClient, http, parseAbi } from 'viem'

const client = createPublicClient({
  transport: http('http://100.73.196.95:8550'),
})

const oracleAbi = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
])

async function main() {
  const oracleAddress = '0xbC06964732EbBd248F10C60CbdECEFd1B1F7d6e9' as `0x${string}`
  
  console.log('Checking oracle at:', oracleAddress)
  
  try {
    const decimals = await client.readContract({
      address: oracleAddress,
      abi: oracleAbi,
      functionName: 'decimals',
    })
    console.log('Decimals:', decimals)
    
    const description = await client.readContract({
      address: oracleAddress,
      abi: oracleAbi,
      functionName: 'description',
    })
    console.log('Description:', description)
    
    const data = await client.readContract({
      address: oracleAddress,
      abi: oracleAbi,
      functionName: 'latestRoundData',
    })
    console.log('Latest round data:', data)
    console.log('Price (raw):', data[1].toString())
    console.log('Price (formatted):', (Number(data[1]) / 10 ** Number(decimals)).toFixed(2))
  } catch (e) {
    console.error('Error reading oracle:', e)
  }
}

main()
