import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("RuleItemERC721", async () => {
  const { viem } = await network.connect();

  const walletClients = await viem.getWalletClients();
  const merchantWallet = walletClients[0];
  const [merchant] = await merchantWallet.getAddresses();

  function hashString(v: string) {
    return keccak256(toBytes(v));
  }

  it("merchant can create & activate rule item", async () => {

    const oracle = await viem.deployContract(
      "MockEthUsdOracle",
      [2000n * 10n ** 8n] // $2000
    );

    const ruleNFT = await viem.deployContract(
      "RuleItemERC721",
      [merchant, oracle.address]
    );

    const RULE_JSON = JSON.stringify({
      id: "min_amount",
      if: {
        field: "tx.amount",
        op: ">=",
        value: "100000000"
      }
    });

    const ruleHash = hashString(RULE_JSON);
    const ruleURI = "ipfs://rule/min_amount.json";

    await ruleNFT.write.createRule(
      [ruleHash, ruleURI],
      { account: merchantWallet.account }
    );

    await ruleNFT.write.activateRule(
      [1n], // ruleId pertama = 1
      { account: merchantWallet.account }
    );

    const [, , , tokenId] = await ruleNFT.read.getRule([1n]);

    const owner = await ruleNFT.read.ownerOf([tokenId]);

    assert.equal(owner, merchant);
  });
});
