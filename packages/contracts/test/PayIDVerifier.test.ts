import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("PayIDVerifier", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClient = (await viem.getWalletClients())[0];
  const [payer, merchant] = await walletClient.getAddresses();

  function hash(v: string) {
    return keccak256(toBytes(v));
  }

  it("accepts valid decision", async () => {
    const storage = await viem.deployContract(
      "CombinedRuleStorage"
    );

    const address: `0x${string}` = storage.address;
    const verifier = await viem.deployContract(
      "PayIDVerifier",
      [address]
    );

    const ruleSetHash = hash("rules");

    await storage.write.registerRule([
      ruleSetHash,
      "0x0000000000000000000000000000000000000000",
      0n,
      1n
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: hash("1"),
      payId: hash("pay"),
      payer,
      receiver: merchant,
      asset: merchant,
      amount: 100n,
      contextHash: hash("ctx"),
      ruleSetHash,
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: hash("nonce-1")
    };

    const sig = await walletClient.signTypedData({
      account: payer,
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

    await verifier.write.requireAllowed([
      decision,
      sig
    ]);
  });

  it("rejects replayed nonce", async () => {
    // call requireAllowed twice → revert
  });
});
