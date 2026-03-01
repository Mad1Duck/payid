import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
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
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      type: "http",
    },

    // ─── Testnets ─────────────────────────────────────────────────────────────

    liskSepolia: {
      type: "http",
      chainId: 4202,
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
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

    // Moonbase Alpha — Moonbeam testnet (Polkadot EVM)
    moonbaseAlpha: {
      type: "http",
      chainId: 1287,
      url: "https://rpc.api.moonbase.moonbeam.network",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    // ─── Mainnets ─────────────────────────────────────────────────────────────

    polygon: {
      type: "http",
      chainId: 137,
      url: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    base: {
      type: "http",
      chainId: 8453,
      url: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    // Moonbeam Mainnet (Polkadot EVM)
    moonbeam: {
      type: "http",
      chainId: 1284,
      url: process.env.MOONBEAM_RPC_URL ?? "https://rpc.api.moonbeam.network",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },

    // Moonriver (Kusama EVM — canary network)
    moonriver: {
      type: "http",
      chainId: 1285,
      url: process.env.MOONRIVER_RPC_URL ?? "https://rpc.api.moonriver.moonbeam.network",
      accounts: { mnemonic: process.env.MNEMONIC ?? "" },
    },
  },
});