import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { createPayID } from "payid";
import type { ContextV2, RuleConfig } from "payid-types";
import { envData } from "../config/config";

const { rpcUrl: RPC_URL, chainId: CHAIN_ID, contract: { ruleItemERC721: RULE_ITEM_ERC721, mockUSDC: USDC, payIdVerifier: PAYID_VERIFIER, payWithPayId: PAY_CONTRACT, combinedRuleStorage: COMBINED_RULE_STORAGE }, account: { senderPk: SENDER_PRIVATE_KEY, receiverPk: RECIVER_PRIVATE_KEY } } = envData;

// trusted issuers (PUBLIC addresses only)
const ENV_ISSUER = "0xENV_ISSUER";
const STATE_ISSUER = "0xSTATE_ISSUER";
const ORACLE_ISSUER = "0xORACLE_ISSUER";
const RISK_ISSUER = "0xRISK_ISSUER";

const wasm = new Uint8Array(
  fs.readFileSync(
    path.join(__dirname, "../rule_engine.wasm")
  )
);

// payer wallet (USER)
const PAYER_PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY!;

const ruleConfig: RuleConfig = {
  version: "1",
  logic: "AND",
  requires: ["state.spentToday", "oracle.country"],
  rules: [
    {
      id: "daily_limit",
      if: {
        field: "state.spentToday",
        op: "<=",
        value: "5000000",
      },
    },
    {
      id: "geo_check",
      if: {
        field: "oracle.country",
        op: "in",
        value: ["ID"],
      },
    },
  ],
};

const contextV2: ContextV2 = {
  tx: {
    sender: "0xPAYER",
    receiver: "0xRECEIVER",
    asset: "0xUSDC",
    amount: "1000000",
    chainId: CHAIN_ID,
  },
  payId: {
    id: "pay.id/lisk-demo",
    owner: "0xRECEIVER",
  },

  env: {
    timestamp: 1710000000,
    proof: {
      issuer: ENV_ISSUER,
      issuedAt: 1710000000,
      expiresAt: 1710000030,
      signature: "0xENV_SIG",
    },
  },

  state: {
    spentToday: "2500000",
    period: "DAY",
    proof: {
      issuer: STATE_ISSUER,
      issuedAt: 1710000000,
      expiresAt: 1710000060,
      signature: "0xSTATE_SIG",
    },
  },

  oracle: {
    country: "ID",
    fxRate: 15600,
    proof: {
      issuer: ORACLE_ISSUER,
      issuedAt: 1710000000,
      expiresAt: 1710000120,
      signature: "0xORACLE_SIG",
    },
  },
};

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PAYER_PRIVATE_KEY, provider);

  const payid = createPayID({
    wasm,
    trustedIssuers: new Set([
      ENV_ISSUER,
      STATE_ISSUER,
      ORACLE_ISSUER,
      RISK_ISSUER,
    ]),
  });

  const { result, proof } = await payid.evaluateAndProve({
    context: contextV2,
    authorityRule: ruleConfig,
    payId: "pay.id/lisk-demo",

    payer: contextV2.tx.sender!,
    receiver: contextV2.tx.receiver!,
    asset: contextV2.tx.asset,
    amount: BigInt(contextV2.tx.amount),

    signer: wallet,
    ruleRegistryContract: PAYID_VERIFIER,
    ruleAuthority: ethers.ZeroAddress,
    ttlSeconds: 60,
  });

  if (result.decision !== "ALLOW") {
    throw new Error("PAYMENT_REJECTED");
  }

  const payloadHashes: string[] = [];
  const atts: any[] = [];

  if (contextV2.env) {
    payloadHashes.push(hashContextPart(contextV2.env));
    atts.push(contextV2.env.proof);
  }
  if (contextV2.state) {
    payloadHashes.push(hashContextPart(contextV2.state));
    atts.push(contextV2.state.proof);
  }
  if (contextV2.oracle) {
    payloadHashes.push(hashContextPart(contextV2.oracle));
    atts.push(contextV2.oracle.proof);
  }
  if (contextV2.risk) {
    payloadHashes.push(hashContextPart(contextV2.risk));
    atts.push(contextV2.risk.proof);
  }

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    [
      "function payERC20((bytes32,bytes32,address,address,address,uint256,bytes32,bytes32,address,uint64,uint64,bytes32,bool),bytes,bytes32[],(address,uint64,uint64,bytes)[])",
    ],
    wallet
  );

  if (!proof) {
    throw (new Error("proof invalid"));
  }

  const tx = await (payContract as any).payERC20(
    proof?.payload!,
    proof?.signature!,
    payloadHashes,
    atts
  );

  console.log("TX SENT:", tx.hash);
  await tx.wait();
  console.log("PAYMENT CONFIRMED");
}

function hashContextPart(part: any): string {
  const { proof, ...data } = part;
  return ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(data))
  );
}

main().catch(console.error);
