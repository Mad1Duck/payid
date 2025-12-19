import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes, encodeAbiParameters } from "viem";

describe("PAY.ID Verifier (viem)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const walletClient = walletClients[0];

  const [owner, attacker] = await walletClient.getAddresses();

  function hashString(value: string) {
    return keccak256(toBytes(value));
  }

  async function signDecision({
    verifier,
    signer,
    decision
  }: {
    verifier: any;
    signer: `0x${string}`;
    decision: any;
  }) {
    const domain = {
      name: "PAY.ID Decision",
      version: "1",
      chainId: await publicClient.getChainId(),
      verifyingContract: verifier.address
    };

    const types = {
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
    };

    return walletClient.signTypedData({
      account: signer,
      domain,
      types,
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
      contextHash: keccak256(toBytes("context")),
      ruleSetHash: keccak256(toBytes("rules")),
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: keccak256(toBytes("nonce"))
    };
  }

  // --------------------------------------------------------------------------
  // ✅ VALID PROOF
  // --------------------------------------------------------------------------

  it("accepts valid decision proof", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
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

  // --------------------------------------------------------------------------
  // ❌ EXPIRED
  // --------------------------------------------------------------------------

  it("rejects expired decision proof", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
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

  // --------------------------------------------------------------------------
  // ❌ FUTURE ISSUED
  // --------------------------------------------------------------------------

  it("rejects decision issued in the future", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      ...baseDecision(now),
      issuedAt: now + 300n
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

  // --------------------------------------------------------------------------
  // ❌ WRONG SIGNER
  // --------------------------------------------------------------------------

  it("rejects decision signed by non-owner", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
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

  // --------------------------------------------------------------------------
  // ❌ TAMPERED PAYLOAD
  // --------------------------------------------------------------------------

  it("rejects tampered decision payload", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = baseDecision(now);

    const signature = await signDecision({
      verifier,
      signer: owner,
      decision
    });

    const tampered = {
      ...decision,
      decision: 0
    };

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [tampered, signature]
    });

    assert.equal(ok, false);
  });

  // --------------------------------------------------------------------------
  // ❌ INVALID DECISION VALUE
  // --------------------------------------------------------------------------

  it("rejects invalid decision value", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      ...baseDecision(now),
      decision: 2
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
});
