import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes, parseUnits } from "viem";

describe("PayWithPayID ERC20 E2E (FIXED)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  const payerWallet = walletClients[0];
  const merchantWallet = walletClients[1];

  const payer = payerWallet.account.address;
  const merchant = merchantWallet.account.address;

  function hashString(v: string) {
    return keccak256(toBytes(v));
  }

  async function signDecision({
    verifier,
    decision,
    signer
  }: any) {
    return signer.signTypedData({
      account: signer.account,
      domain: {
        name: "PAY.ID Decision",
        version: "2",
        chainId: await publicClient.getChainId(),
        verifyingContract: verifier.address
      },
      types: {
        Decision: [
          { name: "version", type: "bytes32" },
          { name: "payId", type: "bytes32" },
          { name: "payer", type: "address" },
          { name: "receiver", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "contextHash", type: "bytes32" },
          { name: "ruleSetHash", type: "bytes32" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "nonce", type: "bytes32" }
        ]
      },
      primaryType: "Decision",
      message: decision
    });
  }

  it("executes ERC20 payment when rule valid", async () => {
    /* -------------------------------------------------- */
    /* 1. Deploy contracts                                */
    /* -------------------------------------------------- */

    const usdc = await viem.deployContract(
      "MockUSDC"
    );

    const oracle = await viem.deployContract(
      "MockEthUsdOracle",
      [2000n * 10n ** 8n]
    );

    const ruleNFT = await viem.deployContract(
      "RuleItemERC721",
      [merchant, oracle.address]
    );

    const ruleStorage = await viem.deployContract(
      "CombinedRuleStorage"
    );

    const verifier = await viem.deployContract(
      "PayIDVerifier",
      [ruleStorage.address]
    );

    const pay = await viem.deployContract(
      "PayWithPayID",
      [verifier.address]
    );

    /* -------------------------------------------------- */
    /* 2. Merchant: create & ACTIVATE rule                */
    /* -------------------------------------------------- */

    const RULE_JSON = JSON.stringify({
      id: "min_amount",
      if: {
        field: "tx.amount",
        op: ">=",
        value: "100000000"
      }
    });

    const ruleHash = hashString(RULE_JSON);

    await ruleNFT.write.createRule(
      [ruleHash, "ipfs://rule.json"],
      { account: merchantWallet.account }
    );

    await ruleNFT.write.activateRule(
      [1n],
      { account: merchantWallet.account }
    );

    const merchantEthBefore = await publicClient.getBalance({
      address: merchant
    });

    const payerEthBefore = await publicClient.getBalance({
      address: payerWallet.account.address
    });

    // ambil tokenId yg BENAR
    const [, , , tokenId] = await ruleNFT.read.getRule([1n]);

    const now2 = BigInt(Math.floor(Date.now() / 1000));

    const price =
      await ruleNFT.read.subscriptionPriceETH();

    await ruleNFT.write.extendRuleExpiry(
      [tokenId, now2 + 30n * 24n * 60n * 60n],
      {
        account: merchantWallet.account,
        value: BigInt(price)
      }
    );
    /* -------------------------------------------------- */
    /* 3. Merchant: register combined ruleSet             */
    /* -------------------------------------------------- */

    const ruleSetHash = hashString(
      "combined-rule-v1:min_amount"
    );

    await ruleStorage.write.registerCombinedRule(
      [
        ruleSetHash,
        [ruleNFT.address],
        [tokenId],
        1n
      ],
      { account: merchantWallet.account }
    );

    /* -------------------------------------------------- */
    /* 4. Payer: mint & approve ERC20                     */
    /* -------------------------------------------------- */

    const amount = parseUnits("150", 6);

    await usdc.write.mint(
      [payer, amount],
      { account: payerWallet.account }
    );

    await usdc.write.approve(
      [pay.address, amount],
      { account: payerWallet.account }
    );

    const payerBalanceBefore =
      await usdc.read.balanceOf([payer]);

    const merchantBalanceBefore =
      await usdc.read.balanceOf([merchant]);

    /* -------------------------------------------------- */
    /* 5. Sign Decision                                   */
    /* -------------------------------------------------- */

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: hashString("1"),
      payId: hashString("pay-001"),
      payer,
      receiver: merchant,
      asset: usdc.address,
      amount,
      contextHash: hashString("ctx"),
      ruleSetHash,
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: hashString("nonce-001")
    };

    const sig = await signDecision({
      verifier,
      decision,
      signer: payerWallet
    });

    /* -------------------------------------------------- */
    /* 6. Execute payment                                 */
    /* -------------------------------------------------- */

    await pay.write.payERC20(
      [decision, sig],
      { account: payerWallet.account }
    );

    /* -------------------------------------------------- */
    /* 7. Assert balances                                 */
    /* -------------------------------------------------- */

    const payerBalanceAfter =
      await usdc.read.balanceOf([payer]);

    const merchantBalanceAfter =
      await usdc.read.balanceOf([merchant]);

    const payerEthAfter = await publicClient.getBalance({
      address: payerWallet.account.address
    });

    const merchantEthAfter = await publicClient.getBalance({
      address: merchantWallet.account.address
    });

    console.log("reciver : ", merchantBalanceBefore, merchantBalanceAfter, amount);
    console.log("reciver ETH : ", merchantEthBefore, merchantEthAfter);
    console.log("payer : ", payerBalanceAfter, payerBalanceBefore, amount);
    console.log("owner ETH : ", payerEthBefore, payerEthAfter);

    assert.ok(payerEthAfter > payerEthBefore);
    assert.ok(merchantEthBefore > merchantEthAfter);

    assert.equal(
      merchantBalanceAfter,
      merchantBalanceBefore + amount
    );

    assert.equal(
      payerBalanceAfter,
      payerBalanceBefore - amount
    );

  });
});
