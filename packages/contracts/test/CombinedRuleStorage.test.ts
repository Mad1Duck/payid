import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("CombinedRuleStorage", async () => {
  const { viem } = await network.connect();

  const walletClients = await viem.getWalletClients();
  const merchantWallet = walletClients[0];
  const [merchant] = await merchantWallet.getAddresses();

  function hashString(v: string) {
    return keccak256(toBytes(v));
  }

  it("registers and resolves active combined rule (single rule)", async () => {
    const oracle = await viem.deployContract(
      "MockEthUsdOracle",
      [2000n * 10n ** 8n]
    );

    const ruleNFT = await viem.deployContract(
      "RuleItemERC721",
      [merchant, oracle.address]
    );

    const storage = await viem.deployContract(
      "CombinedRuleStorage"
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
      [1n],
      { account: merchantWallet.account }
    );

    const tokenId = await ruleNFT.read.ruleTokenId([1n]);

    const ruleSetHash = hashString(
      "combined-rule-v1:min_amount"
    );

    await storage.write.registerCombinedRule(
      [
        ruleSetHash,
        [ruleNFT.address],
        [tokenId],
        1n
      ],
      { account: merchantWallet.account }
    );

    const [owner, ruleRefs, version] =
      await storage.read.getRuleByHash([
        ruleSetHash
      ]);

    assert.equal(
      owner.toLowerCase(),
      merchant.toLowerCase()
    );

    assert.equal(ruleRefs.length, 1);
    assert.equal(
      ruleRefs[0].ruleNFT.toLowerCase(),
      ruleNFT.address.toLowerCase()
    );
    assert.equal(
      ruleRefs[0].tokenId,
      tokenId
    );

    assert.equal(version, 1n);
  });
});
