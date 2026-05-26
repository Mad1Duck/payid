export const CHAINLINK_ORACLE_ADDRESSES: Record<number, `0x${string}` | undefined> = {
  31337: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock oracle for local dev
  1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mainnet
  11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia
  16600: '0x0000000000000000000000000000000000000000', // 0G Newton Testnet (real) — update after deploy
  16601: '0xd038a2ee73b64f30d65802ad188f27921656f28f', // 0G Newton Testnet (Fork) — deployed oracle
  16602: '0x49fF785E85e5cA564E8bc1EE7EF5548E41500C12', // 0G Galileo Testnet — deployed MockOracle
  16661: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // 0G Mainnet
  4202: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Lisk Sepolia
  421614: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165', // Arbitrum Sepolia ETH/USD
  84532: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',  // Base Sepolia ETH/USD
};

// Token price oracle addresses (Chainlink Price Feeds)
export const TOKEN_PRICE_ORACLES: Record<number, Record<string, `0x${string}`>> = {
  1: {
    'USDC/USD': '0x8fFfF9545Ff14a92c8329c339F71d3f3Ea8eD444', // Mainnet
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', // Mainnet
    'DAI/USD': '0xAed0c38402a5d19df6E4c03f4322c2963490d050', // Mainnet
    'WBTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // Mainnet
    'LINK/USD': '0x2c1d072e956AFFc0D435Cb7D389FaE8fC5B9cB2D', // Mainnet
    'UNI/USD': '0xD71eCFF9422D8057F9692e8DdA2B7549aCf96663', // Mainnet
  },
  11155111: {
    'USDC/USD': '0xA2F78d2358df4E29c589B9C1Ada1ddc062c1Ec4e', // Sepolia
    'USDT/USD': '0x20955D69f13E1e2c3c1f9BfF2Ad5C807485A4f0e', // Sepolia
    'DAI/USD': '0x14866185B1962A69b940F2c2953A6C3747525b43', // Sepolia
    'WBTC/USD': '0x7e87009ceF4D986fC2719BfF2adEA5565dfB9C56', // Sepolia
    'LINK/USD': '0xc59E36313BAa28Cf64E2863425DCc5b33Ae4C8f3', // Sepolia
    'UNI/USD': '0xD71eCFF9422D8057F9692e8DdA2B7549aCf96663', // Sepolia (same as mainnet)
  },
  31337: {
    'USDC/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'USDT/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'DAI/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'WBTC/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'LINK/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
    'UNI/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for local dev
  },
  16601: {
    'USDC/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for 0G Newton Testnet Fork (Chainlink not supported yet)
    'USDT/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for 0G Newton Testnet Fork
    'DAI/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for 0G Newton Testnet Fork
    'WBTC/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for 0G Newton Testnet Fork
    'LINK/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for 0G Newton Testnet Fork
    'UNI/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mock for 0G Newton Testnet Fork
  },
  16602: {
    'USDC/USD': '0x49fF785E85e5cA564E8bc1EE7EF5548E41500C12', // MockOracle on 0G Galileo Testnet
    'USDT/USD': '0x49fF785E85e5cA564E8bc1EE7EF5548E41500C12',
    'DAI/USD': '0x49fF785E85e5cA564E8bc1EE7EF5548E41500C12',
  },
  421614: {
    'LINK/USD': '0xd6d4Cad5cb37AfA6b9C3bfA3f7fea4cFB1be18CB', // Arbitrum Sepolia
  },
  84532: {
    'LINK/USD': '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61', // Base Sepolia
  },
};

export const CHAINLINK_ORACLE_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const;
