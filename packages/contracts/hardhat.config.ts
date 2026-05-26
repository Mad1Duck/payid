import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],

  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          viaIR: true,
        },
      },
    ],
  },

  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },

    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    localhost: {
      type: "edr-simulated",
      chainType: "l1",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 5,
      }
    },

    devnode: {
      type: "http",
      chainId: 31337,
      url: "http://100.73.196.95:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 5,
      },
    },

    liskSepolia: {
      type: "http",
      chainId: 4202,
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: "https://rpc.sepolia.org",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    monadTestnet: {
      type: "http",
      chainId: 10143,
      url: "https://testnet-rpc.monad.xyz",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    polygonAmoy: {
      type: "http",
      chainId: 80002,
      url: "https://rpc-amoy.polygon.technology",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    baseSepolia: {
      type: "http",
      chainId: 84532,
      url: "https://sepolia.base.org",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    moonbaseAlpha: {
      type: "http",
      chainId: 1287,
      url: "https://rpc.api.moonbase.moonbeam.network",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    polygon: {
      type: "http",
      chainId: 137,
      url: "https://polygon-rpc.com",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    base: {
      type: "http",
      chainId: 8453,
      url: "https://mainnet.base.org",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    moonbeam: {
      type: "http",
      chainId: 1284,
      url: "https://rpc.api.moonbeam.network",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    // Real 0G Newton Testnet (chainId 16600)
    // RPC options: https://rpc-newton.0g.ai | https://16600.rpc.thirdweb.com
    // If "Invalid chain" error, try alternative RPC or ask 0G team for current endpoint
    zeroGTestnet: {
      type: "http",
      chainId: 16600,
      url: "https://rpc-newton.0g.ai",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    localFork: {
      type: "http",
      chainId: 31338,
      url: process.env.LOCAL_FORK_RPC_URL ?? "http://100.73.196.95:8550",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 5,
      },
    },

    // 0G Galileo Testnet (chainId 16602)
    zeroGGalileo: {
      type: "http",
      chainId: 16602,
      url: "https://evmrpc-testnet.0g.ai",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    zeroGMainnet: {
      type: "http",
      chainId: 16661,
      url: "https://evmrpc.0g.ai",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    moonriver: {
      type: "http",
      chainId: 1285,
      url: "https://rpc.api.moonriver.moonbeam.network",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    arbitrumSepolia: {
      type: "http",
      chainId: 421614,
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },
  },
});