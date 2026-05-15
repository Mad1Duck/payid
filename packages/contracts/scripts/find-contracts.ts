import { createPublicClient, http } from 'viem'

const client = createPublicClient({
  transport: http('http://100.73.196.95:8550'),
})

// Common EAS addresses on various chains
const EAS_ADDRESSES = [
  '0xA1207F3BBa224E2c9c3C64453443449f2d617627', // Sepolia
  '0x0000000000000000000000000000000000000000', // Placeholder
]

// Try to find contracts by checking common addresses
async function main() {
  console.log('Searching for contracts on 0G fork...')

  // Check if we can connect
  const blockNumber = await client.getBlockNumber()
  console.log('Connected to block:', blockNumber.toString())

  // Try to find EAS by checking common addresses
  console.log('\nChecking common EAS addresses:')
  for (const addr of EAS_ADDRESSES) {
    try {
      const code = await client.getBytecode({ address: addr as `0x${string}` })
      if (code && code !== '0x') {
        console.log(`✓ Found contract at ${addr}`)
        console.log(`  Bytecode length: ${code.length / 2 - 1} bytes`)
      }
    } catch (e) {
      console.log(`✗ ${addr}: ${e}`)
    }
  }

  // Try to find Agent Registry - check if there's a contract with specific name
  // We'll need to search through recent blocks or check known addresses
  console.log('\nNote: Agent Registry address needs to be provided manually')
  console.log('Please check your fork documentation or deployment logs')
}

main().catch(console.error)
