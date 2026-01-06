import { PayID } from "payid";
import { ethers } from "ethers";
import { context } from "./context";
import ruleConfig from "./rule.config.json";
import { RuleConfig } from "payid-types";

async function run() {
  const provider = new ethers.BrowserProvider((window as any)?.ethereum);
  const signer = await provider.getSigner();

  const payid = new PayID("/rule_engine.wasm");

  const { result, proof } = await payid.evaluateAndProve({
    context,
    ruleConfig: ruleConfig as RuleConfig,

    payId: "pay.id/demo",
    owner: await signer.getAddress(),

    signer,

    chainId: 1,
    verifyingContract: "0x000000000000000000000000000000000000DEAD",
    ttlSeconds: 60
  });

  console.log(result, proof);
}

run();
