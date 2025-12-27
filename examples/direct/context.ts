import type { RuleContext } from "payid-types";

export const context: RuleContext = {
  tx: {
    sender: "0x73F98364f6B62a5683F2C14ae86a23D7288f6106",
    receiver: "0xAdfED322a38D35Db150f92Ae20BDe3EcfCEf6b84",

    asset: "USDC",

    amount: "150000000",

    chainId: 4202
  },

  payId: {
    id: "pay.id/lisk-sepolia-demo",
    owner: "0x73F98364f6B62a5683F2C14ae86a23D7288f6106"
  }
};
