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
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
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

    // Ethereum Sepolia (optional)
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      // accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },

    liskSepolia: {
      type: "http",
      chainId: 4202,
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: {
        mnemonic: process.env.MNEMONIC ?? ""
      },
      ignition: {}
      // accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },

  },
});
