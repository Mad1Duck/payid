import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("PAY.ID Verifier (viem)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const walletClient = walletClients[0];
  const owner = walletClient.account.address;


  const types = {
    Decision: [
      { name: "version", type: "string" },
      { name: "payId", type: "string" },
      { name: "owner", type: "address" },
      { name: "decision", type: "uint8" },
      { name: "contextHash", type: "bytes32" },
      { name: "ruleSetHash", type: "bytes32" },
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "nonce", type: "bytes32" }
    ]
  };

  async function signDecision({
    verifier,
    owner,
    decision
  }: any) {
    const domain = {
      name: "PAY.ID Decision",
      version: "1",
      chainId: await publicClient.getChainId(),
      verifyingContract: verifier.address
    };

    return walletClient.signTypedData({
      account: owner,
      domain,
      types,
      primaryType: "Decision",
      message: decision
    });
  }

  it("accepts valid decision proof", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const [owner] = await walletClient.getAddresses();

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: "payid.decision.v1",
      payId: "pay.id/demo",
      owner,
      decision: 1,
      contextHash: keccak256(toBytes("ctx")),
      ruleSetHash: keccak256(toBytes("rule")),
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: keccak256(toBytes("nonce"))
    };

    const signature = await signDecision({ verifier, owner, decision });

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [decision, signature]
    });

    assert.equal(ok, true);
  });

  // ✅ TEST 1 — EXPIRED PROOF
  it("rejects expired decision proof", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const [owner] = await walletClient.getAddresses();

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: "payid.decision.v1",
      payId: "pay.id/demo",
      owner,
      decision: 1,
      contextHash: keccak256(toBytes("ctx")),
      ruleSetHash: keccak256(toBytes("rule")),
      issuedAt: now - 120n,
      expiresAt: now - 60n,
      nonce: keccak256(toBytes("nonce"))
    };

    const signature = await signDecision({ verifier, owner, decision });

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [decision, signature]
    });

    assert.equal(ok, false);
  });

  // ✅ TEST 2 — SIGNER SALAH
  it("rejects decision signed by non-owner", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const [owner, attacker] = await walletClient.getAddresses();

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: "payid.decision.v1",
      payId: "pay.id/demo",
      owner, // owner declared
      decision: 1,
      contextHash: keccak256(toBytes("ctx")),
      ruleSetHash: keccak256(toBytes("rule")),
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: keccak256(toBytes("nonce"))
    };

    // ❌ ditandatangani attacker
    const signature = await signDecision({
      verifier,
      owner: attacker,
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

  // ✅ TEST 3 — PAYLOAD DIUBAH (TAMPER)
  it("rejects tampered decision payload", async () => {
    const verifier = await viem.deployContract("PayIDVerifier");
    const [owner] = await walletClient.getAddresses();

    const now = BigInt(Math.floor(Date.now() / 1000));

    const decision = {
      version: "payid.decision.v1",
      payId: "pay.id/demo",
      owner,
      decision: 1,
      contextHash: keccak256(toBytes("ctx")),
      ruleSetHash: keccak256(toBytes("rule")),
      issuedAt: now,
      expiresAt: now + 60n,
      nonce: keccak256(toBytes("nonce"))
    };

    const signature = await signDecision({ verifier, owner, decision });

    // ❌ payload diubah setelah sign
    const tamperedDecision = {
      ...decision,
      decision: 0
    };

    const ok = await publicClient.readContract({
      address: verifier.address,
      abi: verifier.abi,
      functionName: "verifyDecision",
      args: [tamperedDecision, signature]
    });

    assert.equal(ok, false);
  });
});
