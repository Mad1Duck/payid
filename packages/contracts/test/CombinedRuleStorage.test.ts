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

  it("registers and resolves active rule linked to RuleItemERC721", async () => {
    /* --------------------------------------------- */
    /* 1. Deploy mock oracle                          */
    /* --------------------------------------------- */
    const oracle = await viem.deployContract(
      "MockEthUsdOracle",
      [2000n * 10n ** 8n]
    );

    /* --------------------------------------------- */
    /* 2. Deploy RuleItemERC721                       */
    /* --------------------------------------------- */
    const ruleNFT = await viem.deployContract(
      "RuleItemERC721",
      [merchant, oracle.address]
    );

    /* --------------------------------------------- */
    /* 3. Deploy CombinedRuleStorage                 */
    /* --------------------------------------------- */
    const storage = await viem.deployContract(
      "CombinedRuleStorage"
    );

    /* --------------------------------------------- */
    /* 4. Create & activate rule item                */
    /* --------------------------------------------- */
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
      [1n], // first ruleId
      { account: merchantWallet.account }
    );

    const tokenId = await ruleNFT.read.ruleTokenId([1n]);

    /* --------------------------------------------- */
    /* 5. Register combined ruleSet                  */
    /* --------------------------------------------- */
    const ruleSetHash = hashString(
      "combined-rule-v1:min_amount"
    );

    await storage.write.registerRule(
      [
        ruleSetHash,
        ruleNFT.address,
        tokenId,
        1n
      ],
      { account: merchantWallet.account }
    );

    /* --------------------------------------------- */
    /* 6. Resolve ruleSet                            */
    /* --------------------------------------------- */
    const [
      owner,
      resolvedRuleNFT,
      resolvedTokenId
    ] = await storage.read.getRuleByHash([
      ruleSetHash
    ]);

    /* --------------------------------------------- */
    /* 7. Assertions                                 */
    /* --------------------------------------------- */
    assert.equal(
      owner.toLowerCase(),
      merchant.toLowerCase()
    );
    assert.equal(
      resolvedRuleNFT.toLowerCase(),
      ruleNFT.address.toLowerCase()
    ); assert.equal(resolvedTokenId, tokenId);
  });
});
