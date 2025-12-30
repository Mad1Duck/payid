import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { createPayID } from "payid";
import { envData } from "../config/config";

import payAbi from "./abi.json";
import usdcAbi from "./usdc.abi.json";
import ruleAbi from "./rule.nft/RuleItemERC721.abi.json";
import combinedAbi from "./combiner.rule/CombinedRuleStorage.abi.json";
import { qrPayloadData } from "./qr";
import { decodeSessionPolicy } from "payid/sessionPolicy";
import { combineRules } from "payid/rule";
import testRule from "./rule.config.json";
const { rpcUrl: RPC_URL, contract: { mockUSDC: USDC, payIdVerifier: PAYID_VERIFIER, payWithPayId: PAY_CONTRACT, combinedRuleStorage: COMBINED_RULE_STORAGE }, account: { senderPk: SENDER_PRIVATE_KEY, } } = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(
  SENDER_PRIVATE_KEY,
  provider
);

console.log("Payer:", wallet.address);

const wasm = new Uint8Array(
  fs.readFileSync(
    path.join(__dirname, "../rule_engine.wasm")
  )
);

const payid = createPayID({ wasm, debugTrace: false });

const combined = new ethers.Contract(
  COMBINED_RULE_STORAGE,
  combinedAbi.abi,
  provider
);

async function loadRulesFromCombinedRule(
  combinedRule:
    | {
      ruleSetHash: string;
      owner: string;
      version: string;
      rules: {
        ruleNFT: string;
        tokenId: string;
      }[];
    }
    | null
) {
  if (!combinedRule) {
    throw new Error("No active combined rule");
  }

  if (!combinedRule.rules.length) {
    throw new Error("Combined rule has no rule references");
  }

  const rules = await Promise.all(
    combinedRule.rules.map(async (r) => {
      const ruleNFT = new ethers.Contract(
        r.ruleNFT,
        ruleAbi.abi,
        provider
      );

      const tokenURI: string = await (ruleNFT as any).tokenURI(
        BigInt(r.tokenId)
      );

      const metadataURL = tokenURI.startsWith("ipfs://")
        ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
        : tokenURI;

      console.log(
        `Fetching rule metadata [${r.ruleNFT} #${r.tokenId}]`,
        metadataURL
      );

      const res = await fetch(metadataURL);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch metadata for rule ${r.ruleNFT} #${r.tokenId}`
        );
      }

      const metadata: any = await res.json();

      if (!metadata.rule) {
        throw new Error(
          `NFT metadata missing rule for ${r.ruleNFT} #${r.tokenId}`
        );
      }

      return metadata.rule;
    })
  );

  return rules;
}

async function getActiveRuleOfOwner(owner: string) {
  const ruleSetHash = await (combined as any).activeRuleOf(owner);

  if (ruleSetHash === ethers.ZeroHash) {
    return null;
  }

  const [resolvedOwner, ruleRefs, version] =
    await (combined as any).getRuleByHash(ruleSetHash);

  return {
    ruleSetHash,
    owner: resolvedOwner,
    version: version.toString(),
    rules: ruleRefs.map((r: any) => ({
      ruleNFT: r.ruleNFT,
      tokenId: r.tokenId.toString()
    }))
  };
}

async function main() {

  const qrString = JSON.stringify(await qrPayloadData());

  const qrPayload = JSON.parse(qrString);

  const qrRules = decodeSessionPolicy(
    qrPayload,
    Math.floor(Date.now() / 1000)
  );

  const amount = 150_000_000n;
  const receiver =
    "0x73F98364f6B62a5683F2C14ae86a23D7288f6106";

  const intent = {
    sender: wallet.address,
    receiver,
    asset: "USDC",
    amount: amount.toString(),
    chainId: 4202,
  };

  const now = new Date();
  const hour = now.getHours();

  const spentThisMonth = 12_000_000n;
  const txAmount = BigInt(intent.amount);

  const context = {
    tx: intent,
    payId: {
      id: "pay.id/lisk-sepolia-demo",
      owner: receiver
    },
    env: {
      timestamp: hour
    },

    state: {
      spentTodayPlusTx: (amount + txAmount).toString(),
      spentThisMonthPlusTx: (spentThisMonth + txAmount).toString()
    }
  };

  const activeRule = await getActiveRuleOfOwner(receiver);

  const rules = await loadRulesFromCombinedRule(activeRule);

  const finalRule = combineRules(
    {
      version: activeRule?.version ?? "1",
      logic: "AND",
      rules: rules
    },
    qrRules.rules
  );

  // const canonicalRuleSet = canonicalize({
  //   version: activeRule?.version ?? "1",
  //   logic: "AND",
  //   rules
  // });

  // ruleSetHash
  const { result, proof } =
    await payid.evaluateAndProve({
      context,
      // evaluationRule: finalRule,
      authorityRule: {
        version: activeRule?.version ?? "1",
        logic: "AND",
        rules: testRule.rules
      },
      payId: "pay.id/lisk-sepolia-demo",
      payer: context.tx.sender,
      receiver: context.tx.receiver,
      asset: USDC,
      amount,
      signer: wallet,
      ttlSeconds: 60,
      verifyingContract: PAYID_VERIFIER,
      ruleRegistryContract: COMBINED_RULE_STORAGE,
    });



  console.log(JSON.stringify({ result }, proof));

  return;

  if (!proof) {
    console.log(result);
    throw new Error("PAY.ID rejected by rule");
  }

  console.log("PAY.ID consent signed");

  const usdc = new ethers.Contract(
    USDC,
    usdcAbi,
    wallet
  );

  // if forgot to subscribe
  // const ruleNFT = new ethers.Contract(
  //   RULE_ITEM_ERC721,
  //   ruleAbi.abi,
  //   walletReciver
  // );

  // const price: bigint = await (ruleNFT as any).subscriptionPriceETH();

  // const now = BigInt(Math.floor(Date.now() / 1000));

  // const txSubscribe = await (ruleNFT as any).extendRuleExpiry(
  //   1n,
  //   now + 30n * 24n * 60n * 60n,
  //   {
  //     value: price
  //   }
  // );

  // await txSubscribe.wait();

  const allowance = await (usdc as any).allowance(
    wallet.address,
    PAY_CONTRACT
  );

  if (allowance < amount) {
    console.log("Approving USDC...");
    const approveTx = await (usdc as any).approve(
      PAY_CONTRACT,
      amount
    );
    await approveTx.wait();
    console.log("USDC approved");
  }

  const payContract = new ethers.Contract(
    PAY_CONTRACT,
    payAbi.abi,
    wallet
  );

  console.log("⏳ Sending transaction...");

  const tx = await payContract
    .getFunction("payERC20")
    .send(
      proof.payload,
      proof.signature
    );

  console.log("TX hash:", tx.hash);
  await tx.wait();

  console.log("✅ USDC payment success", result);
}

main().catch(console.error);
