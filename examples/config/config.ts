import { requireEnv } from "../utils/requireEnv";

export const envData = {
  rpcUrl: requireEnv("RPC_URL"),
  chainId: Number(requireEnv("CHAIN_ID")),

  account: {
    senderPk: requireEnv("SENDER_PRIVATE_KEY"),
    senderAddress: requireEnv("SENDER_ADDRESS"),
    reciverPk: requireEnv("RECIVER_PRIVATE_KEY"),
    reciverAddress: requireEnv("RECIVER_ADDRESS"),
    adminPk: requireEnv("ADMIN_PRIVATE_KEY"),
    adminAddress: requireEnv("ADMIN_ADDRESS"),
    issuerPk: requireEnv("ISSUER_PRIVATE_KEY"),
    issuerAddress: requireEnv("ISSUER_ADDRESS"),
  },

  pinata: {
    jwt: requireEnv("PINATA_JWT"),
    url: requireEnv("PINATA_URL"),
    gateway: requireEnv("PINATA_GATEWAY"),
  },

  contract: {
    combinedRuleStorage: requireEnv("COMBINED_RULE_STORAGE"),
    ruleItemERC721: requireEnv("RULE_ITEM_ERC721"),
    payIdVerifier: requireEnv("PAYID_VERIFIER"),
    payWithPayId: requireEnv("PAY_WITH_PAYID"),

    mockUSDC: requireEnv("MOCK_USDC"),
    mockEthUsdOracle: requireEnv("MOCK_ETH_USD_ORACLE"),
  },
} as const;
