import type { RuleContext } from "@payid/sdk-core";

export const context: RuleContext = {
  tx: {
    sender: "0x0000000000000000000000000000000000000001",
    asset: "USDT",
    amount: "150000000",
    chainId: 1,
    receiver: "0x0000000000000000000000000000000000009999"
  },
  payId: {
    id: "pay.id/demo",
    owner: "0x0000000000000000000000000000000000001234"
  }
};
