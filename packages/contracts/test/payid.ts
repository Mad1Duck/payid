import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("PAY.ID Verifier (viem)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const walletClient = walletClients[0];

  const [owner, attacker] =
    await walletClient.getAddresses();

  function hashString(v: string) {
    return keccak256(toBytes(v));
  }

  async function signDecision({
    verifier,
    signer,
    decision
  }: any) {
    return walletClient.signTypedData({
      account: signer,
      domain: {
        name: "PAY.ID Decision",
        version: "1",
        chainId: await publicClient.getChainId(),
        verifyingContract: verifier.address
      },
      types: {
        Decision: [
          { name: "version", type: "bytes32" },
          { name: "payId", type: "bytes32" },
          { name: "owner", type: "address" },
          { name: "decision", type: "uint8" },
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

  function baseDecision(now: bigint) {
    return {
      version: hashString("1"),
      payId: hashString("pay.id/demo"),
      owner,
      decision: 1,
      contextHash: hashString("context"),
      ruleSetHash: hashString("rules"),
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: hashString("nonce")
    };
  }

  it("accepts valid decision proof", async () => {
    const verifier =
      await viem.deployContract("PayIDVerifier");

    const now = BigInt(Math.floor(Date.now() / 1000));
    const decision = baseDecision(now);

    const signature = await signDecision({
      verifier,
      signer: owner,
      decision
    });

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [decision, signature]
    });

    assert.equal(ok, true);
  });

  it("rejects expired proof", async () => {
    const verifier =
      await viem.deployContract("PayIDVerifier");

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      ...baseDecision(now),
      issuedAt: now - 120n,
      expiresAt: now - 60n
    };

    const signature = await signDecision({
      verifier,
      signer: owner,
      decision
    });

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [decision, signature]
    });

    assert.equal(ok, false);
  });

  it("rejects wrong signer", async () => {
    const verifier =
      await viem.deployContract("PayIDVerifier");

    const now = BigInt(Math.floor(Date.now() / 1000));
    const decision = baseDecision(now);

    const signature = await signDecision({
      verifier,
      signer: attacker,
      decision
    });

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [decision, signature]
    });

    assert.equal(ok, false);
  });
});
