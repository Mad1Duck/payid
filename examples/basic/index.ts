import { PayID } from "@payid/sdk-core";

const payid = new PayID("./rule_generic_evaluator.wasm");

const result = await payid.evaluate(
  {
    tx: {
      sender: "0x0001",
      asset: "USDT",
      amount: "150000000",
      chainId: 1
    }
  },
  {
    version: "1",
    logic: "AND",
    rules: [
      {
        id: "min_amount",
        if: {
          field: "tx.amount",
          op: ">=",
          value: "100000000"
        }
      }
    ]
  }
);

console.log(result);
// { decision: 'ALLOW', code: 'OK', reason: 'all rules passed' }
