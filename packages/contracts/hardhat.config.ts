import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],

  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },

  networks: {
    // ── Local ──────────────────────────────────────────────────────────────────
    // Deploy: bun hardhat ignition deploy ignition/modules/PayID.ts --network hardhatMainnet
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },

    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    // ── Lisk Sepolia ───────────────────────────────────────────────────────────
    // Deploy: bun hardhat ignition deploy ignition/modules/PayID.ts --network liskSepolia
    // .env: MNEMONIC="word1 word2 ... word12"
    liskSepolia: {
      type: "http",
      chainId: 4202,
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: {
        mnemonic: process.env.MNEMONIC ?? "",
      },
      // FIX: hapus "ignition: {}" — bukan field yang valid di network config
      // ignition options diset di level atas jika perlu
    },

    // ── Ethereum Sepolia ───────────────────────────────────────────────────────
    // Deploy: bun hardhat ignition deploy ignition/modules/PayID.ts --network sepolia
    // .env: SEPOLIA_RPC_URL=https://... dan MNEMONIC="..."
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      // FIX: tambah accounts, tanpa ini deploy ke sepolia tidak bisa sign tx
      accounts: {
        mnemonic: process.env.MNEMONIC ?? "",
      },
    },
  },
});