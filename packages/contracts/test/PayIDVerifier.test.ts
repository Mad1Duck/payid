import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes, zeroAddress } from "viem";

describe("PayIDVerifier", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClient = (await viem.getWalletClients())[0];
  const [payer, merchant] = await walletClient.getAddresses();

  function hash(v: string) {
    return keccak256(toBytes(v));
  }

  // EIP-712 Decision types — harus match DECISION_TYPEHASH di contract
  const DECISION_TYPES = {
    Decision: [
      { name: "version", type: "bytes32" },
      { name: "payId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "contextHash", type: "bytes32" },
      { name: "ruleSetHash", type: "bytes32" },
      { name: "ruleAuthority", type: "address" }, // ← wajib ada
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "nonce", type: "bytes32" },
      { name: "requiresAttestation", type: "bool" }, // ← wajib ada
    ]
  } as const;

  it("accepts valid decision — payer self-sign (legacy)", async () => {
    const oracle = await viem.deployContract("MockEthUsdOracle", [2000n * 10n ** 8n]);
    const ruleNFT = await viem.deployContract("RuleItemERC721", [merchant, oracle.address]);
    const storage = await viem.deployContract("CombinedRuleStorage");
    const verifier = await viem.deployContract("PayIDVerifier");

    // Initialize verifier
    await verifier.write.initialize([merchant]); // merchant = owner

    // Register ruleNFT as trusted authority (ruleAuthority)
    await verifier.write.setTrustedAuthority([storage.address, true], { account: merchant });

    const RULE_JSON = JSON.stringify({
      id: "min_amount",
      if: { field: "tx.amount", op: ">=", value: "1" }
    });
    const ruleHash = hash(RULE_JSON);

    await ruleNFT.write.createRule([ruleHash, "ipfs://rule.json"]);
    await ruleNFT.write.activateRule([1n]);

    const [, , , tokenId] = await ruleNFT.read.getRule([1n]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const price = await ruleNFT.read.subscriptionPriceETH();
    await ruleNFT.write.extendRuleExpiry([tokenId, now + 3600n], { value: price });

    const ruleSetHash = hash("ruleset-v1");
    await storage.write.registerCombinedRule([
      ruleSetHash,
      [ruleNFT.address],
      [tokenId],
      1n
    ]);

    // Payer self-sign (legacy mode)
    const decision = {
      version: hash("2"),
      payId: hash("pay.id/test"),
      payer,
      receiver: merchant,
      asset: merchant,
      amount: 100n,
      contextHash: hash("ctx"),
      ruleSetHash,
      ruleAuthority: storage.address, // ← field baru
      issuedAt: now - 10n,
      expiresAt: now + 60n,
      nonce: hash("nonce-1"),
      requiresAttestation: false,           // ← field baru
    };

    const sig = await walletClient.signTypedData({
      account: payer,
      domain: {
        name: "PAY.ID Decision",
        version: "2",
        chainId: await publicClient.getChainId(),
        verifyingContract: verifier.address,
      },
      types: DECISION_TYPES,
      primaryType: "Decision",
      message: decision,
    });

    // payer sign sendiri → recovered == payer → valid
    await verifier.write.requireAllowed([decision, sig]);
  });

  it("accepts valid decision — trusted authority sign (Channel A)", async () => {
    const oracle = await viem.deployContract("MockEthUsdOracle", [2000n * 10n ** 8n]);
    const ruleNFT = await viem.deployContract("RuleItemERC721", [merchant, oracle.address]);
    const storage = await viem.deployContract("CombinedRuleStorage");
    const verifier = await viem.deployContract("PayIDVerifier");

    await verifier.write.initialize([merchant]);
    await verifier.write.setTrustedAuthority([storage.address, true], { account: merchant });
    // merchant (receiver) juga di-whitelist sebagai trusted authority
    await verifier.write.setTrustedAuthority([merchant, true], { account: merchant });

    const ruleHash = hash(JSON.stringify({ id: "allow_all" }));
    await ruleNFT.write.createRule([ruleHash, "ipfs://rule.json"]);
    await ruleNFT.write.activateRule([1n]);

    const [, , , tokenId] = await ruleNFT.read.getRule([1n]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const price = await ruleNFT.read.subscriptionPriceETH();
    await ruleNFT.write.extendRuleExpiry([tokenId, now + 3600n], { value: price });

    const ruleSetHash = hash("ruleset-channel-a");
    await storage.write.registerCombinedRule([ruleSetHash, [ruleNFT.address], [tokenId], 1n]);

    const decision = {
      version: hash("2"),
      payId: hash("pay.id/channel-a"),
      payer,
      receiver: merchant,
      asset: merchant,
      amount: 150n,
      contextHash: hash("ctx-channel-a"),
      ruleSetHash,
      ruleAuthority: storage.address,
      issuedAt: now - 10n,
      expiresAt: now + 60n,
      nonce: hash("nonce-channel-a"),
      requiresAttestation: false,
    };

    // merchant (receiver) sign — bukan payer
    // Ini Channel A: trusted authority sign atas nama payer
    const sig = await walletClient.signTypedData({
      account: merchant, // ← receiver sign, bukan payer
      domain: {
        name: "PAY.ID Decision",
        version: "2",
        chainId: await publicClient.getChainId(),
        verifyingContract: verifier.address,
      },
      types: DECISION_TYPES,
      primaryType: "Decision",
      message: decision,
    });

    // merchant di-whitelist → trustedAuthorities[merchant] = true → valid
    await verifier.write.requireAllowed([decision, sig]);
  });

  it("rejects replayed nonce", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    await verifier.write.initialize([merchant]);

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: hash("2"),
      payId: hash("pay"),
      payer,
      receiver: merchant,
      asset: merchant,
      amount: 1n,
      contextHash: hash("ctx"),
      ruleSetHash: hash("ruleset"),
      ruleAuthority: zeroAddress, // no authority check
      issuedAt: now - 10n,
      expiresAt: now + 60n,
      nonce: hash("nonce-replay"),
      requiresAttestation: false,
    };

    const sig = await walletClient.signTypedData({
      account: payer,
      domain: {
        name: "PAY.ID Decision",
        version: "2",
        chainId: await publicClient.getChainId(),
        verifyingContract: verifier.address,
      },
      types: DECISION_TYPES,
      primaryType: "Decision",
      message: decision,
    });

    // First call — OK
    await verifier.write.requireAllowed([decision, sig]);

    // Second call — harus revert
    await assert.rejects(
      () => verifier.write.requireAllowed([decision, sig]),
      /NONCE_ALREADY_USED/
    );
  });

  it("rejects expired decision", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    await verifier.write.initialize([merchant]);

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: hash("2"),
      payId: hash("pay"),
      payer,
      receiver: merchant,
      asset: merchant,
      amount: 1n,
      contextHash: hash("ctx"),
      ruleSetHash: hash("ruleset"),
      ruleAuthority: zeroAddress,
      issuedAt: now - 120n,
      expiresAt: now - 60n, // ← sudah expired
      nonce: hash("nonce-expired"),
      requiresAttestation: false,
    };

    const sig = await walletClient.signTypedData({
      account: payer,
      domain: {
        name: "PAY.ID Decision",
        version: "2",
        chainId: await publicClient.getChainId(),
        verifyingContract: verifier.address,
      },
      types: DECISION_TYPES,
      primaryType: "Decision",
      message: decision,
    });

    const valid = await verifier.read.verifyDecision([decision, sig]);
    assert.equal(valid, false, "expired decision should be invalid");
  });
});
