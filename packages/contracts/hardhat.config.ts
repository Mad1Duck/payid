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
      type: "http"
    },

    liskSepolia: {
      type: "http",
      chainId: 4202,
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: {
        mnemonic: process.env.MNEMONIC ?? "",
      },
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL!,
      accounts: {
        mnemonic: process.env.MNEMONIC ?? "",
      },
    },
  },
});